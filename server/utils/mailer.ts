import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS
  }
});

const isSmtpConfigured = (): boolean => {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    config.SMTP_HOST !== 'smtp.ethereal.email'
  );
};

interface UserCredentialsEmailPayload {
  email: string;
  name: string;
  role: string;
  identifier: string;
}

interface PasswordResetEmailPayload {
  email: string;
  name: string;
  resetUrl: string;
}

export const sendCredentialsEmail = async (user: UserCredentialsEmailPayload, password: string): Promise<void> => {
  if (!isSmtpConfigured()) {
    console.log('\n=== SIMULATED EMAIL ===');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Bienvenido a Mi Receta - Credenciales de Acceso`);
    console.log(`Hola ${user.name},`);
    console.log(`Has sido dado de alta como ${user.role}.`);
    console.log(`Tu usuario/identificador es: ${user.identifier}`);
    console.log(`Tu contraseña temporal es: ${password}`);
    console.log('Te pediremos cambiarla en tu primer inicio de sesión.\n');
    return;
  }

  try {
    await transporter.sendMail({
      from: '"Mi Receta" <no-reply@mireceta.com>',
      to: user.email,
      subject: 'Bienvenido a Mi Receta - Credenciales de Acceso',
      html: `
        <h2>Bienvenido a Mi Receta</h2>
        <p>Hola ${user.name}, has sido dado de alta como <b>${user.role}</b>.</p>
        <p>Tus credenciales de acceso son:</p>
        <ul>
          <li><b>Usuario/Identificador:</b> ${user.identifier}</li>
          <li><b>Contraseña Temporal:</b> ${password}</li>
        </ul>
        <p>Por seguridad, se te pedirá cambiar tu contraseña en tu primer inicio de sesión.</p>
      `
    });
  } catch (error) {
    console.error('Error sending credentials email:', error);
  }
};

export const sendPasswordResetEmail = async (user: PasswordResetEmailPayload): Promise<void> => {
  if (!isSmtpConfigured()) {
    console.log('\n=== SIMULATED PASSWORD RESET EMAIL ===');
    console.log(`To: ${user.email}`);
    console.log(`Subject: Mi Receta - Recuperación de Contraseña`);
    console.log(`Hola ${user.name}, tu link de recuperación es:`);
    console.log(user.resetUrl);
    console.log('(Válido por 1 hora)\n');
    return;
  }

  try {
    await transporter.sendMail({
      from: '"Mi Receta" <no-reply@mireceta.com>',
      to: user.email,
      subject: 'Mi Receta — Recuperación de Contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #0141BC;">Recuperación de Contraseña</h2>
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Mi Receta</strong>.</p>
          <p style="margin: 24px 0;">
            <a href="${user.resetUrl}"
               style="background-color: #1661E1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Restablecer mi contraseña
            </a>
          </p>
          <p style="color: #666; font-size: 13px;">
            Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, podés ignorar este correo.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 11px;">
            Si el botón no funciona, copiá y pegá este enlace en tu navegador:<br>
            <a href="${user.resetUrl}" style="color: #1661E1;">${user.resetUrl}</a>
          </p>
        </div>
      `
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
  }
};
