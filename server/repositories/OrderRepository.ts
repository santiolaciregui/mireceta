import { Order, IMedicalOrder } from '../models/Order.js';
import { cleanPhone } from '../utils/formatters.js';

export class OrderRepository {
  async findById(id: string): Promise<IMedicalOrder | null> {
    return Order.findOne({ id });
  }

  async findByClientRequestId(clientRequestId: string): Promise<IMedicalOrder | null> {
    return Order.findOne({ clientRequestId });
  }

  async findByTenant(tenantId: string): Promise<IMedicalOrder[]> {
    return Order.find({ tenantId }).sort({ createdAt: -1 }).lean() as unknown as IMedicalOrder[];
  }

  async findSummariesByTenant(tenantId: string): Promise<IMedicalOrder[]> {
    return this.findSummaries({ tenantId });
  }

  async findByPatientDnis(tenantId: string, dnis: string[]): Promise<IMedicalOrder[]> {
    if (!dnis || dnis.length === 0) return [];
    return Order.find({
      tenantId,
      $or: [
        { patientDni: { $in: dnis } },
        { requestedByTitularDni: { $in: dnis } }
      ]
    })
      .sort({ createdAt: -1 })
      .lean() as unknown as IMedicalOrder[];
  }

  async findSummariesByPatientDnis(tenantId: string, dnis: string[]): Promise<IMedicalOrder[]> {
    if (!dnis || dnis.length === 0) return [];
    return this.findSummaries({
      tenantId,
      $or: [
        { patientDni: { $in: dnis } },
        { requestedByTitularDni: { $in: dnis } }
      ]
    });
  }

  private async findSummaries(match: Record<string, unknown>): Promise<IMedicalOrder[]> {
    return Order.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $set: {
          _isSummary: true,
          _hasRecipePdf: {
            $gt: [{ $strLenBytes: { $ifNull: ['$recipePdfUrl', ''] } }, 0]
          },
          recipePdfUrl: {
            $cond: [
              { $regexMatch: { input: { $ifNull: ['$recipePdfUrl', ''] }, regex: '^data:' } },
              '$$REMOVE',
              '$recipePdfUrl'
            ]
          }
        }
      },
      {
        $unset: [
          'medicationPhotos.url',
          'medicationPhotoUrl',
          'paymentReceiptUrl',
          'messages.fileUrl'
        ]
      }
    ]) as unknown as IMedicalOrder[];
  }

  async findByPatientId(patientId: string): Promise<IMedicalOrder[]> {
    return Order.find({ patientId }).sort({ createdAt: -1 });
  }

  async findByPatientPhone(phone: string): Promise<IMedicalOrder[]> {
    let clean = cleanPhone(phone);
    if (clean.startsWith('549')) clean = clean.slice(3);
    else if (clean.startsWith('54')) clean = clean.slice(2);
    if (clean.startsWith('0')) clean = clean.slice(1);
    const last8Digits = clean.slice(-8);

    const orders = await Order.find().sort({ createdAt: -1 });
    return orders.filter((o: IMedicalOrder) => {
      let orderPhoneClean = cleanPhone(o.patientPhone);
      if (orderPhoneClean.startsWith('549')) orderPhoneClean = orderPhoneClean.slice(3);
      else if (orderPhoneClean.startsWith('54')) orderPhoneClean = orderPhoneClean.slice(2);
      if (orderPhoneClean.startsWith('0')) orderPhoneClean = orderPhoneClean.slice(1);

      if (orderPhoneClean.length < 6 || last8Digits.length < 6) return false;
      const orderLast8 = orderPhoneClean.slice(-8);
      return orderLast8 === last8Digits;
    });
  }

  async count(): Promise<number> {
    return Order.countDocuments();
  }

  async countActionablePendingByTenant(tenantId: string): Promise<number> {
    return Order.countDocuments({
      tenantId,
      status: { $in: ['Pendiente', 'En revisión'] },
      paymentStatus: { $nin: ['pending', 'rejected', 'refunded'] }
    });
  }

  async create(orderData: Partial<IMedicalOrder>): Promise<IMedicalOrder> {
    const newOrder = new Order(orderData);
    return newOrder.save();
  }

  async update(id: string, updateData: Partial<IMedicalOrder>): Promise<IMedicalOrder | null> {
    const order = await this.findById(id);
    if (!order) return null;
    Object.assign(order, updateData);
    return order.save();
  }

  async delete(id: string): Promise<boolean> {
    const result = await Order.deleteOne({ id });
    return result.deletedCount > 0;
  }
}
