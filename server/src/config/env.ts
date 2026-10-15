import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/saangapi_db?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-super-secret-key-saangapi-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'http://localhost:5000/api/webhooks/mock-receiver',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'saangapi_whsec_mock_default'
};
