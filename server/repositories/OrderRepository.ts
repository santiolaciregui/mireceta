import { Order, IMedicalOrder } from '../models/Order.js';
import { cleanPhone } from '../utils/formatters.js';

export class OrderRepository {
  async findById(id: string): Promise<IMedicalOrder | null> {
    return Order.findOne({ id });
  }

  async findByTenant(tenantId: string): Promise<IMedicalOrder[]> {
    return Order.find({ tenantId }).sort({ createdAt: -1 });
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
