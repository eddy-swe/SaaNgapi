import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Video,
  Copy,
  Check,
  ExternalLink,
  Plus,
  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Booking, EventType } from '../types';
import { formatDateTimeInTz } from '../utils/date';
import { StatusBadge } from '../components/StatusBadge';
import { RescheduleModal } from '../components/RescheduleModal';
import { CancelModal } from '../components/CancelModal';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<Booking | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch upcoming bookings
  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['host-bookings', 'upcoming'],
    queryFn: async () => {
      const res = await api.get('/bookings', { params: { timeframe: 'upcoming' } });
      return res.data.bookings as Booking[];
    }
  });

  // Fetch event types count
  const { data: eventTypesData } = useQuery({
    queryKey: ['host-event-types'],
    queryFn: async () => {
      const res = await api.get('/event-types');
      return res.data.eventTypes as EventType[];
    }
  });

  const upcomingBookings = bookingsData || [];
  const eventTypes = eventTypesData || [];
  const nextAppointment = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

  const publicProfileUrl = `${window.location.origin}/${user?.username}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicProfileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!selectedBookingForCancel) return;
    setIsCancelling(true);
    try {
      await api.post(`/bookings/${selectedBookingForCancel.id}/cancel`, { reason });
      queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
      setSelectedBookingForCancel(null);
    } catch (err) {
      console.error('Failed to cancel:', err);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Host Dashboard • Default timezone: <span className="font-semibold text-slate-700">{user?.timezone}</span>
          </p>
        </div>

        {/* Public Link Share Bar */}
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-xs font-mono">
            {publicProfileUrl}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Copy Public Link"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
          <a
            href={publicProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Open Public Page"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Upcoming Bookings
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {upcomingBookings.length}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Event Types
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {eventTypes.filter((e) => e.isActive).length}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Weekly Availability
            </p>
            <Link
              to="/dashboard/availability"
              className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1 mt-1.5"
            >
              <span>Manage Working Hours</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Spotlight: Next Upcoming Appointment */}
      {nextAppointment && (
        <div className="mt-8 bg-gradient-to-r from-brand-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-200 text-xs font-semibold mb-2 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next Scheduled Meeting</span>
              </div>
              <h3 className="text-xl font-black tracking-tight">
                {nextAppointment.eventType?.title} with {nextAppointment.inviteeName}
              </h3>
              <p className="text-xs text-brand-200 mt-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {formatDateTimeInTz(nextAppointment.startTime, user?.timezone || 'UTC')} (Your Time)
                </span>
                <span>•</span>
                <span>Attendee Email: {nextAppointment.inviteeEmail}</span>
              </p>
            </div>

            {nextAppointment.meetingUrl && (
              <a
                href={nextAppointment.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-2xl bg-white text-brand-900 font-extrabold text-xs shadow-md hover:bg-brand-50 transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                <Video className="w-4 h-4 text-brand-600" />
                <span>Launch Video Meeting Room</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Bookings Table Section */}
      <div className="mt-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upcoming Appointments</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirmed appointments awaiting your scheduled meeting time.
            </p>
          </div>
          <Link
            to="/dashboard/bookings"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1"
          >
            <span>View All Bookings</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoadingBookings ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
            <p className="text-xs">Loading appointments...</p>
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No upcoming appointments</p>
            <p className="text-xs text-slate-400 mt-1">
              Share your booking link to allow invitees to book time on your calendar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {upcomingBookings.slice(0, 5).map((b) => (
              <div
                key={b.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-3 h-10 rounded-full mt-0.5 shrink-0"
                    style={{ backgroundColor: b.eventType?.color || '#4F46E5' }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900">{b.inviteeName}</h4>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5">
                      {b.eventType?.title} ({b.eventType?.duration} mins)
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateTimeInTz(b.startTime, user?.timezone || 'UTC')}</span>
                      <span className="text-slate-300">•</span>
                      <span>Attendee Tz: {b.inviteeTimezone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  {b.meetingUrl && (
                    <a
                      href={b.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-brand-600 hover:bg-brand-50 rounded-xl text-xs font-bold flex items-center gap-1"
                      title="Open Meeting Link"
                    >
                      <Video className="w-4 h-4" />
                      <span className="hidden sm:inline">Join</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedBookingForReschedule(b)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBookingForCancel(b)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={!!selectedBookingForReschedule}
        onClose={() => setSelectedBookingForReschedule(null)}
        booking={selectedBookingForReschedule}
        onRescheduleSuccess={() => queryClient.invalidateQueries({ queryKey: ['host-bookings'] })}
      />

      {/* Cancel Modal */}
      <CancelModal
        isOpen={!!selectedBookingForCancel}
        onClose={() => setSelectedBookingForCancel(null)}
        booking={selectedBookingForCancel}
        onConfirm={handleConfirmCancel}
        isCancelling={isCancelling}
      />
    </div>
  );
};
