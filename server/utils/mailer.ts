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

interface UserCredentialsEmailPayload {
  email: string;
  name: string;
  role: string;
  identifier: string;
}

export const sendCredentialsEmail = async (user: UserCredentialsEmailPayload, password: string): Promise<void> => {
  if (config.SMTP_HOST === 'smtp.ethereal.email' || !process.env.SMTP_HOST) {
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
    console.error('Error sending email:', error);
  }
};
