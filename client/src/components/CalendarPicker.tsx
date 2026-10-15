import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfToday
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarPickerProps {
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate,
  onSelectDate
}) => {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    return selectedDate ? new Date(selectedDate) : today;
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => {
    // Only allow navigating back if currentMonth > today
    if (!isBefore(monthStart, today)) {
      setCurrentMonth(subMonths(currentMonth, 1));
    }
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const canGoPrev = !isBefore(monthStart, today);

  const weekHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-base">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            disabled={!canGoPrev}
            aria-label="Previous Month"
            className={`p-1.5 rounded-lg border border-slate-200 transition-colors ${
              canGoPrev
                ? 'text-slate-700 hover:bg-slate-100'
                : 'text-slate-300 border-slate-100 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next Month"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {weekHeaders.map((day) => (
          <div key={day} className="text-xs font-semibold text-slate-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const formattedDate = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate === formattedDate;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isPast = isBefore(day, today);
          const isCurrentDay = isSameDay(day, today);

          if (!isCurrentMonth) {
            return (
              <div
                key={day.toISOString()}
                className="h-10 flex items-center justify-center text-xs text-slate-300"
              >
                {format(day, 'd')}
              </div>
            );
          }

          if (isPast) {
            return (
              <div
                key={day.toISOString()}
                className="h-10 flex items-center justify-center text-xs text-slate-300 cursor-not-allowed"
              >
                {format(day, 'd')}
              </div>
            );
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(formattedDate)}
              className={`h-10 w-full rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all relative ${
                isSelected
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30'
                  : 'text-slate-700 hover:bg-brand-50 hover:text-brand-700'
              } ${isCurrentDay && !isSelected ? 'border border-brand-300 text-brand-600' : ''}`}
            >
              <span>{format(day, 'd')}</span>
              {isCurrentDay && !isSelected && (
                <span className="w-1 h-1 bg-brand-600 rounded-full mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
