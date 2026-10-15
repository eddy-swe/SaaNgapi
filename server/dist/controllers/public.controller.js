"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicController = exports.createBookingSchema = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../db/prisma");
const slotCalculator_1 = require("../services/slotCalculator");
const email_service_1 = require("../services/email.service");
const webhook_service_1 = require("../services/webhook.service");
exports.createBookingSchema = zod_1.z.object({
    inviteeName: zod_1.z.string().min(2, 'Name is required'),
    inviteeEmail: zod_1.z.string().email('Valid email is required'),
    inviteeTimezone: zod_1.z.string().min(1, 'Timezone is required'),
    startTime: zod_1.z.string().datetime(),
    endTime: zod_1.z.string().datetime(),
    inviteeNotes: zod_1.z.string().optional(),
    customAnswers: zod_1.z.string().optional()
});
class PublicController {
    /**
     * Get host public profile and available event types
     */
    static async getHostProfile(req, res) {
        try {
            const { username } = req.params;
            const host = await prisma_1.prisma.user.findUnique({
                where: { username: username.toLowerCase() },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    bio: true,
                    avatarUrl: true,
                    timezone: true,
                    eventTypes: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            title: true,
                            slug: true,
                            description: true,
                            duration: true,
                            price: true,
                            currency: true,
                            color: true
                        }
                    }
                }
            });
            if (!host) {
                res.status(404).json({ success: false, message: 'Host not found' });
                return;
            }
            res.status(200).json({ success: true, host });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch host profile' });
        }
    }
    /**
     * Get specific event type details for public booking page
     */
    static async getEventDetails(req, res) {
        try {
            const { username, eventSlug } = req.params;
            const host = await prisma_1.prisma.user.findUnique({
                where: { username: username.toLowerCase() },
                select: {
                    id: true,
                    name: true,
                    username: true,
                    bio: true,
                    avatarUrl: true,
                    timezone: true
                }
            });
            if (!host) {
                res.status(404).json({ success: false, message: 'Host not found' });
                return;
            }
            const eventType = await prisma_1.prisma.eventType.findUnique({
                where: {
                    userId_slug: {
                        userId: host.id,
                        slug: eventSlug
                    }
                }
            });
            if (!eventType || !eventType.isActive) {
                res.status(404).json({ success: false, message: 'Event type not found or inactive' });
                return;
            }
            res.status(200).json({
                success: true,
                host,
                eventType
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch event details' });
        }
    }
    /**
     * Calculate and return available time slots for a specific date and invitee timezone
     */
    static async getAvailableSlots(req, res) {
        try {
            const { username, eventSlug } = req.params;
            const { date, timezone } = req.query;
            if (!date || typeof date !== 'string') {
                res.status(400).json({ success: false, message: 'Query parameter "date" (YYYY-MM-DD) is required' });
                return;
            }
            const inviteeTz = timezone || 'UTC';
            const host = await prisma_1.prisma.user.findUnique({
                where: { username: username.toLowerCase() }
            });
            if (!host) {
                res.status(404).json({ success: false, message: 'Host not found' });
                return;
            }
            const eventType = await prisma_1.prisma.eventType.findUnique({
                where: {
                    userId_slug: {
                        userId: host.id,
                        slug: eventSlug
                    }
                }
            });
            if (!eventType || !eventType.isActive) {
                res.status(404).json({ success: false, message: 'Event type not found or inactive' });
                return;
            }
            const slots = await (0, slotCalculator_1.calculateAvailableSlots)({
                hostId: host.id,
                eventTypeId: eventType.id,
                dateStr: date,
                hostTimezone: host.timezone,
                inviteeTimezone: inviteeTz,
                duration: eventType.duration,
                bufferBefore: eventType.bufferBefore,
                bufferAfter: eventType.bufferAfter,
                minNoticeMinutes: 30
            });
            res.status(200).json({
                success: true,
                date,
                timezone: inviteeTz,
                slots
            });
        }
        catch (error) {
            console.error('Error calculating slots:', error);
            res.status(500).json({ success: false, message: 'Failed to calculate available slots' });
        }
    }
    /**
     * Book appointment with ACID conflict check
     */
    static async bookAppointment(req, res) {
        try {
            const { username, eventSlug } = req.params;
            const { inviteeName, inviteeEmail, inviteeTimezone, startTime: startTimeStr, endTime: endTimeStr, inviteeNotes, customAnswers } = req.body;
            const startTime = new Date(startTimeStr);
            const endTime = new Date(endTimeStr);
            if (isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || startTime >= endTime) {
                res.status(400).json({ success: false, message: 'Invalid start or end time' });
                return;
            }
            const host = await prisma_1.prisma.user.findUnique({
                where: { username: username.toLowerCase() }
            });
            if (!host) {
                res.status(404).json({ success: false, message: 'Host not found' });
                return;
            }
            const eventType = await prisma_1.prisma.eventType.findUnique({
                where: {
                    userId_slug: {
                        userId: host.id,
                        slug: eventSlug
                    }
                }
            });
            if (!eventType || !eventType.isActive) {
                res.status(404).json({ success: false, message: 'Event type is not available' });
                return;
            }
            // Generate secure unique video meeting room URL
            const meetingRoomId = Math.random().toString(36).substring(2, 10);
            const meetingUrl = `https://meet.jit.si/saangapi-${meetingRoomId}`;
            // Atomic conflict check and booking creation inside database transaction
            const booking = await prisma_1.prisma.$transaction(async (tx) => {
                const isFree = await (0, slotCalculator_1.verifySlotAvailability)(tx, host.id, startTime, endTime, eventType.bufferBefore, eventType.bufferAfter);
                if (!isFree) {
                    throw new Error('SLOT_CONFLICT');
                }
                return tx.booking.create({
                    data: {
                        eventTypeId: eventType.id,
                        hostId: host.id,
                        inviteeName,
                        inviteeEmail: inviteeEmail.toLowerCase(),
                        inviteeTimezone,
                        inviteeNotes: inviteeNotes || null,
                        customAnswers: customAnswers || null,
                        startTime,
                        endTime,
                        status: 'CONFIRMED',
                        meetingUrl
                    },
                    include: {
                        eventType: true,
                        host: {
                            select: { name: true, email: true, username: true, timezone: true }
                        }
                    }
                });
            });
            // Dispatch automated confirmation email
            await email_service_1.EmailService.sendBookingConfirmation({
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
                meetingUrl: booking.meetingUrl
            });
            // Dispatch Webhook for Calendar Sync
            await webhook_service_1.WebhookService.dispatchEvent('booking.created', booking.id, {
                bookingId: booking.id,
                event: booking.eventType.title,
                startTime: booking.startTime,
                endTime: booking.endTime,
                invitee: {
                    name: booking.inviteeName,
                    email: booking.inviteeEmail
                },
                host: {
                    name: booking.host.name,
                    email: booking.host.email
                },
                meetingUrl: booking.meetingUrl
            });
            res.status(201).json({
                success: true,
                message: 'Appointment booked successfully',
                booking
            });
        }
        catch (error) {
            if (error.message === 'SLOT_CONFLICT') {
                res.status(409).json({
                    success: false,
                    message: 'The requested slot has just been booked by someone else. Please pick another slot.'
                });
                return;
            }
            console.error('Booking error:', error);
            res.status(500).json({ success: false, message: 'Failed to complete booking' });
        }
    }
    /**
     * Get single booking public confirmation view
     */
    static async getBookingDetails(req, res) {
        try {
            const { id } = req.params;
            const booking = await prisma_1.prisma.booking.findUnique({
                where: { id },
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
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to retrieve booking' });
        }
    }
    /**
     * Invitee cancellation of an appointment
     */
    static async cancelBooking(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const booking = await prisma_1.prisma.booking.findUnique({
                where: { id },
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
                res.status(400).json({ success: false, message: 'Appointment is already cancelled' });
                return;
            }
            const updated = await prisma_1.prisma.booking.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    cancellationReason: reason || 'Cancelled by invitee'
                }
            });
            await email_service_1.EmailService.sendCancellationNotice({
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
                cancellationReason: reason || 'Cancelled by invitee'
            });
            await webhook_service_1.WebhookService.dispatchEvent('booking.cancelled', booking.id, {
                bookingId: booking.id,
                status: 'CANCELLED',
                reason
            });
            res.status(200).json({
                success: true,
                message: 'Appointment cancelled successfully',
                booking: updated
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to cancel appointment' });
        }
    }
}
exports.PublicController = PublicController;
