"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAvailableSlots = calculateAvailableSlots;
exports.verifySlotAvailability = verifySlotAvailability;
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const prisma_1 = require("../db/prisma");
/**
 * Robust slot generation engine that computes available booking slots for a host
 * considering host availability rules, date overrides, existing bookings, buffer times,
 * minimum scheduling notices, and two-way timezone conversions.
 */
async function calculateAvailableSlots(options) {
    const { hostId, eventTypeId, dateStr, hostTimezone, inviteeTimezone, duration, bufferBefore = 0, bufferAfter = 0, minNoticeMinutes = 60 } = options;
    // 1. Determine day of week in host timezone for target date
    // Construct noon in host timezone to safely find day-of-week without midnight edge shift
    const referenceHostDate = (0, date_fns_tz_1.fromZonedTime)(`${dateStr} 12:00:00`, hostTimezone);
    const dayOfWeek = (0, date_fns_1.getDay)((0, date_fns_tz_1.toZonedTime)(referenceHostDate, hostTimezone)); // 0 = Sunday, 1 = Monday ... 6 = Saturday
    // 2. Check for Date-Specific Override
    const override = await prisma_1.prisma.availabilityOverride.findFirst({
        where: {
            userId: hostId,
            date: dateStr
        }
    });
    let windowStartTimeStr = '09:00';
    let windowEndTimeStr = '17:00';
    if (override) {
        if (override.isUnavailable) {
            // Host marked themselves completely off for this specific date
            return [];
        }
        if (override.startTime && override.endTime) {
            windowStartTimeStr = override.startTime;
            windowEndTimeStr = override.endTime;
        }
    }
    else {
        // 3. Check Weekly Recurring Availability
        // First look for event-specific availability, then fallback to global user availability
        let availability = await prisma_1.prisma.availability.findFirst({
            where: {
                userId: hostId,
                eventTypeId: eventTypeId,
                dayOfWeek: dayOfWeek,
                isActive: true
            }
        });
        if (!availability) {
            availability = await prisma_1.prisma.availability.findFirst({
                where: {
                    userId: hostId,
                    eventTypeId: null,
                    dayOfWeek: dayOfWeek,
                    isActive: true
                }
            });
        }
        if (!availability || !availability.isActive) {
            // Host has no working hours configured for this day of week
            return [];
        }
        windowStartTimeStr = availability.startTime;
        windowEndTimeStr = availability.endTime;
    }
    // 4. Compute UTC boundaries for the host's working window
    const windowStartUtc = (0, date_fns_tz_1.fromZonedTime)(`${dateStr} ${windowStartTimeStr}:00`, hostTimezone);
    const windowEndUtc = (0, date_fns_tz_1.fromZonedTime)(`${dateStr} ${windowEndTimeStr}:00`, hostTimezone);
    if ((0, date_fns_1.isAfter)(windowStartUtc, windowEndUtc)) {
        // Invalid window configuration
        return [];
    }
    // 5. Query all existing active bookings for host covering the window (including buffers)
    const windowSearchStart = (0, date_fns_1.subMinutes)(windowStartUtc, 120);
    const windowSearchEnd = (0, date_fns_1.addMinutes)(windowEndUtc, 120);
    const existingBookings = await prisma_1.prisma.booking.findMany({
        where: {
            hostId: hostId,
            status: {
                in: ['CONFIRMED', 'PENDING']
            },
            // Overlap query
            startTime: { lt: windowSearchEnd },
            endTime: { gt: windowSearchStart }
        },
        include: {
            eventType: {
                select: {
                    bufferBefore: true,
                    bufferAfter: true
                }
            }
        }
    });
    // 6. Slot iteration
    const nowUtc = new Date();
    const minAllowedStartUtc = (0, date_fns_1.addMinutes)(nowUtc, minNoticeMinutes);
    const slots = [];
    // Slot step: 30 minutes if duration >= 30, else 15 minutes or duration
    const stepMinutes = duration >= 60 ? 30 : duration >= 30 ? 30 : 15;
    let currentSlotStart = new Date(windowStartUtc.getTime());
    while (true) {
        const currentSlotEnd = (0, date_fns_1.addMinutes)(currentSlotStart, duration);
        // If slot extends beyond host working hours, stop generating slots
        if ((0, date_fns_1.isAfter)(currentSlotEnd, windowEndUtc)) {
            break;
        }
        // Past time or minimum notice check
        if ((0, date_fns_1.isBefore)(currentSlotStart, minAllowedStartUtc)) {
            currentSlotStart = (0, date_fns_1.addMinutes)(currentSlotStart, stepMinutes);
            continue;
        }
        // Calculate candidate slot interval with host buffers applied
        const candidateBufferStart = (0, date_fns_1.subMinutes)(currentSlotStart, bufferBefore);
        const candidateBufferEnd = (0, date_fns_1.addMinutes)(currentSlotEnd, bufferAfter);
        // Check collision against all existing bookings (with their respective buffers)
        let hasCollision = false;
        for (const booking of existingBookings) {
            const bBufferBefore = booking.eventType?.bufferBefore || 0;
            const bBufferAfter = booking.eventType?.bufferAfter || 0;
            const bookingStartWithBuffer = (0, date_fns_1.subMinutes)(booking.startTime, bBufferBefore);
            const bookingEndWithBuffer = (0, date_fns_1.addMinutes)(booking.endTime, bBufferAfter);
            // Two intervals [A, B] and [C, D] overlap if max(A, C) < min(B, D)
            // i.e., A < D && B > C
            const overlaps = candidateBufferStart < bookingEndWithBuffer &&
                candidateBufferEnd > bookingStartWithBuffer;
            if (overlaps) {
                hasCollision = true;
                break;
            }
        }
        // If no collision, add slot formatted in both host and invitee local timezones
        if (!hasCollision) {
            slots.push({
                startTime: currentSlotStart.toISOString(),
                endTime: currentSlotEnd.toISOString(),
                hostLocalTime: (0, date_fns_tz_1.formatInTimeZone)(currentSlotStart, hostTimezone, 'h:mm a'),
                inviteeLocalTime: (0, date_fns_tz_1.formatInTimeZone)(currentSlotStart, inviteeTimezone, 'h:mm a'),
                inviteeDate: (0, date_fns_tz_1.formatInTimeZone)(currentSlotStart, inviteeTimezone, 'yyyy-MM-dd')
            });
        }
        // Increment to next slot
        currentSlotStart = (0, date_fns_1.addMinutes)(currentSlotStart, stepMinutes);
    }
    return slots;
}
/**
 * Validates if a requested slot is strictly conflict-free before booking or rescheduling.
 * Must be executed within a database transaction or with row locking to prevent race conditions.
 */
async function verifySlotAvailability(tx, hostId, startTime, endTime, bufferBefore = 0, bufferAfter = 0, excludeBookingId) {
    const bufferedStart = (0, date_fns_1.subMinutes)(startTime, bufferBefore);
    const bufferedEnd = (0, date_fns_1.addMinutes)(endTime, bufferAfter);
    const conflictingBookings = await tx.booking.findMany({
        where: {
            hostId: hostId,
            status: { in: ['CONFIRMED', 'PENDING'] },
            ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
            startTime: { lt: bufferedEnd },
            endTime: { gt: bufferedStart }
        },
        include: {
            eventType: {
                select: {
                    bufferBefore: true,
                    bufferAfter: true
                }
            }
        }
    });
    for (const b of conflictingBookings) {
        const bStart = (0, date_fns_1.subMinutes)(b.startTime, b.eventType?.bufferBefore || 0);
        const bEnd = (0, date_fns_1.addMinutes)(b.endTime, b.eventType?.bufferAfter || 0);
        if (bufferedStart < bEnd && bufferedEnd > bStart) {
            return false; // Direct collision detected
        }
    }
    return true;
}
