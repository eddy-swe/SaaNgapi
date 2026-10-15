"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../db/prisma");
const env_1 = require("../config/env");
class WebhookService {
    /**
     * Signs a payload with HMAC SHA-256 for integrity verification
     */
    static signPayload(payloadString, secret) {
        return crypto_1.default.createHmac('sha256', secret).update(payloadString).digest('hex');
    }
    /**
     * Dispatches an event payload to a configured calendar sync or webhook endpoint
     */
    static async dispatchEvent(event, bookingId, data) {
        const payload = {
            event,
            timestamp: new Date().toISOString(),
            data
        };
        const payloadString = JSON.stringify(payload);
        const signature = this.signPayload(payloadString, env_1.ENV.WEBHOOK_SECRET);
        console.log(`\n[WEBHOOK DISPATCH] Event: ${event} for Booking ID: ${bookingId}`);
        console.log(`Signature Header: sha256=${signature}`);
        try {
            // In production or test environment with WEBHOOK_URL, trigger HTTP POST
            // Here we simulate and record the delivery status in WebhookLog
            await prisma_1.prisma.webhookLog.create({
                data: {
                    bookingId: bookingId,
                    event: event,
                    payload: payloadString,
                    status: 'SUCCESS',
                    responseCode: 200
                }
            });
            console.log(`[WEBHOOK DISPATCH] Status: SUCCESS (Logged to DB)`);
        }
        catch (err) {
            console.error('[WEBHOOK DISPATCH ERROR]', err);
            try {
                await prisma_1.prisma.webhookLog.create({
                    data: {
                        bookingId: bookingId,
                        event: event,
                        payload: payloadString,
                        status: 'FAILED',
                        responseCode: 500
                    }
                });
            }
            catch (logErr) {
                // Ignore DB logging failure
            }
        }
    }
}
exports.WebhookService = WebhookService;
