import React, { useState } from 'react';
import { format, startOfToday } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { X, Calendar as CalendarIcon, Clock, Loader2, AlertCircle } from 'lucide-react';
import { Booking, TimeSlot } from '../types';
import { CalendarPicker } from './CalendarPicker';
import { TimeSlotPicker } from './TimeSlotPicker';
import { api } from '../api/client';
import { getLocalTimezone } from '../utils/timezones';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onRescheduleSuccess: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  booking,
  onRescheduleSuccess
}) => {
  const todayStr = format(startOfToday(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timezone = getLocalTimezone();

  // Fetch slots for selected date
  const { data: slotData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['reschedule-slots', booking?.eventType?.slug, booking?.host?.username, selectedDate, timezone],
    queryFn: async () => {
      if (!booking?.host?.username || !booking?.eventType?.slug) return null;
      const res = await api.get(
        `/public/${booking.host.username}/${booking.eventType.slug}/slots`,
        { params: { date: selectedDate, timezone } }
      );
      return res.data;
    },
    enabled: isOpen && !!booking?.host?.username && !!booking?.eventType?.slug && !!selectedDate
  });

  if (!isOpen || !booking) return null;

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.post(`/bookings/${booking.id}/reschedule`, {
        newStartTime: selectedSlot.startTime,
        newEndTime: selectedSlot.endTime
      });

      onRescheduleSuccess();
      onClose();
    } catch (err: any) {
      console.error('Reschedule failure:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to reschedule. The slot may have been taken.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
              Reschedule Appointment
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {booking.eventType?.title} with {booking.inviteeName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
          {/* Calendar on left */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-brand-600" />
              Pick New Date
            </h4>
            <CalendarPicker
              selectedDate={selectedDate}
              onSelectDate={(d) => {
                setSelectedDate(d);
                setSelectedSlot(null);
              }}
            />
          </div>

          {/* Slots on right */}
          <div>
            <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-brand-600" />
              Pick New Time Slot
            </h4>
            <TimeSlotPicker
              slots={slotData?.slots || []}
              selectedSlot={selectedSlot}
              onSelectSlot={(s) => setSelectedSlot(s)}
              onConfirmSlot={handleConfirmReschedule}
              isLoading={isLoadingSlots}
              selectedDate={selectedDate}
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            {selectedSlot ? (
              <span className="font-semibold text-brand-700">
                Selected: {selectedDate} at {selectedSlot.inviteeLocalTime}
              </span>
            ) : (
              <span>Select a time slot to proceed</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={!selectedSlot || isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm shadow-brand-500/20 disabled:opacity-40 flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm New Time</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
