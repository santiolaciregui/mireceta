import crypto from 'crypto';
import { MercadoPagoConfig, Preference, Payment, MerchantOrder } from 'mercadopago';
import { TenantRepository } from '../repositories/TenantRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { addAuditLogEntry } from '../utils/orderUtils.js';
import { generateOrderId } from '../utils/idGenerator.js';
import { notificationService } from './NotificationService.js';
import {
  buildMercadoPagoReconciliation,
  MercadoPagoPaymentLike,
  selectBestMercadoPagoPayment,
} from './mercadoPagoReconciliation.js';

function verifyWebhookSignature(
  xSignature: string | undefined,
  xRequestId: string | undefined,
  dataId: string | undefined,
  secretKey: string
): boolean {
  if (!xSignature || !secretKey || !dataId) return false;

  const parts = xSignature.split(',');
  let ts = '';
  let v1 = '';

  for (const part of parts) {
    const [key, val] = part.split('=');
    if (key && val) {
      const trimmedKey = key.trim();
      const trimmedVal = val.trim();
      if (trimmedKey === 'ts') ts = trimmedVal;
      else if (trimmedKey === 'v1') v1 = trimmedVal;
    }
  }

  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId || ''};ts:${ts};`;
  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(manifest)
    .digest('hex');

  return computedHash === v1;
}

export class PaymentService {
  private tenantRepo: TenantRepository;
  private orderRepo: OrderRepository;

  constructor() {
    this.tenantRepo = new TenantRepository();
    this.orderRepo = new OrderRepository();
  }

  private async fetchBestPaymentForOrder(
    order: any,
    accessToken: string,
    preferredPaymentId?: string
  ): Promise<MercadoPagoPaymentLike | null> {
    const client = new MercadoPagoConfig({ accessToken });
    const paymentApi = new Payment(client);
    const candidates: MercadoPagoPaymentLike[] = [];
    const numericPaymentId = String(preferredPaymentId || order.paymentId || '');

    if (/^\d+$/.test(numericPaymentId)) {
      try {
        const exactPayment: any = await paymentApi.get({ id: numericPaymentId });
        if (exactPayment) candidates.push(exactPayment);
      } catch (error: any) {
        console.warn(`[PaymentService] Exact payment lookup failed for order ${order.id}:`, error?.message || error);
      }
    }

    try {
      const searchResult: any = await paymentApi.search({
        options: { external_reference: order.id },
      });
      for (const payment of searchResult?.results || []) {
        candidates.push({
          ...payment,
          external_reference: payment.external_reference || payment.metadata?.order_id || order.id,
        });
      }
    } catch (error: any) {
      console.warn(`[PaymentService] Payment search failed for order ${order.id}:`, error?.message || error);
    }

    let selected = selectBestMercadoPagoPayment(
      candidates,
      order.id,
      Number(order.paymentAmount) || 0
    );
    if (selected) return selected;

    try {
      const merchantOrderSearch: any = await new MerchantOrder(client).search({
        options: { external_reference: order.id },
      });
      const merchantOrders = merchantOrderSearch?.elements || merchantOrderSearch?.results || [];
      const merchantPayments = merchantOrders.flatMap((merchantOrder: any) =>
        (merchantOrder?.payments || []).map((payment: any) => ({
          ...payment,
          external_reference: payment.external_reference || merchantOrder.external_reference || order.id,
        }))
      );
      selected = selectBestMercadoPagoPayment(
        merchantPayments,
        order.id,
        Number(order.paymentAmount) || 0
      );
    } catch (error: any) {
      console.warn(`[PaymentService] Merchant order search failed for order ${order.id}:`, error?.message || error);
    }

    return selected;
  }

  private async applyProviderPayment(order: any, payment: MercadoPagoPaymentLike, source: string) {
    const decision = buildMercadoPagoReconciliation(order, payment);

    if (decision.reason === 'unmatched') {
      console.warn(`[PaymentService] Ignored unmatched Mercado Pago payment ${payment.id || 'unknown'} for order ${order.id}.`);
      return { updated: false, decision };
    }

    if (!decision.shouldPersist) {
      return { updated: false, decision };
    }

    order.paymentStatus = decision.paymentStatus;
    order.paymentId = decision.paymentId;
    order.paymentDate = decision.paymentDate;
    order.status = decision.orderStatus;

    const actionByReason: Record<string, string> = {
      approved: 'Pago acreditado (Mercado Pago)',
      underpaid: 'Alerta: Pago insuficiente detectado',
      rejected: 'Pago rechazado (Mercado Pago)',
      pending: 'Pago pendiente (Mercado Pago)',
      refunded: 'Pago reintegrado (Mercado Pago)',
    };
    addAuditLogEntry(
      order,
      actionByReason[decision.reason] || 'Actualización de pago Mercado Pago',
      `Sistema (${source})`,
      `Pago oficial #${decision.paymentId || 'sin ID'}, estado "${decision.providerStatus}", monto $${decision.paidAmount}. Estado de pago local: "${decision.paymentStatus}".`
    );

    await this.orderRepo.update(order.id, order);
    await this.refreshPendingOrderLimitAlert(order.tenantId || 'TEN-0001');
    return { updated: true, decision };
  }

  private async refreshPendingOrderLimitAlert(tenantId: string): Promise<void> {
    try {
      await notificationService.evaluatePendingOrderLimitAlert(tenantId);
    } catch (error) {
      console.error('[PaymentService] Pending order limit evaluation failed:', error);
    }
  }

  async refundApprovedCheckoutPayment(order: any): Promise<{
    refunded: boolean;
    refundId?: string;
    reason?: string;
  }> {
    if (order.paymentStatus !== 'approved') {
      return { refunded: false, reason: 'La solicitud no tiene un pago aprobado para reintegrar.' };
    }

    if (order.paymentMethod !== 'mp') {
      return { refunded: false, reason: 'El pago no fue realizado mediante Mercado Pago Checkout.' };
    }

    const paymentId = String(order.paymentId || '');
    if (!/^\d+$/.test(paymentId)) {
      return { refunded: false, reason: 'La solicitud no tiene un identificador oficial de pago de Mercado Pago.' };
    }

    const tenant = order.tenantId ? await this.tenantRepo.findById(order.tenantId) : null;
    const accessToken = tenant?.mpAccessToken || process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      return { refunded: false, reason: 'Mercado Pago no está configurado para realizar el reintegro.' };
    }

    try {
      const client = new MercadoPagoConfig({ accessToken });
      const paymentApi = new Payment(client);
      const paymentInfo: any = await paymentApi.get({ id: paymentId });
      const expectedAmount = Number(order.paymentAmount) || 0;

      if (paymentInfo?.status !== 'approved') {
        return { refunded: false, reason: 'Mercado Pago no confirma un pago aprobado para esta solicitud.' };
      }
      if (String(paymentInfo?.external_reference || '') !== String(order.id)) {
        return { refunded: false, reason: 'El pago de Mercado Pago no pertenece a esta solicitud.' };
      }
      if (expectedAmount > 0 && Number(paymentInfo?.transaction_amount) < expectedAmount) {
        return { refunded: false, reason: 'El importe acreditado es menor al arancel registrado.' };
      }

      const idempotencyKey = crypto
        .createHash('sha256')
        .update(`refund:${order.id}:${paymentId}`)
        .digest('hex');
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Idempotency-Key': idempotencyKey,
        },
      });
      const payload: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error(`[PaymentService] Mercado Pago refund failed for order ${order.id}:`, payload);
        return { refunded: false, reason: payload?.message || 'Mercado Pago no pudo procesar el reintegro.' };
      }

      return { refunded: true, refundId: String(payload?.id || '') || undefined };
    } catch (error: any) {
      console.error(`[PaymentService] Mercado Pago refund failed for order ${order.id}:`, error?.message || error);
      return { refunded: false, reason: 'No se pudo verificar o reintegrar el pago con Mercado Pago.' };
    }
  }

  async createPreference(tenantId: string, orderData: any) {
    const orderId = orderData.orderId;
    if (!orderId) {
      throw new Error('El ID de solicitud (orderId) es obligatorio para iniciar el cobro con Mercado Pago.');
    }

    const order: any = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error(`Solicitud con ID ${orderId} no encontrada.`);
    }

    if (order.paymentStatus === 'approved') {
      throw new Error('Esta solicitud ya se encuentra abonada y aprobada.');
    }

    if (order.paymentStatus === 'exempt' || String(order.paymentAmount) === '0') {
      throw new Error('Esta solicitud cuenta con arancel bonificado / exento y no requiere pago.');
    }

    const targetTenantId = order.tenantId || tenantId;
    const tenant = await this.tenantRepo.findById(targetTenantId);
    const accessToken = tenant?.mpAccessToken || process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('Mercado Pago no está configurado para este centro médico. Contacte al administrador.');
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    // Arancel oficial obtenido exclusivamente de la orden persistida en el servidor
    const amount = Number(order.paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('El arancel de la solicitud no es válido para procesar en Mercado Pago.');
    }

    const origin = orderData.origin || process.env.APP_URL || 'http://localhost:3000';

    const notificationUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/payments/webhook`
      : `${origin}/api/payments/webhook`;

    const itemCount = (order.medicationItems?.length || 0) + (order.medicationPhotos?.length || 0);
    const rxCount = Math.max(1, Math.ceil(itemCount / 2));
    const patientFullName = `${order.patientName || ''} ${order.patientLastName || ''}`.trim() || 'Paciente';

    const preferenceBody: any = {
      items: [
        {
          id: orderId,
          title: `Renovación de Receta Médica (${rxCount} receta${rxCount > 1 ? 's' : ''}) - ${patientFullName}`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        name: patientFullName,
        email: order.patientEmail || orderData.patientEmail || 'paciente@ejemplo.com',
      },
      back_urls: {
        success: `${origin}?payment=approved&orderId=${orderId}`,
        failure: `${origin}?payment=rejected&orderId=${orderId}`,
        pending: `${origin}?payment=pending&orderId=${orderId}`,
      },
      auto_return: 'approved',
      external_reference: orderId,
      notification_url: notificationUrl,
      statement_descriptor: 'MI RECETA',
      metadata: {
        order_id: orderId,
        tenant_id: targetTenantId,
        patient_dni: order.patientDni || '',
        expected_amount: amount,
      },
    };

    const result = await preference.create({ body: preferenceBody });

    const isTestToken = accessToken.startsWith('TEST-');
    const redirectUrl = isTestToken
      ? (result.sandbox_init_point || result.init_point)
      : (result.init_point || result.sandbox_init_point);

    return {
      orderId,
      initPoint: redirectUrl,
      sandboxInitPoint: result.sandbox_init_point,
      preferenceId: result.id,
      publicKey: tenant?.mpPublicKey || process.env.MP_PUBLIC_KEY || '',
      isTestMode: isTestToken,
      amount,
    };
  }

  async processWebhook(query: any, body: any, headers: any = {}) {
    const rawId = query.id || query['data.id'] || body?.data?.id || body?.id;
    const rawTopic = query.topic || query.type || body?.type || body?.action;
    const xSignature = headers['x-signature'] || headers['X-Signature'];
    const xRequestId = headers['x-request-id'] || headers['X-Request-Id'];

    console.log(`[MercadoPago Webhook] Notification received. Topic: ${rawTopic}, ID: ${rawId}`);

    if (!rawId) {
      return { received: true, note: 'No payment ID provided' };
    }

    const webhookSecret = process.env.MP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = verifyWebhookSignature(xSignature, xRequestId, String(rawId), webhookSecret);
      if (!isValid) {
        console.warn(`[MercadoPago Webhook Security] Missing or invalid signature for ID: ${rawId}`);
        return { received: false, error: 'Firma de webhook inválida' };
      }
      console.log(`[MercadoPago Webhook Security] Valid x-signature for ID: ${rawId}`);
    }

    let accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      const tenants = await this.tenantRepo.findAll();
      accessToken = tenants.find(t => t.mpAccessToken)?.mpAccessToken;
    }

    if (!accessToken) {
      console.warn('[MercadoPago Webhook] Warning: No MP_ACCESS_TOKEN configured in environment or database.');
      return { received: true, note: 'Webhook received but MP_ACCESS_TOKEN not configured' };
    }

    try {
      const client = new MercadoPagoConfig({ accessToken });
      const paymentApi = new Payment(client);
      const merchantOrderApi = new MerchantOrder(client);

      let orderId: string | undefined;
      let paymentId: string | number | undefined;
      let status: string | undefined;
      let paidAmount = 0;
      let resolvedPayment: MercadoPagoPaymentLike | null = null;

      const isMerchantOrderTopic = rawTopic === 'merchant_order' || rawTopic === 'merchant_orders';

      if (isMerchantOrderTopic) {
        const merchantOrder: any = await merchantOrderApi.get({ merchantOrderId: String(rawId) });
        if (!merchantOrder) {
          console.warn(`[MercadoPago Webhook] Merchant order not found for ID: ${rawId}`);
          return { received: true };
        }
        orderId = merchantOrder.external_reference;
        const bestPayment = selectBestMercadoPagoPayment(
          (merchantOrder.payments || []).map((payment: any) => ({
            ...payment,
            external_reference: payment.external_reference || merchantOrder.external_reference,
          })),
          String(orderId || ''),
          Number(merchantOrder.total_amount) || 0
        );
        if (bestPayment) {
          resolvedPayment = bestPayment;
          paymentId = bestPayment.id;
          status = bestPayment.status;
          paidAmount = Number(bestPayment.transaction_amount || bestPayment.total_paid_amount) || 0;
        } else if (merchantOrder.order_status === 'paid') {
          status = 'approved';
          paidAmount = Number(merchantOrder.paid_amount) || 0;
        }
      } else {
        let paymentInfo: any = null;
        try {
          paymentInfo = await paymentApi.get({ id: String(rawId) });
        } catch (err: any) {
          // Fallback: check if notification ID was actually a merchant_order (e.g. from IPN)
          try {
            const merchantOrder: any = await merchantOrderApi.get({ merchantOrderId: String(rawId) });
            if (merchantOrder) {
              orderId = merchantOrder.external_reference;
              const bestPayment = selectBestMercadoPagoPayment(
                (merchantOrder.payments || []).map((payment: any) => ({
                  ...payment,
                  external_reference: payment.external_reference || merchantOrder.external_reference,
                })),
                String(orderId || ''),
                Number(merchantOrder.total_amount) || 0
              );
              if (bestPayment) {
                resolvedPayment = bestPayment;
                paymentId = bestPayment.id;
                status = bestPayment.status;
                paidAmount = Number(bestPayment.transaction_amount || bestPayment.total_paid_amount) || 0;
              } else if (merchantOrder.order_status === 'paid') {
                status = 'approved';
                paidAmount = Number(merchantOrder.paid_amount) || 0;
              }
            }
          } catch {
            throw err;
          }
        }

        if (paymentInfo) {
          resolvedPayment = paymentInfo;
          paymentId = paymentInfo.id;
          orderId = paymentInfo.external_reference || (paymentInfo as any).metadata?.order_id;
          status = paymentInfo.status;
          paidAmount = Number(paymentInfo.transaction_amount) || 0;
        }
      }

      if (!paymentId && !status) {
        console.warn(`[MercadoPago Webhook] No payment details resolved for ID: ${rawId}`);
        return { received: true };
      }

      console.log(`[MercadoPago Webhook] Payment ${paymentId} for Order ${orderId} status: ${status}, amount: $${paidAmount}`);

      if (orderId) {
        const order: any = await this.orderRepo.findById(orderId);
        if (order) {
          const reconciliation = await this.applyProviderPayment(order, {
            ...(resolvedPayment || {}),
            id: paymentId,
            status,
            transaction_amount: paidAmount,
            external_reference: orderId,
          }, 'Mercado Pago Webhook');
          console.log(`[MercadoPago Webhook] Order ${orderId} reconciled: updated=${reconciliation.updated}, paymentStatus=${reconciliation.decision.paymentStatus}`);
        } else {
          console.warn(`[MercadoPago Webhook] Order ${orderId} was not found for payment ${paymentId}.`);
        }
      } else {
        console.warn(`[MercadoPago Webhook] Payment ${paymentId} did not include an order reference.`);
      }

      return { received: true, paymentId, status, orderId };
    } catch (err: any) {
      console.error(`[MercadoPago Webhook Error]:`, err.message || err);
      return { received: true, error: err.message };
    }
  }

  async getPaymentStatus(orderId: string) {
    const order: any = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error(`Receta con ID ${orderId} no encontrada`);
    }

    const tenant = order.tenantId ? await this.tenantRepo.findById(order.tenantId) : null;
    const accessToken = tenant?.mpAccessToken || process.env.MP_ACCESS_TOKEN;
    const looksLikeMercadoPago =
      order.paymentMethod === 'mp' ||
      String(order.paymentId || '').startsWith('MP-') ||
      /^\d+$/.test(String(order.paymentId || ''));
    const canReconcile = looksLikeMercadoPago && ['pending', 'rejected'].includes(order.paymentStatus);
    if (canReconcile && accessToken) {
      try {
        const fetchedPayment = await this.fetchBestPaymentForOrder(order, accessToken);
        if (fetchedPayment) {
          await this.applyProviderPayment(order, fetchedPayment, 'Consulta Sync API');
        }
      } catch (err: any) {
        console.warn(`[MercadoPago Sync Warning]:`, err.message || err);
      }
    }

    return {
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentAmount: order.paymentAmount,
      paymentId: order.paymentId,
      patientName: `${order.patientName} ${order.patientLastName}`,
      createdAt: order.createdAt,
    };
  }

  async syncReturn(orderId: string, returnData: any = {}) {
    const order: any = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new Error(`Receta con ID ${orderId} no encontrada`);
    }

    const paymentId = returnData.payment_id || returnData.collection_id || returnData.id || order.paymentId;
    const tenant = order.tenantId ? await this.tenantRepo.findById(order.tenantId) : null;
    const accessToken = tenant?.mpAccessToken || process.env.MP_ACCESS_TOKEN;
    let verifiedWithApi = false;

    if (accessToken) {
      try {
        const paymentInfo = await this.fetchBestPaymentForOrder(order, accessToken, paymentId ? String(paymentId) : undefined);
        if (paymentInfo) {
          verifiedWithApi = true;
          await this.applyProviderPayment(order, paymentInfo, 'Retorno de Checkout');
        }
      } catch (apiErr: any) {
        console.warn('[PaymentService syncReturn API check warning]:', apiErr.message || apiErr);
      }
    }

    if (!verifiedWithApi) {
      console.warn(`[PaymentService] Checkout return for order ${orderId} could not be verified with Mercado Pago.`);
    }

    return {
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentAmount: order.paymentAmount,
      paymentId: order.paymentId,
      patientName: `${order.patientName} ${order.patientLastName}`,
      createdAt: order.createdAt,
      verifiedWithApi,
      verificationPending: !verifiedWithApi,
      order,
    };
  }

  async reconcilePendingPayments(limit = 100) {
    const orders: any[] = await this.orderRepo.findPendingMercadoPago(limit);
    const summary = { checked: orders.length, updated: 0, unresolved: 0, failed: 0 };

    for (const order of orders) {
      try {
        const tenant = order.tenantId ? await this.tenantRepo.findById(order.tenantId) : null;
        const accessToken = tenant?.mpAccessToken || process.env.MP_ACCESS_TOKEN;
        if (!accessToken) {
          summary.unresolved += 1;
          console.warn(`[PaymentService Reconciliation] No Mercado Pago token for order ${order.id}.`);
          continue;
        }

        const payment = await this.fetchBestPaymentForOrder(order, accessToken);
        if (!payment) {
          summary.unresolved += 1;
          continue;
        }

        const result = await this.applyProviderPayment(order, payment, 'Conciliación Programada');
        if (result.updated) summary.updated += 1;
      } catch (error: any) {
        summary.failed += 1;
        console.error(`[PaymentService Reconciliation] Failed for order ${order.id}:`, error?.message || error);
      }
    }

    return summary;
  }
}
