import { TenantRepository } from '../repositories/TenantRepository.js';
import { generateTenantId } from '../utils/idGenerator.js';
import { auditLogService } from './AuditLogService.js';

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

      // Fallback for www or localhost
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
          mpEnabled: tenant.mpEnabled,
          pricePerPrescription: tenant.pricePerPrescription || 10000,
          collaboratorRate: tenant.collaboratorRate ?? 500,
          doctorRate: tenant.doctorRate ?? 1500,
          settlementBasis: tenant.settlementBasis ?? 'emitted'
        };
      }
    } catch (err) {
      console.error('Error resolving tenant from DB, using fallback:', err);
    }

    return {
      id: 'TEN-0001',
      name: 'Centro Médico Principal',
      subdomain: lowerSub || 'www',
      mpPublicKey: '',
      mpEnabled: false,
      pricePerPrescription: 10000,
      collaboratorRate: 500,
      doctorRate: 1500,
      settlementBasis: 'emitted'
    };
  }

  async createTenant(tenantData: any, currentUser: any) {
    if (currentUser.role !== 'superadmin') throw new Error('Acceso denegado');

    const count = await this.tenantRepo.count();
    const newId = generateTenantId(count);

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
      mpEnabled: tenant.mpEnabled || false,
      pricePerPrescription: tenant.pricePerPrescription || 10000
    };
  }

  async updatePaymentConfig(tenantId: string, data: any, currentUser: any) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      throw new Error('Acceso denegado. Solo administradores pueden configurar la pasarela de pagos.');
    }
    const updated = await this.tenantRepo.update(tenantId, {
      mpAccessToken: data.mpAccessToken,
      mpPublicKey: data.mpPublicKey,
      mpEnabled: Boolean(data.mpEnabled),
      pricePerPrescription: data.pricePerPrescription ? Number(data.pricePerPrescription) : undefined
    });
    return {
      mpAccessToken: updated?.mpAccessToken,
      mpPublicKey: updated?.mpPublicKey,
      mpEnabled: updated?.mpEnabled,
      pricePerPrescription: updated?.pricePerPrescription
    };
  }

  async getTariffs(tenantId: string) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) throw new Error('Centro médico no encontrado');
    return {
      pricePerPrescription: tenant.pricePerPrescription ?? 10000,
      collaboratorRate: tenant.collaboratorRate ?? 500,
      doctorRate: tenant.doctorRate ?? 1500,
      settlementBasis: tenant.settlementBasis ?? 'emitted'
    };
  }

  async updateTariffs(tenantId: string, data: any, currentUser: any) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin' && currentUser.role !== 'medico') {
      throw new Error('Acceso denegado. No tiene permisos para configurar tarifas.');
    }
    const updateData: any = {};
    if (data.pricePerPrescription !== undefined) updateData.pricePerPrescription = Number(data.pricePerPrescription);
    if (data.collaboratorRate !== undefined) updateData.collaboratorRate = Number(data.collaboratorRate);
    if (data.doctorRate !== undefined) updateData.doctorRate = Number(data.doctorRate);
    if (data.settlementBasis !== undefined) updateData.settlementBasis = data.settlementBasis;

    const updated = await this.tenantRepo.update(tenantId, updateData);

    await auditLogService.log({
      tenantId: tenantId || 'TEN-0001',
      currentUser,
      action: 'SETTINGS_CHANGE',
      entity: 'Tenant',
      entityId: tenantId,
      details: `Tarifas de liquidación actualizadas: Colaborador=$${updated?.collaboratorRate}, Médico=$${updated?.doctorRate}, Base=${updated?.settlementBasis}`
    });

    return {
      pricePerPrescription: updated?.pricePerPrescription ?? 10000,
      collaboratorRate: updated?.collaboratorRate ?? 500,
      doctorRate: updated?.doctorRate ?? 1500,
      settlementBasis: updated?.settlementBasis ?? 'emitted'
    };
  }
}
