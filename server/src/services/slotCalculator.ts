import { addMinutes, subMinutes, isBefore, isAfter, getDay } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { prisma } from '../db/prisma';
import { SlotResult } from '../types';

export interface GenerateSlotsOptions {
  hostId: string;
  eventTypeId: string;
  dateStr: string;          // Target date formatted as "YYYY-MM-DD"
  hostTimezone: string;     // e.g. "America/New_York"
  inviteeTimezone: string;  // e.g. "Europe/London" or "Asia/Tokyo"
  duration: number;         // in minutes (e.g. 30)
  bufferBefore?: number;    // in minutes (default 0)
  bufferAfter?: number;     // in minutes (default 0)
  minNoticeMinutes?: number;// in minutes (default 60 min)
}

/**
 * Robust slot generation engine that computes available booking slots for a host
 * considering host availability rules, date overrides, existing bookings, buffer times,
 * minimum scheduling notices, and two-way timezone conversions.
 */
export async function calculateAvailableSlots(
  options: GenerateSlotsOptions
): Promise<SlotResult[]> {
  const {
    hostId,
    eventTypeId,
    dateStr,
    hostTimezone,
    inviteeTimezone,
    duration,
    bufferBefore = 0,
    bufferAfter = 0,
    minNoticeMinutes = 60
  } = options;

  // 1. Determine day of week in host timezone for target date
  // Construct noon in host timezone to safely find day-of-week without midnight edge shift
  const referenceHostDate = fromZonedTime(`${dateStr} 12:00:00`, hostTimezone);
  const dayOfWeek = getDay(toZonedTime(referenceHostDate, hostTimezone)); // 0 = Sunday, 1 = Monday ... 6 = Saturday

  // 2. Check for Date-Specific Override
  const override = await prisma.availabilityOverride.findFirst({
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
  } else {
    // 3. Check Weekly Recurring Availability
    // First look for event-specific availability, then fallback to global user availability
    let availability = await prisma.availability.findFirst({
      where: {
        userId: hostId,
        eventTypeId: eventTypeId,
        dayOfWeek: dayOfWeek,
        isActive: true
      }
    });

    if (!availability) {
      availability = await prisma.availability.findFirst({
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
  const windowStartUtc = fromZonedTime(`${dateStr} ${windowStartTimeStr}:00`, hostTimezone);
  const windowEndUtc = fromZonedTime(`${dateStr} ${windowEndTimeStr}:00`, hostTimezone);

  if (isAfter(windowStartUtc, windowEndUtc)) {
    // Invalid window configuration
    return [];
  }

  // 5. Query all existing active bookings for host covering the window (including buffers)
  const windowSearchStart = subMinutes(windowStartUtc, 120);
  const windowSearchEnd = addMinutes(windowEndUtc, 120);

  const existingBookings = await prisma.booking.findMany({
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
  const minAllowedStartUtc = addMinutes(nowUtc, minNoticeMinutes);
  const slots: SlotResult[] = [];

  // Slot step: 30 minutes if duration >= 30, else 15 minutes or duration
  const stepMinutes = duration >= 60 ? 30 : duration >= 30 ? 30 : 15;

  let currentSlotStart = new Date(windowStartUtc.getTime());

  while (true) {
    const currentSlotEnd = addMinutes(currentSlotStart, duration);

    // If slot extends beyond host working hours, stop generating slots
    if (isAfter(currentSlotEnd, windowEndUtc)) {
      break;
    }

    // Past time or minimum notice check
    if (isBefore(currentSlotStart, minAllowedStartUtc)) {
      currentSlotStart = addMinutes(currentSlotStart, stepMinutes);
      continue;
    }

    // Calculate candidate slot interval with host buffers applied
    const candidateBufferStart = subMinutes(currentSlotStart, bufferBefore);
    const candidateBufferEnd = addMinutes(currentSlotEnd, bufferAfter);

    // Check collision against all existing bookings (with their respective buffers)
    let hasCollision = false;

    for (const booking of existingBookings) {
      const bBufferBefore = booking.eventType?.bufferBefore || 0;
      const bBufferAfter = booking.eventType?.bufferAfter || 0;

      const bookingStartWithBuffer = subMinutes(booking.startTime, bBufferBefore);
      const bookingEndWithBuffer = addMinutes(booking.endTime, bBufferAfter);

      // Two intervals [A, B] and [C, D] overlap if max(A, C) < min(B, D)
      // i.e., A < D && B > C
      const overlaps =
        candidateBufferStart < bookingEndWithBuffer &&
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
        hostLocalTime: formatInTimeZone(currentSlotStart, hostTimezone, 'h:mm a'),
        inviteeLocalTime: formatInTimeZone(currentSlotStart, inviteeTimezone, 'h:mm a'),
        inviteeDate: formatInTimeZone(currentSlotStart, inviteeTimezone, 'yyyy-MM-dd')
      });
    }

    // Increment to next slot
    currentSlotStart = addMinutes(currentSlotStart, stepMinutes);
  }

  return slots;
}

/**
 * Validates if a requested slot is strictly conflict-free before booking or rescheduling.
 * Must be executed within a database transaction or with row locking to prevent race conditions.
 */
export async function verifySlotAvailability(
  tx: any,
  hostId: string,
  startTime: Date,
  endTime: Date,
  bufferBefore: number = 0,
  bufferAfter: number = 0,
  excludeBookingId?: string
): Promise<boolean> {
  const bufferedStart = subMinutes(startTime, bufferBefore);
  const bufferedEnd = addMinutes(endTime, bufferAfter);

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
    const bStart = subMinutes(b.startTime, b.eventType?.bufferBefore || 0);
    const bEnd = addMinutes(b.endTime, b.eventType?.bufferAfter || 0);

    if (bufferedStart < bEnd && bufferedEnd > bStart) {
      return false; // Direct collision detected
    }
  }

  return true;
}
