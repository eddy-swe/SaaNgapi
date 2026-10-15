import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  Download,
  Mail,
  User,
  Globe,
  Loader2,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { api } from '../api/client';
import { Booking } from '../types';
import { formatDateTimeInTz, downloadIcsFile } from '../utils/date';

export const BookingConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['public-booking', id],
    queryFn: async () => {
      const res = await api.get(`/public/booking/${id}`);
      return res.data.booking as Booking;
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-slate-800">Booking Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">This appointment confirmation could not be loaded.</p>
        </div>
      </div>
    );
  }

  const handleDownloadIcs = () => {
    const formatIcs = (d: string) =>
      new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SaaNgapi//EN',
      'BEGIN:VEVENT',
      `UID:${booking.id}@saangapi.com`,
      `DTSTAMP:${formatIcs(new Date().toISOString())}`,
      `DTSTART:${formatIcs(booking.startTime)}`,
      `DTEND:${formatIcs(booking.endTime)}`,
      `SUMMARY:${booking.eventType?.title} with ${booking.host?.name}`,
      `DESCRIPTION:Booking ID: ${booking.id}\\nMeeting link: ${booking.meetingUrl || 'TBD'}`,
      booking.meetingUrl ? `LOCATION:${booking.meetingUrl}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    downloadIcsFile(`appointment-${booking.id.slice(0, 8)}.ics`, icsContent);
  };

  const handleCancelBooking = async () => {
    setIsCancelling(true);
    try {
      await api.post(`/public/booking/${booking.id}/cancel`, {
        reason: cancelReason || 'Cancelled by invitee'
      });
      queryClient.invalidateQueries({ queryKey: ['public-booking', id] });
      setShowCancelPrompt(false);
    } catch (err) {
      console.error('Failed to cancel:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-8 sm:p-10 text-center animate-in fade-in">
        {/* Top Status Icon */}
        {isCancelled ? (
          <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-emerald-50 animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>
        )}

        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {isCancelled ? 'Appointment Cancelled' : 'Appointment Confirmed!'}
        </h1>

        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          {isCancelled
            ? 'This meeting has been cancelled and removed from the active calendar.'
            : `A calendar invitation has been sent to ${booking.inviteeEmail}.`}
        </p>

        {/* Appointment Card */}
        <div className="mt-8 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-left space-y-3.5">
          <div className="border-b border-slate-200/70 pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600">
                Scheduled Event
              </span>
              <h3 className="font-extrabold text-base text-slate-900">
                {booking.eventType?.title}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              {booking.eventType?.duration} mins
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700">
            <User className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              <strong>Host:</strong> {booking.host?.name}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-700">
            <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              <strong>Date & Time:</strong>{' '}
              {formatDateTimeInTz(booking.startTime, booking.inviteeTimezone)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <Globe className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-[11px]">Timezone: {booking.inviteeTimezone}</span>
          </div>

          {booking.meetingUrl && !isCancelled && (
            <div className="pt-2 border-t border-slate-200/70">
              <a
                href={booking.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <Video className="w-4 h-4" />
                <span>Join Video Meeting</span>
              </a>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isCancelled && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleDownloadIcs}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-300 shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Add to Calendar (.ics)</span>
            </button>

            {!showCancelPrompt ? (
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                className="text-xs font-semibold text-rose-600 hover:underline py-2 px-3"
              >
                Cancel or Reschedule
              </button>
            ) : null}
          </div>
        )}

        {/* Cancel Prompt Inline */}
        {showCancelPrompt && !isCancelled && (
          <div className="mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left animate-in fade-in">
            <h4 className="text-xs font-bold text-rose-800 mb-1">Cancel this appointment?</h4>
            <input
              type="text"
              placeholder="Reason (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-rose-300 text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelPrompt(false)}
                className="text-xs font-semibold text-slate-600 hover:bg-slate-200/60 px-3 py-1.5 rounded-lg"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCancelling && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <Link
            to={`/${booking.host?.username}`}
            className="text-xs font-bold text-brand-600 hover:underline"
          >
            ← Return to Host's Main Page
          </Link>
        </div>
      </div>
    </div>
  );
};
