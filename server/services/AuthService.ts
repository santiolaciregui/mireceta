import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRepository } from '../repositories/UserRepository.js';
import { config } from '../config/env.js';
import { auditLogService } from './AuditLogService.js';
import { PatientService } from './PatientService.js';
import { cleanDni } from '../utils/formatters.js';
import { generateUserId } from '../utils/idGenerator.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

export class AuthService {
  private userRepo: UserRepository;
  private patientService: PatientService;

  constructor() {
    this.userRepo = new UserRepository();
    this.patientService = new PatientService();
  }

  async login(identifier: string, password: string) {
    const rawIdentifier = (identifier || '').trim();
    const user = await this.userRepo.findByIdentifier(rawIdentifier);
    if (!user) throw new Error('Usuario no registrado en el sistema médico.');
    if (user.status === 'Inactivo') throw new Error('La cuenta de este usuario está suspendida o inactiva.');

    let validPassword = false;
    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
      validPassword = await bcrypt.compare(password, user.password);
    }

    if (!validPassword) {
      await auditLogService.log({
        tenantId: user.tenantId || 'TEN-0001',
        currentUser: user,
        action: 'LOGIN_FAILED',
        entity: 'Auth',
        entityId: user.id,
        details: `Intento de inicio de sesión fallido para el identificador: ${identifier}`
      });
      throw new Error('Contraseña incorrecta.');
    }

    const tokenPayload: Record<string, any> = {
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
      tenantId: user.tenantId,
      requirePasswordChange: user.requirePasswordChange,
      dependents: user.dependents || [],
    };

    if (user.role === 'colaborador') {
      tokenPayload.medicoId = user.medicoId;
      tokenPayload.medicoName = user.medicoName;
    }

    await auditLogService.log({
      tenantId: user.tenantId || 'TEN-0001',
      currentUser: user,
      action: 'LOGIN_SUCCESS',
      entity: 'Auth',
      entityId: user.id,
      details: `Inicio de sesión exitoso como ${user.role}`
    });

    const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: '12h' });
    return { token, user: tokenPayload };
  }

  async register(userData: any) {
    if (!userData.identifier || !userData.name || !userData.lastName || !userData.password || !userData.phone || !userData.birthDate || !userData.obraSocial) {
      throw new Error('Todos los campos obligatorios son requeridos.');
    }

    if (userData.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres por seguridad.');
    }

    const cleanIdentifier = cleanDni(userData.identifier) || userData.identifier;
    const exists = await this.userRepo.findByIdentifier(cleanIdentifier);
    if (exists) {
      throw new Error('Este número de DNI ya se encuentra registrado.');
    }

    const count = await this.userRepo.count();
    const newId = generateUserId(count);

    const newUser = await this.userRepo.create({
      ...userData,
      identifier: cleanIdentifier,
      password: await bcrypt.hash(userData.password, 10),
      id: newId,
      role: 'paciente',
      tenantId: userData.tenantId || 'TEN-0001',
      status: 'Activo'
    });

    // Create entry in dedicated Patient collection
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
    });

    await auditLogService.log({
      tenantId: newUser.tenantId || 'TEN-0001',
      currentUser: newUser,
      action: 'PATIENT_REGISTER',
      entity: 'User',
      entityId: newUser.id,
      details: `Registro de nuevo paciente autogestionado ${newUser.name} ${newUser.lastName}`
    });

    const tokenPayload = {
      id: newUser.id,
      name: newUser.name,
      lastName: newUser.lastName,
      role: newUser.role,
      identifier: newUser.identifier,
      email: newUser.email,
      phone: newUser.phone,
      birthDate: newUser.birthDate,
      obraSocial: newUser.obraSocial,
      obraSocialNumber: newUser.obraSocialNumber,
      tenantId: newUser.tenantId,
      dependents: newUser.dependents || [],
    };

    const token = jwt.sign(tokenPayload, config.JWT_SECRET, { expiresIn: '12h' });
    return { token, user: tokenPayload };
  }

  async forgotPassword(identifier: string, email: string) {
    let user;
    const rawIdentifier = (identifier || '').trim();
    const cleanInput = rawIdentifier ? (cleanDni(rawIdentifier) || rawIdentifier) : '';

    if (rawIdentifier) {
      user = await this.userRepo.findByIdentifier(rawIdentifier);
      if (!user && cleanInput) {
        user = await this.userRepo.findByIdentifier(cleanInput);
      }
    } else if (email) {
      user = await this.userRepo.findByEmail(email.trim());
    }

    if (!user) {
      throw new Error('No existe ningún usuario registrado con el DNI o correo electrónico ingresado.');
    }

    const hasEmail = user.email && user.email.trim().length > 0;

    if (!hasEmail) {
      // User has no email — generate a temporary password and return it in the response
      // so it can be shown on screen. Flag requirePasswordChange so they set a new one on login.
      const tempPassword = crypto.randomBytes(4).toString('hex'); // 8 char hex
      const hashedTemp = await bcrypt.hash(tempPassword, 10);
      await this.userRepo.update(user.id, {
        password: hashedTemp,
        requirePasswordChange: true
      });

      await auditLogService.log({
        tenantId: user.tenantId || 'TEN-0001',
        currentUser: user,
        action: 'PASSWORD_RESET_TEMP',
        entity: 'Auth',
        entityId: user.id,
        details: `Contraseña temporal generada para usuario sin email registrado`
      });

      return {
        success: true,
        hasEmail: false,
        tempPassword,
        message: `Tu nueva contraseña temporal es: ${tempPassword}. Usala para ingresar y luego cambiala.`
      };
    }

    // User has email — generate a secure reset token (1 hour expiry)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepo.update(user.id, { resetToken, resetTokenExp });

    // Determine base URL for the reset link
    const baseUrl = process.env.APP_URL || `http://localhost:${config.PORT}`;
    const resetUrl = `${baseUrl}?token=${resetToken}`;

    // Send email (fire and forget — don't block the response)
    sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl
    }).catch(err => console.error('[AuthService] Error sending reset email:', err));

    await auditLogService.log({
      tenantId: user.tenantId || 'TEN-0001',
      currentUser: user,
      action: 'PASSWORD_RESET_REQUESTED',
      entity: 'Auth',
      entityId: user.id,
      details: `Solicitud de reset de contraseña para: ${user.email}`
    });

    return {
      success: true,
      hasEmail: true,
      email: user.email,
      message: `Enviamos las instrucciones de recuperación a tu correo: ${user.email}. Revisá también la carpeta de Spam.`
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || !newPassword) {
      throw new Error('El token y la nueva contraseña son requeridos.');
    }

    if (newPassword.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
    }

    const user = await this.userRepo.findByResetToken(token);
    if (!user) {
      throw new Error('El enlace de recuperación es inválido o ya expiró. Por favor solicitá uno nuevo.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(user.id, {
      password: hashedPassword,
      resetToken: undefined,
      resetTokenExp: undefined,
      requirePasswordChange: false
    });

    await auditLogService.log({
      tenantId: user.tenantId || 'TEN-0001',
      currentUser: user,
      action: 'PASSWORD_RESET_SUCCESS',
      entity: 'Auth',
      entityId: user.id,
      details: `Contraseña restablecida exitosamente vía enlace de recuperación`
    });

    return { success: true, message: '¡Contraseña actualizada con éxito! Ya podés iniciar sesión.' };
  }
}

