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
    let cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.startsWith('549')) cleanPhone = cleanPhone.slice(3);
    else if (cleanPhone.startsWith('54')) cleanPhone = cleanPhone.slice(2);
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.slice(1);
    const last8Digits = cleanPhone.slice(-8);

    const orders = await (Order as any).find().sort({ createdAt: -1 });
    return orders.filter((o: any) => {
      let orderPhoneClean = (o.patientPhone || '').replace(/[^\d]/g, '');
      if (orderPhoneClean.startsWith('549')) orderPhoneClean = orderPhoneClean.slice(3);
      else if (orderPhoneClean.startsWith('54')) orderPhoneClean = orderPhoneClean.slice(2);
      if (orderPhoneClean.startsWith('0')) orderPhoneClean = orderPhoneClean.slice(1);

      if (orderPhoneClean.length < 6 || last8Digits.length < 6) return false;
      const orderLast8 = orderPhoneClean.slice(-8);
      return orderLast8 === last8Digits;
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
