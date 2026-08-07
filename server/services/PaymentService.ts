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
    const tenant = await this.tenantRepo.findById(tenantId);
    const accessToken = tenant?.mpAccessToken || process.env.MP_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error('Mercado Pago no está configurado para este centro médico. Contacte al administrador.');
    }

    const client = new MercadoPagoConfig({ accessToken });
    const preference = new Preference(client);

    const amount = Number(orderData.amount) || 10000;
    const origin = orderData.origin || process.env.APP_URL || 'http://localhost:3000';
    const orderId = orderData.orderId || generateOrderId();

    const notificationUrl = process.env.WEBHOOK_URL
      ? `${process.env.WEBHOOK_URL}/api/payments/webhook`
      : `${origin}/api/payments/webhook`;

    const preferenceBody: any = {
      items: [
        {
          id: orderId,
          title: `Renovación de Receta Médica - ${orderData.patientName || 'Paciente'}`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        name: orderData.patientName || 'Paciente',
        email: orderData.patientEmail || 'paciente@ejemplo.com',
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
        tenant_id: tenantId,
        patient_dni: orderData.patientDni || '',
      },
    };

    const result = await preference.create({ body: preferenceBody });

    return {
      orderId,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
      preferenceId: result.id,
      publicKey: tenant?.mpPublicKey || process.env.MP_PUBLIC_KEY || '',
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

    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('[MercadoPago Webhook] Warning: No MP_ACCESS_TOKEN configured in environment.');
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

      console.log(`[MercadoPago Webhook] Payment ${paymentId} for Order ${orderId} status: ${status}`);

      if (orderId) {
        const order: any = await this.orderRepo.findById(orderId);
        if (order) {
          let updatedPaymentStatus: 'approved' | 'pending' | 'rejected' | 'refunded' = 'pending';
          let recipeStatus = order.status;

          if (status === 'approved') {
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
            `Notificación oficial Mercado Pago ID ${paymentId}: Estado de pago "${status}". Receta configurada en "${recipeStatus}".`
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

    const accessToken = process.env.MP_ACCESS_TOKEN;
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
          let updatedPaymentStatus: 'approved' | 'pending' | 'rejected' | 'refunded' = 'pending';
          let recipeStatus = order.status;

          if (status === 'approved') {
            updatedPaymentStatus = 'approved';
            recipeStatus = 'Pendiente';
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
              `Sincronización activa: Pago ID ${fetchedPayment.id} estado "${status}".`
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
}
