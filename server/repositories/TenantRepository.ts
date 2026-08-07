import { Tenant, ITenant } from '../models/Tenant.js';

export class TenantRepository {
  async findById(id: string): Promise<ITenant | null> {
    return Tenant.findOne({ id });
  }

  async findBySubdomain(subdomain: string): Promise<ITenant | null> {
    return Tenant.findOne({ subdomain: subdomain.toLowerCase() });
  }

  async findAll(): Promise<ITenant[]> {
    return Tenant.find().sort({ name: 1 });
  }

  async count(): Promise<number> {
    return Tenant.countDocuments();
  }

  async create(tenantData: Partial<ITenant>): Promise<ITenant> {
    const newTenant = new Tenant(tenantData);
    return newTenant.save();
  }

  async update(id: string, updateData: Partial<ITenant>): Promise<ITenant | null> {
    const tenant = await this.findById(id);
    if (!tenant) return null;
    Object.assign(tenant, updateData);
    return tenant.save();
  }
}
