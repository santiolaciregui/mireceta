import { Order, IMedicalOrder } from '../models/Order.js';

export class OrderRepository {
  async findById(id: string) {
    return (Order as any).findOne({ id });
  }

  async findByTenant(tenantId: string) {
    return (Order as any).find({ tenantId }).sort({ createdAt: -1 });
  }

  async findByPatientId(patientId: string) {
    return (Order as any).find({ patientId }).sort({ createdAt: -1 });
  }

  async findByPatientPhone(phone: string) {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const orders = await (Order as any).find().sort({ createdAt: -1 });
    return orders.filter((o: any) => {
      const orderPhoneClean = (o.patientPhone || '').replace(/[^\d]/g, '');
      return orderPhoneClean.length > 5 && (cleanPhone.endsWith(orderPhoneClean) || orderPhoneClean.endsWith(cleanPhone));
    });
  }

  async count() {
    return (Order as any).countDocuments();
  }

  async create(orderData: Partial<IMedicalOrder>) {
    const newOrder = new Order(orderData);
    return newOrder.save();
  }

  async update(id: string, updateData: Partial<IMedicalOrder>) {
    const order = await this.findById(id);
    if (!order) return null;
    Object.assign(order, updateData);
    return order.save();
  }

  async delete(id: string) {
    return (Order as any).deleteOne({ id });
  }
}
