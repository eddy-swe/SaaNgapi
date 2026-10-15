import React from 'react';
import { Clock, Check, Loader2, CalendarX } from 'lucide-react';
import { TimeSlot } from '../types';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  onConfirmSlot: (slot: TimeSlot) => void;
  isLoading: boolean;
  selectedDate: string;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  onConfirmSlot,
  isLoading,
  selectedDate
}) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Checking host availability...</p>
      </div>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-[300px] text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
        <CalendarX className="w-10 h-10 text-slate-300 mb-3" />
        <h4 className="font-semibold text-slate-700 text-sm mb-1">No Available Slots</h4>
        <p className="text-xs text-slate-500 max-w-xs">
          The host has no available times on this date. Please select another day on the calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-brand-600" />
          Available Times
        </h4>
        <span className="text-xs text-slate-500 font-medium">
          {slots.length} {slots.length === 1 ? 'slot' : 'slots'} available
        </span>
      </div>

      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {slots.map((slot) => {
          const isSelected = selectedSlot?.startTime === slot.startTime;

          return (
            <div key={slot.startTime} className="flex gap-2">
              <button
                type="button"
                onClick={() => onSelectSlot(slot)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold border transition-all text-center flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/30'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:bg-slate-50'
                }`}
              >
                <span>{slot.inviteeLocalTime}</span>
              </button>

              {isSelected && (
                <button
                  type="button"
                  onClick={() => onConfirmSlot(slot)}
                  className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5 animate-fadeIn"
                >
                  <span>Next</span>
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
