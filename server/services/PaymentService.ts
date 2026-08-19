import crypto from 'crypto';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { TenantRepository } from '../repositories/TenantRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { addAuditLogEntry } from '../utils/orderUtils.js';
import { generateOrderId } from '../utils/idGenerator.js';

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
    const paymentId = query.id || query['data.id'] || body?.data?.id || body?.id;
    const topic = query.topic || query.type || body?.type || body?.action;
    const xSignature = headers['x-signature'] || headers['X-Signature'];
    const xRequestId = headers['x-request-id'] || headers['X-Request-Id'];

    console.log(`[MercadoPago Webhook] Notification received. Topic: ${topic}, Payment ID: ${paymentId}`);

    if (!paymentId) {
      return { received: true, note: 'No payment ID provided' };
    }

    const webhookSecret = process.env.MP_WEBHOOK_SECRET || process.env.MP_SECRET_KEY;
    if (webhookSecret && xSignature) {
      const isValid = verifyWebhookSignature(xSignature, xRequestId, String(paymentId), webhookSecret);
      if (!isValid) {
        console.warn(`[MercadoPago Webhook Security] Invalid signature for Payment ID: ${paymentId}`);
        return { received: false, error: 'Firma de webhook inválida' };
      }
      console.log(`[MercadoPago Webhook Security] Valid x-signature for Payment ID: ${paymentId}`);
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
      const paymentInfo = await paymentApi.get({ id: paymentId });

      if (!paymentInfo) {
        console.warn(`[MercadoPago Webhook] Could not fetch payment info for ID: ${paymentId}`);
        return { received: true };
      }

      const orderId = paymentInfo.external_reference || (paymentInfo as any).metadata?.order_id;
      const status = paymentInfo.status;
      const paidAmount = Number(paymentInfo.transaction_amount) || 0;

      console.log(`[MercadoPago Webhook] Payment ${paymentId} for Order ${orderId} status: ${status}, amount: $${paidAmount}`);

      if (orderId) {
        const order: any = await this.orderRepo.findById(orderId);
        if (order) {
          const expectedAmount = Number(order.paymentAmount) || 0;
          let updatedPaymentStatus: 'approved' | 'pending' | 'rejected' | 'refunded' = 'pending';
          let recipeStatus = order.status;

          if (status === 'approved') {
            // Amount integrity check: avoid approving underpaid orders
            if (expectedAmount > 0 && paidAmount < expectedAmount) {
              console.warn(`[MercadoPago Webhook Security Alert] Underpayment for Order ${orderId}: Expected $${expectedAmount}, Paid $${paidAmount}`);
              order.paymentStatus = 'rejected';
              order.paymentId = String(paymentId);
              order.paymentDate = new Date().toISOString();
              addAuditLogEntry(
                order,
                'Alerta: Pago insuficiente detectado',
                'Sistema (Seguridad Mercado Pago)',
                `Se acreditó un importe de $${paidAmount}, inferior al arancel oficial de $${expectedAmount}. Operación #${paymentId} retenida.`
              );
              await this.orderRepo.update(orderId, order);
              return { received: true, error: 'Monto insuficiente abonado' };
            }

            updatedPaymentStatus = 'approved';
            if (recipeStatus === 'Pendiente de Pago' || recipeStatus === 'Pendiente') {
              recipeStatus = 'Pendiente';
            }
          } else if (status === 'rejected' || status === 'cancelled') {
            updatedPaymentStatus = 'rejected';
            recipeStatus = 'Rechazada';
          } else if (status === 'refunded' || status === 'charged_back') {
            updatedPaymentStatus = 'refunded';
            recipeStatus = 'Rechazada';
          }

          order.paymentStatus = updatedPaymentStatus;
          order.status = recipeStatus;
          order.paymentId = String(paymentId);
          order.paymentDate = new Date().toISOString();

          addAuditLogEntry(
            order,
            `Mercado Pago Webhook: ${status}`,
            'Sistema (Mercado Pago API)',
            `Notificación oficial Mercado Pago ID ${paymentId}: Estado de pago "${status}", Monto $${paidAmount}. Receta configurada en "${recipeStatus}".`
          );

          await this.orderRepo.update(orderId, order);
          console.log(`[MercadoPago Webhook] Order ${orderId} updated: paymentStatus=${updatedPaymentStatus}, status=${recipeStatus}`);
        }
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
    if (order.paymentStatus === 'pending' && accessToken) {
      try {
        const client = new MercadoPagoConfig({ accessToken });
        const paymentApi = new Payment(client);

        let fetchedPayment: any = null;
        if (order.paymentId && !order.paymentId.startsWith('REC-')) {
          fetchedPayment = await paymentApi.get({ id: order.paymentId });
        } else {
          const searchResult = await paymentApi.search({
            options: {
              external_reference: orderId,
            }
          });
          if (searchResult.results && searchResult.results.length > 0) {
            fetchedPayment = searchResult.results[0];
          }
        }

        if (fetchedPayment) {
          const status = fetchedPayment.status;
          const paidAmount = Number(fetchedPayment.transaction_amount) || 0;
          const expectedAmount = Number(order.paymentAmount) || 0;

          let updatedPaymentStatus: 'approved' | 'pending' | 'rejected' | 'refunded' = 'pending';
          let recipeStatus = order.status;

          if (status === 'approved') {
            if (expectedAmount > 0 && paidAmount < expectedAmount) {
              console.warn(`[MercadoPago Sync Security Alert] Underpayment for Order ${orderId}: Expected $${expectedAmount}, Paid $${paidAmount}`);
              updatedPaymentStatus = 'rejected';
              recipeStatus = 'Rechazada';
            } else {
              updatedPaymentStatus = 'approved';
              recipeStatus = 'Pendiente';
            }
          } else if (status === 'rejected' || status === 'cancelled') {
            updatedPaymentStatus = 'rejected';
            recipeStatus = 'Rechazada';
          } else if (status === 'refunded' || status === 'charged_back') {
            updatedPaymentStatus = 'refunded';
            recipeStatus = 'Rechazada';
          }

          if (updatedPaymentStatus !== order.paymentStatus) {
            order.paymentStatus = updatedPaymentStatus;
            order.status = recipeStatus;
            order.paymentId = String(fetchedPayment.id);
            order.paymentDate = new Date().toISOString();

            addAuditLogEntry(
              order,
              `Sync Pago Mercado Pago: ${status}`,
              'Sistema (Consulta Sync API)',
              `Sincronización activa: Pago ID ${fetchedPayment.id}, estado "${status}", monto $${paidAmount}.`
            );

            await this.orderRepo.update(orderId, order);
          }
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

    const paymentParam = returnData.payment || returnData.collection_status || returnData.status;
    const paymentId = returnData.payment_id || returnData.collection_id || returnData.id || order.paymentId;
    const isApproved = paymentParam === 'approved';
    const isRejected = paymentParam === 'rejected' || paymentParam === 'cancelled';

    // 1. Try to verify officially with Mercado Pago API if access token is available
    const tenant = order.tenantId ? await this.tenantRepo.findById(order.tenantId) : null;
    const accessToken = tenant?.mpAccessToken || process.env.MP_ACCESS_TOKEN;

    let verifiedWithApi = false;

    if (accessToken && paymentId && !String(paymentId).startsWith('REC-')) {
      try {
        const client = new MercadoPagoConfig({ accessToken });
        const paymentApi = new Payment(client);
        let paymentInfo: any = null;

        try {
          paymentInfo = await paymentApi.get({ id: String(paymentId) });
        } catch {
          // If paymentId not found directly, search by external_reference
          const searchRes = await paymentApi.search({
            options: { external_reference: orderId }
          });
          if (searchRes.results && searchRes.results.length > 0) {
            paymentInfo = searchRes.results[0];
          }
        }

        if (paymentInfo) {
          verifiedWithApi = true;
          const status = paymentInfo.status;
          const paidAmount = Number(paymentInfo.transaction_amount) || 0;
          const expectedAmount = Number(order.paymentAmount) || 0;

          if (status === 'approved') {
            if (expectedAmount > 0 && paidAmount < expectedAmount) {
              console.warn(`[MercadoPago syncReturn Security Alert] Underpayment for Order ${orderId}: Expected $${expectedAmount}, Paid $${paidAmount}`);
              order.paymentStatus = 'rejected';
              order.status = 'Rechazada';
              order.paymentId = String(paymentInfo.id);
              order.paymentDate = new Date().toISOString();
              addAuditLogEntry(
                order,
                'Alerta: Pago insuficiente en retorno',
                'Sistema (Seguridad Mercado Pago)',
                `Se intentó validar pago #${paymentInfo.id} por $${paidAmount}, menor a los $${expectedAmount} exigidos.`
              );
            } else {
              order.paymentStatus = 'approved';
              order.paymentId = String(paymentInfo.id);
              order.paymentDate = new Date().toISOString();
              if (order.status === 'Pendiente de Pago' || order.status === 'Pendiente') {
                order.status = 'Pendiente';
              }
              addAuditLogEntry(
                order,
                'Pago acreditado (Mercado Pago API)',
                'Sistema (Mercado Pago)',
                `Verificación en tiempo real: Se acreditó el pago de $${paidAmount} con código de operación oficial #${paymentInfo.id}.`
              );
            }
          } else if (status === 'rejected' || status === 'cancelled') {
            order.paymentStatus = 'rejected';
            order.status = 'Rechazada';
            addAuditLogEntry(
              order,
              'Pago rechazado (Mercado Pago API)',
              'Sistema (Mercado Pago)',
              `Pago ID #${paymentInfo.id} rechazado por la pasarela de pagos.`
            );
          }
        }
      } catch (apiErr: any) {
        console.warn('[PaymentService syncReturn API check warning]:', apiErr.message || apiErr);
      }
    }

    // 2. If API was not able to verify (e.g. sandbox token delay or missing token) but return params state approved
    if (!verifiedWithApi && isApproved && order.paymentStatus !== 'approved') {
      order.paymentStatus = 'approved';
      if (paymentId) {
        order.paymentId = String(paymentId);
      }
      order.paymentDate = new Date().toISOString();
      if (order.status === 'Pendiente de Pago' || order.status === 'Pendiente') {
        order.status = 'Pendiente';
      }
      addAuditLogEntry(
        order,
        'Pago confirmado al retornar de Mercado Pago',
        'Sistema (Retorno de Checkout)',
        `El usuario completó el checkout exitosamente con ID de transacción ${order.paymentId || paymentId}.`
      );
    } else if (!verifiedWithApi && isRejected && order.paymentStatus !== 'rejected') {
      order.paymentStatus = 'rejected';
      addAuditLogEntry(
        order,
        'Pago declinado en pasarela',
        'Sistema (Retorno de Checkout)',
        `El pago fue rechazado al retornar de la pasarela.`
      );
    }

    await this.orderRepo.update(orderId, order);

    return {
      orderId: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentAmount: order.paymentAmount,
      paymentId: order.paymentId,
      patientName: `${order.patientName} ${order.patientLastName}`,
      createdAt: order.createdAt,
      order,
    };
  }
}
