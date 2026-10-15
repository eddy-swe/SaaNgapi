export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'HOST' | 'INVITEE' | 'ADMIN';
  timezone: string;
  bio?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface EventType {
  id: string;
  userId: string;
  title: string;
  slug: string;
  description?: string | null;
  duration: number; // in minutes
  bufferBefore: number;
  bufferAfter: number;
  price?: number | null;
  currency: string;
  color: string;
  isActive: boolean;
  customQuestions?: string | null;
  createdAt: string;
  _count?: {
    bookings: number;
  };
}

export interface Availability {
  id: string;
  userId: string;
  eventTypeId?: string | null;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  isActive: boolean;
}

export interface AvailabilityOverride {
  id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  startTime?: string | null;
  endTime?: string | null;
  isUnavailable: boolean;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULED';

export interface Booking {
  id: string;
  eventTypeId: string;
  hostId: string;
  inviteeName: string;
  inviteeEmail: string;
  inviteeTimezone: string;
  inviteeNotes?: string | null;
  customAnswers?: string | null;
  startTime: string; // ISO
  endTime: string;   // ISO
  status: BookingStatus;
  cancellationReason?: string | null;
  meetingUrl?: string | null;
  createdAt: string;
  eventType: EventType;
  host?: {
    name: string;
    email: string;
    username: string;
    timezone: string;
  };
}

export interface TimeSlot {
  startTime: string; // UTC ISO string
  endTime: string;   // UTC ISO string
  hostLocalTime: string;
  inviteeLocalTime: string;
  inviteeDate: string;
}
