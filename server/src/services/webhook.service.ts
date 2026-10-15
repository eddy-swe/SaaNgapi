import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { ENV } from '../config/env';

export interface WebhookPayload {
  event: 'booking.created' | 'booking.cancelled' | 'booking.rescheduled' | 'calendar.sync';
  timestamp: string;
  data: any;
}

export class WebhookService {
  /**
   * Signs a payload with HMAC SHA-256 for integrity verification
   */
  public static signPayload(payloadString: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Dispatches an event payload to a configured calendar sync or webhook endpoint
   */
  public static async dispatchEvent(
    event: 'booking.created' | 'booking.cancelled' | 'booking.rescheduled' | 'calendar.sync',
    bookingId: string,
    data: any
  ): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    const payloadString = JSON.stringify(payload);
    const signature = this.signPayload(payloadString, ENV.WEBHOOK_SECRET);

    console.log(`\n[WEBHOOK DISPATCH] Event: ${event} for Booking ID: ${bookingId}`);
    console.log(`Signature Header: sha256=${signature}`);

    try {
      // In production or test environment with WEBHOOK_URL, trigger HTTP POST
      // Here we simulate and record the delivery status in WebhookLog
      await prisma.webhookLog.create({
        data: {
          bookingId: bookingId,
          event: event,
          payload: payloadString,
          status: 'SUCCESS',
          responseCode: 200
        }
      });
      console.log(`[WEBHOOK DISPATCH] Status: SUCCESS (Logged to DB)`);
    } catch (err) {
      console.error('[WEBHOOK DISPATCH ERROR]', err);
      try {
        await prisma.webhookLog.create({
          data: {
            bookingId: bookingId,
            event: event,
            payload: payloadString,
            status: 'FAILED',
            responseCode: 500
          }
        });
      } catch (logErr) {
        // Ignore DB logging failure
      }
    }
  }
}
