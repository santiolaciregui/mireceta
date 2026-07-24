import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { TenantRepository } from '../repositories/TenantRepository.js';
import { OrderRepository } from '../repositories/OrderRepository.js';

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
    const origin = orderData.origin || 'http://localhost:3000';

    const result = await preference.create({
      body: {
        items: [
          {
            id: orderData.orderId || 'RECETA-RENOVACION',
            title: `Renovación de Receta Médica - ${orderData.patientName || 'Paciente'}`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'ARS',
          },
        ],
        payer: {
          name: orderData.patientName || 'Paciente',
          email: orderData.patientEmail || 'paciente@suarez.gob.ar',
        },
        back_urls: {
          success: `${origin}?payment=approved`,
          failure: `${origin}?payment=rejected`,
          pending: `${origin}?payment=pending`,
        },
        auto_return: 'approved',
        external_reference: orderData.orderId || '',
        statement_descriptor: 'RECETA FACIL',
      },
    });

    return {
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
      preferenceId: result.id,
      publicKey: tenant?.mpPublicKey || process.env.MP_PUBLIC_KEY || '',
    };
  }

  async processWebhook(query: any, body: any) {
    const paymentId = query.id || query['data.id'] || body?.data?.id;
    if (!paymentId) {
      return { received: true };
    }

    // Try finding order by external reference or updating mock status
    console.log(`[MercadoPago Webhook] Payment Notification received for Payment ID: ${paymentId}`);
    return { received: true, paymentId };
  }
}
