import { Tenant, ITenant } from '../models/Tenant.js';

export class TenantRepository {
  async findById(id: string) {
    return (Tenant as any).findOne({ id });
  }

  async findBySubdomain(subdomain: string) {
    return (Tenant as any).findOne({ subdomain: subdomain.toLowerCase() });
  }

  async findAll() {
    return (Tenant as any).find().sort({ name: 1 });
  }

  async count() {
    return (Tenant as any).countDocuments();
  }

  async create(tenantData: Partial<ITenant>) {
    const newTenant = new Tenant(tenantData);
    return newTenant.save();
  }

  async update(id: string, updateData: Partial<ITenant>) {
    const tenant = await this.findById(id);
    if (!tenant) return null;
    Object.assign(tenant, updateData);
    return tenant.save();
  }
}
