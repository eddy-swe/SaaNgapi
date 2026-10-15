"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ENV = {
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/saangapi_db?schema=public',
    JWT_SECRET: process.env.JWT_SECRET || 'fallback-super-secret-key-saangapi-2026',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    WEBHOOK_URL: process.env.WEBHOOK_URL || 'http://localhost:5000/api/webhooks/mock-receiver',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'saangapi_whsec_mock_default'
};
