import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'mi-receta-secreta-suarez-2026-key',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mi-receta',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || 'ethereal.user@ethereal.email',
  SMTP_PASS: process.env.SMTP_PASS || 'ethereal-pass',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || process.env.ERROR_ALERT_EMAIL || 'santi.olaciregui13@gmail.com',
  ENABLE_ERROR_ALERTS: process.env.ENABLE_ERROR_ALERTS !== 'false',
  ERROR_ALERT_THROTTLE_MINUTES: parseInt(process.env.ERROR_ALERT_THROTTLE_MINUTES || '10', 10)
};
