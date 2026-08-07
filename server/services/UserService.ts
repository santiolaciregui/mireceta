import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository.js';
import { sendCredentialsEmail } from '../utils/mailer.js';
import { auditLogService } from './AuditLogService.js';
import { PatientService } from './PatientService.js';
import { cleanDni } from '../utils/formatters.js';
import { generateUserId } from '../utils/idGenerator.js';

export class UserService {
  private userRepo: UserRepository;
  private patientService: PatientService;

  constructor() {
    this.userRepo = new UserRepository();
    this.patientService = new PatientService();
  }

  async getProfile(id: string) {
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('Usuario no encontrado.');
    if (user.status === 'Inactivo') throw new Error('Cuenta suspendida.');

    const responsePayload: Record<string, any> = {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      identifier: user.identifier,
      email: user.email,
      phone: user.phone,
      birthDate: user.birthDate,
      obraSocial: user.obraSocial,
      obraSocialNumber: user.obraSocialNumber,
      requirePasswordChange: user.requirePasswordChange,
    };

    if (user.role === 'colaborador') {
      responsePayload.medicoId = user.medicoId;
      responsePayload.medicoName = user.medicoName;
    }
    return responsePayload;
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');

    const user = await this.userRepo.findById(id);
    if (!user) throw new Error('Usuario no encontrado');

    let validPassword = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      validPassword = await bcrypt.compare(currentPassword, user.password);
    }
    if (!validPassword) throw new Error('La contraseña actual es incorrecta.');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(id, { password: hashedPassword, requirePasswordChange: false });

    await auditLogService.log({
      tenantId: user.tenantId || 'TEN-0001',
      currentUser: user,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: user.id,
      details: `Cambio de contraseña realizado con éxito para ${user.name} ${user.lastName}`
    });
  }

  async getUsersByTenant(tenantId: string) {
    return this.userRepo.findByTenantAndRole(tenantId);
  }

  async createUser(userData: any, currentUser: any) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      throw new Error('No autorizado para crear usuarios');
    }

    const cleanIdentifier = cleanDni(userData.identifier) || userData.identifier;
    const exists = await this.userRepo.findByIdentifier(cleanIdentifier);
    if (exists) throw new Error('El usuario con este identificador (DNI) ya existe.');

    const count = await this.userRepo.count();
    const newId = generateUserId(count);
    const initialPassword = userData.password || '123456';
    const hashedPassword = await bcrypt.hash(initialPassword, 10);

    const newUser = await this.userRepo.create({
      ...userData,
      identifier: cleanIdentifier,
      id: newId,
      tenantId: currentUser.tenantId,
      password: hashedPassword,
      requirePasswordChange: true
    });

    if (newUser.role === 'paciente') {
      await this.patientService.createOrUpdatePatient({
        dni: newUser.identifier,
        name: newUser.name,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        birthDate: newUser.birthDate,
        obraSocial: newUser.obraSocial,
        obraSocialNumber: newUser.obraSocialNumber,
        tenantId: newUser.tenantId,
        userId: newUser.id
      }, currentUser);
    }

    await auditLogService.log({
      tenantId: currentUser.tenantId || 'TEN-0001',
      currentUser,
      action: 'USER_CREATE',
      entity: 'User',
      entityId: newId,
      details: `Creado usuario ${newUser.name} ${newUser.lastName} con rol ${newUser.role}`
    });

    if (newUser.email) {
      sendCredentialsEmail(newUser, initialPassword);
    }

    return newUser;
  }

  async updateUser(id: string, updateData: any, currentUser: any) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      throw new Error('No autorizado');
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await this.userRepo.update(id, updateData);

    if (updatedUser && updatedUser.role === 'paciente') {
      await this.patientService.createOrUpdatePatient({
        dni: updatedUser.identifier,
        name: updatedUser.name,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        birthDate: updatedUser.birthDate,
        obraSocial: updatedUser.obraSocial,
        obraSocialNumber: updatedUser.obraSocialNumber,
        tenantId: updatedUser.tenantId,
        userId: updatedUser.id
      }, currentUser);
    }

    await auditLogService.log({
      tenantId: currentUser.tenantId || 'TEN-0001',
      currentUser,
      action: 'USER_UPDATE',
      entity: 'User',
      entityId: id,
      details: `Actualizados datos del usuario ${id}`
    });

    return updatedUser;
  }

  async deleteUser(id: string, currentUser: any) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'superadmin') {
      throw new Error('No autorizado');
    }

    await auditLogService.log({
      tenantId: currentUser.tenantId || 'TEN-0001',
      currentUser,
      action: 'USER_DELETE',
      entity: 'User',
      entityId: id,
      details: `Eliminado usuario ${id}`
    });

    return this.userRepo.delete(id);
  }
}
