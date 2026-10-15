import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../types';
import { verifySlotAvailability } from '../services/slotCalculator';
import { EmailService } from '../services/email.service';
import { WebhookService } from '../services/webhook.service';

export const cancelBookingSchema = z.object({
  reason: z.string().optional()
});

export const rescheduleBookingSchema = z.object({
  newStartTime: z.string().datetime(),
  newEndTime: z.string().datetime()
});

export class BookingController {
  public static async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status, timeframe } = req.query;

      const now = new Date();
      let whereClause: any = { hostId: userId };

      if (status) {
        whereClause.status = status;
      } else if (timeframe === 'upcoming') {
        whereClause.status = { in: ['CONFIRMED', 'PENDING'] };
        whereClause.startTime = { gte: now };
      } else if (timeframe === 'past') {
        whereClause.startTime = { lt: now };
      } else if (timeframe === 'cancelled') {
        whereClause.status = 'CANCELLED';
      }

      const bookings = await prisma.booking.findMany({
        where: whereClause,
        include: {
          eventType: true
        },
        orderBy: {
          startTime: timeframe === 'past' ? 'desc' : 'asc'
        }
      });

      res.status(200).json({ success: true, bookings });
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve bookings' });
    }
  }

  public static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const booking = await prisma.booking.findFirst({
        where: { id, hostId: userId },
        include: {
          eventType: true,
          host: {
            select: { name: true, email: true, username: true, timezone: true }
          }
        }
      });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found' });
        return;
      }

      res.status(200).json({ success: true, booking });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch booking' });
    }
  }

  public static async cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { reason } = req.body;

      const booking = await prisma.booking.findFirst({
        where: { id, hostId: userId },
        include: {
          eventType: true,
          host: true
        }
      });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found' });
        return;
      }

      if (booking.status === 'CANCELLED') {
        res.status(400).json({ success: false, message: 'Booking is already cancelled' });
        return;
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason || 'Cancelled by host'
        }
      });

      // Dispatch cancellation email
      await EmailService.sendCancellationNotice({
        bookingId: booking.id,
        hostName: booking.host.name,
        hostEmail: booking.host.email,
        hostTimezone: booking.host.timezone,
        inviteeName: booking.inviteeName,
        inviteeEmail: booking.inviteeEmail,
        inviteeTimezone: booking.inviteeTimezone,
        eventTitle: booking.eventType.title,
        duration: booking.eventType.duration,
        startTime: booking.startTime,
        endTime: booking.endTime,
        cancellationReason: reason || 'Cancelled by host'
      });

      // Dispatch webhook
      await WebhookService.dispatchEvent('booking.cancelled', booking.id, {
        bookingId: booking.id,
        status: 'CANCELLED',
        reason
      });

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully',
        booking: updated
      });
    } catch (error) {
      console.error('Cancellation error:', error);
      res.status(500).json({ success: false, message: 'Failed to cancel booking' });
    }
  }

  public static async reschedule(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { newStartTime, newEndTime } = req.body;

      const startTime = new Date(newStartTime);
      const endTime = new Date(newEndTime);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || startTime >= endTime) {
        res.status(400).json({ success: false, message: 'Invalid start or end time' });
        return;
      }

      const booking = await prisma.booking.findFirst({
        where: { id, hostId: userId },
        include: {
          eventType: true,
          host: true
        }
      });

      if (!booking) {
        res.status(404).json({ success: false, message: 'Booking not found' });
        return;
      }

      // Check slot availability within a database transaction to prevent concurrency conflicts
      const updatedBooking = await prisma.$transaction(async (tx) => {
        const isFree = await verifySlotAvailability(
          tx,
          booking.hostId,
          startTime,
          endTime,
          booking.eventType.bufferBefore,
          booking.eventType.bufferAfter,
          booking.id // exclude current booking
        );

        if (!isFree) {
          throw new Error('SLOT_CONFLICT');
        }

        return tx.booking.update({
          where: { id: booking.id },
          data: {
            startTime,
            endTime,
            status: 'CONFIRMED',
            cancellationReason: null
          },
          include: {
            eventType: true,
            host: true
          }
        });
      });

      // Dispatch notifications
      await EmailService.sendBookingConfirmation({
        bookingId: updatedBooking.id,
        hostName: updatedBooking.host.name,
        hostEmail: updatedBooking.host.email,
        hostTimezone: updatedBooking.host.timezone,
        inviteeName: updatedBooking.inviteeName,
        inviteeEmail: updatedBooking.inviteeEmail,
        inviteeTimezone: updatedBooking.inviteeTimezone,
        eventTitle: updatedBooking.eventType.title,
        duration: updatedBooking.eventType.duration,
        startTime: updatedBooking.startTime,
        endTime: updatedBooking.endTime,
        meetingUrl: updatedBooking.meetingUrl
      });

      await WebhookService.dispatchEvent('booking.rescheduled', updatedBooking.id, {
        bookingId: updatedBooking.id,
        newStartTime: updatedBooking.startTime,
        newEndTime: updatedBooking.endTime
      });

      res.status(200).json({
        success: true,
        message: 'Booking rescheduled successfully',
        booking: updatedBooking
      });
    } catch (error: any) {
      if (error.message === 'SLOT_CONFLICT') {
        res.status(409).json({
          success: false,
          message: 'The selected reschedule time slot is no longer available'
        });
        return;
      }
      console.error('Rescheduling error:', error);
      res.status(500).json({ success: false, message: 'Failed to reschedule appointment' });
    }
  }
}
