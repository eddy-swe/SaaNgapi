import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Calendar,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  CalendarOff
} from 'lucide-react';
import { api } from '../api/client';
import { Availability, AvailabilityOverride } from '../types';

const DAYS_OF_WEEK = [
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
  { index: 0, name: 'Sunday' }
];

export const AvailabilityPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Weekly hours state
  const [weeklyState, setWeeklyState] = useState<
    Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>
  >(
    DAYS_OF_WEEK.map((d) => ({
      dayOfWeek: d.index,
      startTime: '09:00',
      endTime: '17:00',
      isActive: d.index >= 1 && d.index <= 5 // Mon-Fri active by default
    }))
  );

  // New Override State
  const [overrideDate, setOverrideDate] = useState('');
  const [isUnavailable, setIsUnavailable] = useState(true);
  const [overrideStart, setOverrideStart] = useState('10:00');
  const [overrideEnd, setOverrideEnd] = useState('14:00');

  // Fetch current availability from server
  const { data, isLoading } = useQuery({
    queryKey: ['host-availability'],
    queryFn: async () => {
      const res = await api.get('/availability');
      return res.data as {
        schedules: Availability[];
        overrides: AvailabilityOverride[];
      };
    }
  });

  useEffect(() => {
    if (data?.schedules && data.schedules.length > 0) {
      const mapped = DAYS_OF_WEEK.map((d) => {
        const found = data.schedules.find((s) => s.dayOfWeek === d.index);
        return {
          dayOfWeek: d.index,
          startTime: found ? found.startTime : '09:00',
          endTime: found ? found.endTime : '17:00',
          isActive: found ? found.isActive : false
        };
      });
      setWeeklyState(mapped);
    }
  }, [data]);

  // Mutation to save weekly schedule
  const saveScheduleMutation = useMutation({
    mutationFn: async () => {
      return api.put('/availability', { schedules: weeklyState });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-availability'] });
      setSuccessBanner('Weekly working hours saved successfully!');
      setTimeout(() => setSuccessBanner(null), 3000);
    }
  });

  // Mutation to add override
  const addOverrideMutation = useMutation({
    mutationFn: async () => {
      return api.post('/availability/override', {
        date: overrideDate,
        startTime: isUnavailable ? null : overrideStart,
        endTime: isUnavailable ? null : overrideEnd,
        isUnavailable
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-availability'] });
      setOverrideDate('');
    }
  });

  // Mutation to delete override
  const deleteOverrideMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/availability/override/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-availability'] });
    }
  });

  const handleDayToggle = (dayOfWeek: number) => {
    setWeeklyState((prev) =>
      prev.map((item) =>
        item.dayOfWeek === dayOfWeek ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  const handleTimeChange = (
    dayOfWeek: number,
    field: 'startTime' | 'endTime',
    val: string
  ) => {
    setWeeklyState((prev) =>
      prev.map((item) =>
        item.dayOfWeek === dayOfWeek ? { ...item, [field]: val } : item
      )
    );
  };

  const handleCopyHoursToAll = (fromDay: number) => {
    const source = weeklyState.find((w) => w.dayOfWeek === fromDay);
    if (!source) return;

    setWeeklyState((prev) =>
      prev.map((item) =>
        item.isActive
          ? { ...item, startTime: source.startTime, endTime: source.endTime }
          : item
      )
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Availability</h1>
          <p className="text-xs text-slate-500 mt-1">
            Set your recurring weekly working hours and manage date-specific exceptions or holidays.
          </p>
        </div>

        <button
          type="button"
          onClick={() => saveScheduleMutation.mutate()}
          disabled={saveScheduleMutation.isPending}
          className="px-6 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all self-start sm:self-auto disabled:opacity-50"
        >
          {saveScheduleMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Save Changes</span>
        </button>
      </div>

      {successBanner && (
        <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-brand-600 mb-2" />
          <p className="text-xs">Loading availability settings...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Left 2 Cols: Weekly Recurring Schedule */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" />
                  Weekly Recurring Hours
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The standard hours each day during which you can receive bookings.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 space-y-2">
              {DAYS_OF_WEEK.map((d) => {
                const dayConfig = weeklyState.find((w) => w.dayOfWeek === d.index) || {
                  dayOfWeek: d.index,
                  startTime: '09:00',
                  endTime: '17:00',
                  isActive: false
                };

                return (
                  <div
                    key={d.index}
                    className="pt-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Day name & toggle */}
                    <div className="flex items-center gap-3 w-36">
                      <input
                        type="checkbox"
                        id={`day-${d.index}`}
                        checked={dayConfig.isActive}
                        onChange={() => handleDayToggle(d.index)}
                        className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
                      />
                      <label
                        htmlFor={`day-${d.index}`}
                        className={`text-sm font-bold cursor-pointer ${
                          dayConfig.isActive ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {d.name}
                      </label>
                    </div>

                    {/* Hours input or Unavailable pill */}
                    {dayConfig.isActive ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={dayConfig.startTime}
                          onChange={(e) =>
                            handleTimeChange(d.index, 'startTime', e.target.value)
                          }
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <span className="text-xs text-slate-400 font-bold">-</span>
                        <input
                          type="time"
                          value={dayConfig.endTime}
                          onChange={(e) =>
                            handleTimeChange(d.index, 'endTime', e.target.value)
                          }
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />

                        <button
                          type="button"
                          onClick={() => handleCopyHoursToAll(d.index)}
                          title="Copy these hours to all active days"
                          className="text-[11px] font-semibold text-slate-500 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          Apply to all
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        Unavailable
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Date-Specific Overrides / Holidays */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
                <CalendarOff className="w-4 h-4 text-brand-600" />
                Date Overrides
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Add specific dates when you are off or have non-standard hours.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!overrideDate) return;
                  addOverrideMutation.mutate();
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Date
                  </label>
                  <input
                    type="date"
                    required
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is-off"
                    checked={isUnavailable}
                    onChange={(e) => setIsUnavailable(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded border-slate-300"
                  />
                  <label htmlFor="is-off" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Unavailable all day (Take day off)
                  </label>
                </div>

                {!isUnavailable && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Start
                      </label>
                      <input
                        type="time"
                        value={overrideStart}
                        onChange={(e) => setOverrideStart(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        End
                      </label>
                      <input
                        type="time"
                        value={overrideEnd}
                        onChange={(e) => setOverrideEnd(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!overrideDate || addOverrideMutation.isPending}
                  className="w-full mt-2 py-2.5 rounded-xl font-bold text-xs text-white bg-slate-800 hover:bg-slate-900 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Date Override</span>
                </button>
              </form>
            </div>

            {/* Existing Overrides List */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Configured Overrides ({data?.overrides?.length || 0})
              </h4>

              {!data?.overrides || data.overrides.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No date overrides set.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {data.overrides.map((ov) => (
                    <div
                      key={ov.id}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{ov.date}</p>
                        <p className="text-[11px] text-slate-500">
                          {ov.isUnavailable
                            ? 'Unavailable all day'
                            : `${ov.startTime} - ${ov.endTime}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteOverrideMutation.mutate(ov.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete override"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
