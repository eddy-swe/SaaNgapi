import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  email: string;
  role: 'HOST' | 'INVITEE' | 'ADMIN';
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface CustomQuestion {
  id: string;
  label: string;
  required: boolean;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  options?: string[]; // For select type
}

export interface SlotResult {
  startTime: string; // ISO UTC string
  endTime: string;   // ISO UTC string
  hostLocalTime: string;    // e.g. "09:00 AM"
  inviteeLocalTime: string; // e.g. "02:00 PM"
  inviteeDate: string;      // e.g. "2026-10-20"
}
