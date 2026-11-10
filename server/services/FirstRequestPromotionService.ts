/** US-016, 2026-11-10: one atomic Order write consumes the benefit permanently. */
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';
import { OrderRepository } from '../repositories/OrderRepository.js';
import { cleanDni } from '../utils/formatters.js';
import { assertCheckoutAccess } from './checkoutAccess.js';
import { promotionQuote, hasConfirmedPayment, unsafePayment, assertQuoteConfirmation } from './firstRequestPolicy.js';
import { PROMOTION_START, PROMOTION_END, type PromotionQuote } from '../../src/types/firstRequestPromotion.js';
import { observeAnalyticsOrder } from './analyticsStore.js';

const conflict = (message: string) => Object.assign(new Error(message), { status: 409 });
export async function ensurePromotionIndex() {
  await Order.collection.createIndex({ tenantId: 1, 'firstRequestBenefit.beneficiaryId': 1 }, {
    name: 'one_first_request_benefit', unique: true,
    partialFilterExpression: { 'firstRequestBenefit.beneficiaryId': { $type: 'string' } },
  });
}
export class FirstRequestPromotionService {
  private repo = new OrderRepository();
  async account(user: any) {
    const account = user?.role === 'paciente' && user?.id ? await User.findOne({ id: user.id }).lean() : null;
    if (!account || account.role !== 'paciente' || (account.tenantId || 'TEN-0001') !== (user.tenantId || 'TEN-0001')) {
      throw Object.assign(new Error('El beneficio está disponible únicamente para la cuenta del paciente.'), { status: 403 });
    }
    return account;
  }
  async quote(user: any, data: any): Promise<PromotionQuote> {
    const account = await this.account(user);
    const tenantId = account.tenantId || 'TEN-0001';
    const tenant = await Tenant.findOne({ id: tenantId }).lean();
    const order: any = data.orderId ? await this.repo.findById(data.orderId) : { medicationMethod: data.medicationMethod, medicationItems: data.medicationItems, medicationPhotos: data.medicationPhotos, medicationPhotoUrl: data.medicationPhotoUrl };
    if (!order) throw conflict('Solicitud no encontrada.');
    if (data.orderId) assertCheckoutAccess(order, account);
    if (!data.orderId && data.patientDni) {
      const permitted = [account.identifier, ...(account.dependents || []).map((d: any) => d.dni || d.identifier)].map(cleanDni);
      if (!permitted.includes(cleanDni(data.patientDni))) throw Object.assign(new Error('El beneficio es para el titular o sus familiares a cargo.'), { status: 403 });
    }
    if (order.firstRequestBenefit && data.orderId) {
      if (order.firstRequestBenefit.beneficiaryId !== account.id) throw conflict('Esta solicitud ya tiene una bonificación de otra cuenta.');
      const { originalAmount, discount, finalAmount } = order.firstRequestBenefit;
      return { eligible: true, applied: true, reason: '', startsAt: tenant?.firstRequestPromotionStartsAt || PROMOTION_START, endsAt: tenant?.firstRequestPromotionEndsAt || PROMOTION_END, originalAmount, discount, finalAmount };
    }
    const dnis = [account.identifier, ...(account.dependents || []).map((d: any) => d.dni || d.identifier)].filter(Boolean);
    const history = await this.repo.findByPatientDnis(tenantId, dnis);
    const used = await Order.exists({ tenantId, 'firstRequestBenefit.beneficiaryId': account.id });
    let reason = used ? 'Ya utilizaste la bonificación de tu primera solicitud.' : '';
    if (!reason && history.some(hasConfirmedPayment)) reason = 'Tu cuenta ya registra un pago confirmado anterior.';
    if (!reason && history.some(unsafePayment)) reason = 'Hay un pago iniciado o un comprobante pendiente. Se requiere revisión antes de bonificar.';
    if (!reason && data.orderId && (order.status !== 'Pendiente' || !['pending', 'rejected'].includes(order.paymentStatus) || unsafePayment(order))) reason = 'Esta solicitud requiere revisión antes de modificar su arancel.';
    return promotionQuote(tenant, order, Number(tenant?.pricePerPrescription ?? 10000), reason);
  }
  async prepare(user: any, data: any, confirmation: any) {
    const quote = await this.quote(user, data);
    assertQuoteConfirmation(quote, confirmation);
    await ensurePromotionIndex();
    return {
      beneficiaryId: user.id, appliedAt: new Date().toISOString(),
      originalAmount: quote.originalAmount, discount: quote.discount, finalAmount: quote.finalAmount,
    };
  }
  async apply(user: any, orderId: string, confirmation: any) {
    const account = await this.account(user);
    const order: any = await this.repo.findById(orderId);
    if (!order) throw conflict('Solicitud no encontrada.');
    assertCheckoutAccess(order, account);
    if (order.firstRequestBenefit?.beneficiaryId === account.id) return order;
    const benefit = await this.prepare(account, { orderId }, confirmation);
    const changes: any = { firstRequestBenefit: benefit, paymentAmount: String(benefit.finalAmount), updatedAt: benefit.appliedAt };
    if (benefit.finalAmount > 0 && order.paymentMethod !== 'mp') Object.assign(changes, { paymentMethod: 'mp', paymentStage: 'not_started' });
    if (benefit.finalAmount === 0) Object.assign(changes, { paymentMethod: 'bonificado', paymentStatus: 'exempt', paymentId: 'EXENTO', paymentStage: 'not_started', status: 'En revisión' });
    try {
      const updated = await Order.findOneAndUpdate({
        id: orderId, tenantId: order.tenantId, status: 'Pendiente', paymentStatus: order.paymentStatus,
        paymentAmount: order.paymentAmount, paymentMethod: order.paymentMethod,
        paymentStage: order.paymentStage ?? null, checkoutEverStarted: { $ne: true },
        paymentReceiptUrl: order.paymentReceiptUrl ?? null, firstRequestBenefit: { $exists: false },
      }, { $set: changes, $push: { auditLog: benefitAudit(benefit) } }, { new: true, runValidators: true });
      if (!updated) {
        const latest: any = await this.repo.findById(orderId);
        if (latest?.firstRequestBenefit?.beneficiaryId === account.id) return latest;
        throw conflict('La solicitud cambió. Revisá el resumen antes de confirmar nuevamente.');
      }
      await observeAnalyticsOrder(updated);
      return updated;
    } catch (error: any) {
      if (error.code === 11000) throw conflict('Ya utilizaste el beneficio en otra solicitud. Revisá el resumen.');
      throw error;
    }
  }
  async config(user: any, data?: any) {
    if (!['admin', 'superadmin'].includes(user?.role)) throw Object.assign(new Error('Solo administradores pueden configurar la promoción.'), { status: 403 });
    const tenantId = user.tenantId || 'TEN-0001';
    const previous = await Tenant.findOne({ id: tenantId }).lean();
    if (data !== undefined) {
      const startsAt = data?.startsAt ?? previous?.firstRequestPromotionStartsAt ?? PROMOTION_START;
      if (typeof data?.enabled !== 'boolean' || typeof startsAt !== 'string' || !Number.isFinite(Date.parse(startsAt)) || typeof data.endsAt !== 'string' || !Number.isFinite(Date.parse(data.endsAt))) throw Object.assign(new Error('Indicá el estado y fechas de inicio y cierre válidas.'), { status: 400 });
      if (Date.parse(startsAt) >= Date.parse(data.endsAt)) throw Object.assign(new Error('La fecha hasta debe ser igual o posterior a la fecha desde.'), { status: 400 });
      if (data.enabled) await ensurePromotionIndex();
      const updated = await Tenant.findOneAndUpdate({ id: tenantId }, { $set: {
        firstRequestPromotionEnabled: data.enabled, firstRequestPromotionStartsAt: new Date(startsAt).toISOString(), firstRequestPromotionEndsAt: new Date(data.endsAt).toISOString(),
      } }, { new: true });
      if (!updated) throw conflict('Centro médico no encontrado.');
    }
    const tenant = await Tenant.findOne({ id: tenantId }).lean();
    return { enabled: tenant?.firstRequestPromotionEnabled ?? false, startsAt: tenant?.firstRequestPromotionStartsAt || PROMOTION_START, endsAt: tenant?.firstRequestPromotionEndsAt || PROMOTION_END };
  }
}
export function benefitAudit(benefit: { appliedAt: string; originalAmount: number; discount: number; finalAmount: number }) {
  return { action: 'Primera solicitud bonificada', user: 'Sistema (Promoción)', timestamp: benefit.appliedAt,
    notes: `Original: $${benefit.originalAmount}. Bonificación: $${benefit.discount}. Total: $${benefit.finalAmount}. Beneficio consumido al confirmar; no es un pago.` };
}
