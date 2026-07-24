import { TenantRepository } from '../repositories/TenantRepository.js';

export class TenantService {
  private tenantRepo: TenantRepository;

  constructor() {
    this.tenantRepo = new TenantRepository();
  }

  async getTenants() {
    return this.tenantRepo.findAll();
  }

  async resolveTenant(subdomain: string) {
    if (!subdomain) throw new Error('Subdominio requerido');
    const lowerSub = subdomain.toLowerCase();
    
    try {
      let tenant = await this.tenantRepo.findBySubdomain(lowerSub);
      
      // Fallback for www or main domain
      if (!tenant && (lowerSub === 'www' || lowerSub === 'localhost')) {
        tenant = await this.tenantRepo.findById('TEN-0001');
        if (!tenant) {
          const tenants = await this.tenantRepo.findAll();
          if (tenants.length > 0) tenant = tenants[0];
        }
      }

      if (tenant) {
        return { 
          id: tenant.id, 
          name: tenant.name, 
          subdomain: tenant.subdomain,
          mpPublicKey: tenant.mpPublicKey,
          mpEnabled: tenant.mpEnabled
        };
      }
    } catch (err) {
      console.error('Error resolving tenant from DB, using fallback:', err);
    }

    // Emergency fallback if DB is timing out or unreachable
    return {
      id: 'TEN-0001',
      name: 'Centro Médico Principal',
      subdomain: lowerSub || 'www',
      mpPublicKey: '',
      mpEnabled: false
    };
  }

  async createTenant(tenantData: any, currentUser: any) {
    if (currentUser.role !== 'superadmin') throw new Error('Acceso denegado');
    
    const count = await this.tenantRepo.count();
    const newId = `TEN-${String(count + 1).padStart(4, '0')}`;
    
    return this.tenantRepo.create({
      id: newId,
      name: tenantData.name,
      subdomain: tenantData.subdomain.toLowerCase()
    });
  }

  async getPaymentConfig(tenantId: string) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new Error('Centro médico no encontrado');
    return {
      mpAccessToken: tenant.mpAccessToken || '',
      mpPublicKey: tenant.mpPublicKey || '',
      mpEnabled: tenant.mpEnabled || false
    };
  }

  async updatePaymentConfig(tenantId: string, data: any, currentUser: any) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      throw new Error('Acceso denegado. Solo administradores pueden configurar la pasarela de pagos.');
    }
    const updated = await this.tenantRepo.update(tenantId, {
      mpAccessToken: data.mpAccessToken,
      mpPublicKey: data.mpPublicKey,
      mpEnabled: Boolean(data.mpEnabled)
    });
    return {
      mpAccessToken: updated?.mpAccessToken,
      mpPublicKey: updated?.mpPublicKey,
      mpEnabled: updated?.mpEnabled
    };
  }
}
