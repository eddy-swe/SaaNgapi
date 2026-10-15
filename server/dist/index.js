"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const eventType_routes_1 = __importDefault(require("./routes/eventType.routes"));
const availability_routes_1 = __importDefault(require("./routes/availability.routes"));
const booking_routes_1 = __importDefault(require("./routes/booking.routes"));
const public_routes_1 = __importDefault(require("./routes/public.routes"));
const webhook_routes_1 = __importDefault(require("./routes/webhook.routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const prisma_1 = require("./db/prisma");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: [env_1.ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-saangapi-signature']
}));
app.use(express_1.default.json());
// Health Check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'SaaNgapi API Server',
        version: '1.0.0'
    });
});
// Mount Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/event-types', eventType_routes_1.default);
app.use('/api/availability', availability_routes_1.default);
app.use('/api/bookings', booking_routes_1.default);
app.use('/api/public', public_routes_1.default);
app.use('/api/webhooks', webhook_routes_1.default);
// Error Handlers
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// Graceful Server Start
const server = app.listen(env_1.ENV.PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 SaaNgapi Server running on port ${env_1.ENV.PORT}`);
    console.log(`📡 Environment: ${env_1.ENV.NODE_ENV}`);
    console.log(`🔗 API Base URL: http://localhost:${env_1.ENV.PORT}/api`);
    console.log(`💻 Client Allowed Origin: ${env_1.ENV.CLIENT_URL}`);
    console.log(`===================================================`);
});
// Graceful Shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        console.log('HTTP server closed, Prisma disconnected');
        process.exit(0);
    });
});
process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        console.log('HTTP server closed, Prisma disconnected');
        process.exit(0);
    });
});
exports.default = app;
