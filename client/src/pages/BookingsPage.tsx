import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Video,
  Mail,
  User,
  MessageSquare,
  Globe,
  Loader2,
  CalendarX,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Booking } from '../types';
import { formatDateTimeInTz } from '../utils/date';
import { StatusBadge } from '../components/StatusBadge';
import { RescheduleModal } from '../components/RescheduleModal';
import { CancelModal } from '../components/CancelModal';

export const BookingsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');

  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<Booking | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['host-bookings', activeTab],
    queryFn: async () => {
      const res = await api.get('/bookings', { params: { timeframe: activeTab } });
      return res.data.bookings as Booking[];
    }
  });

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

  const tabs = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'past', label: 'Past' },
    { key: 'cancelled', label: 'Cancelled' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Appointments</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review, reschedule, or cancel all meetings booked across your event types.
        </p>

        {/* Tab Controls */}
        <div className="flex gap-2 mt-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.key
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-brand-600 mb-2" />
          <p className="text-xs">Loading {activeTab} bookings...</p>
        </div>
      ) : !bookings || bookings.length === 0 ? (
        <div className="mt-8 p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <CalendarX className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">
            No {activeTab} appointments found
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            New meetings booked by attendees will automatically show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-3.5 h-12 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: booking.eventType?.color || '#4F46E5' }}
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-slate-900">
                      {booking.inviteeName}
                    </h3>
                    <StatusBadge status={booking.status} />
                    <span className="text-xs font-semibold text-slate-500">
                      • {booking.eventType?.title} ({booking.eventType?.duration} mins)
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      {formatDateTimeInTz(booking.startTime, user?.timezone || 'UTC')}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {booking.inviteeEmail}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      Invitee Tz: {booking.inviteeTimezone}
                    </span>
                  </div>

                  {booking.inviteeNotes && (
                    <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2 max-w-xl">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{booking.inviteeNotes}</span>
                    </div>
                  )}

                  {booking.cancellationReason && (
                    <div className="mt-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-100 max-w-xl">
                      <strong>Cancellation Reason:</strong> {booking.cancellationReason}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0">
                {booking.status === 'CONFIRMED' && booking.meetingUrl && (
                  <a
                    href={booking.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm shadow-brand-500/20 flex items-center gap-1.5"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Call</span>
                  </a>
                )}

                {booking.status === 'CONFIRMED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForReschedule(booking)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reschedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingForCancel(booking)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
