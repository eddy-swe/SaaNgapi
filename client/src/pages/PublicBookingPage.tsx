import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfToday } from 'date-fns';
import {
  Clock,
  Globe,
  Calendar as CalendarIcon,
  DollarSign,
  ArrowLeft,
  Loader2,
  CalendarX,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import { EventType, User, TimeSlot } from '../types';
import { CalendarPicker } from '../components/CalendarPicker';
import { TimeSlotPicker } from '../components/TimeSlotPicker';
import { BookingFormModal } from '../components/BookingFormModal';
import { getLocalTimezone, COMMON_TIMEZONES } from '../utils/timezones';

export const PublicBookingPage: React.FC = () => {
  const { username, eventSlug } = useParams<{ username: string; eventSlug?: string }>();
  const navigate = useNavigate();

  const todayStr = format(startOfToday(), 'yyyy-MM-dd');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>(getLocalTimezone());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If viewing host profile without eventSlug (e.g. /alex)
  const isProfileOnly = !eventSlug;

  const { data: hostData, isLoading: isLoadingHost } = useQuery({
    queryKey: ['public-host', username],
    queryFn: async () => {
      const res = await api.get(`/public/${username}`);
      return res.data.host as User & { eventTypes: EventType[] };
    },
    enabled: !!username
  });

  // If viewing specific event
  const { data: eventData, isLoading: isLoadingEvent } = useQuery({
    queryKey: ['public-event', username, eventSlug],
    queryFn: async () => {
      const res = await api.get(`/public/${username}/${eventSlug}`);
      return res.data as { host: User; eventType: EventType };
    },
    enabled: !!username && !!eventSlug
  });

  // Query available slots for selected date & timezone
  const { data: slotsData, isLoading: isLoadingSlots } = useQuery({
    queryKey: ['public-slots', username, eventSlug, selectedDate, selectedTimezone],
    queryFn: async () => {
      const res = await api.get(`/public/${username}/${eventSlug}/slots`, {
        params: {
          date: selectedDate,
          timezone: selectedTimezone
        }
      });
      return res.data.slots as TimeSlot[];
    },
    enabled: !!username && !!eventSlug && !!selectedDate
  });

  if (isLoadingHost || (eventSlug && isLoadingEvent)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading booking page...</p>
        </div>
      </div>
    );
  }

  // View: Host Profile Overview (all event types)
  if (isProfileOnly) {
    if (!hostData) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-800">Host Not Found</h2>
            <p className="text-xs text-slate-500 mt-1">The user @{username} does not exist.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Host Header */}
          <div className="text-center mb-8">
            {hostData.avatarUrl ? (
              <img
                src={hostData.avatarUrl}
                alt={hostData.name}
                className="w-20 h-20 rounded-full mx-auto object-cover ring-4 ring-white shadow-md mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-brand-600 text-white text-2xl font-black flex items-center justify-center mx-auto shadow-md mb-3">
                {hostData.name.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{hostData.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">@{hostData.username}</p>
            {hostData.bio && (
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-2.5 leading-relaxed">
                {hostData.bio}
              </p>
            )}
          </div>

          {/* Event Types List */}
          <div className="space-y-3">
            {hostData.eventTypes?.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <CalendarX className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No active event types</p>
              </div>
            ) : (
              hostData.eventTypes?.map((et) => (
                <Link
                  key={et.id}
                  to={`/${hostData.username}/${et.slug}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-brand-500 hover:shadow-md transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="w-3.5 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: et.color }}
                    />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-brand-600 transition-colors">
                        {et.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {et.description || 'Schedule a meeting'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-brand-600" />
                          {et.duration}m
                        </span>
                        <span>•</span>
                        <span>{et.price && et.price > 0 ? `$${et.price}` : 'Free'}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // View: Public Booking View for specific event
  const host = eventData?.host;
  const eventType = eventData?.eventType;

  if (!host || !eventType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">Event Not Available</h2>
          <p className="text-xs text-slate-500 mt-1">This scheduling link is inactive or does not exist.</p>
        </div>
      </div>
    );
  }

  const handleBookingSubmit = async (formData: {
    inviteeName: string;
    inviteeEmail: string;
    inviteeNotes?: string;
  }) => {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post(`/public/${username}/${eventSlug}/book`, {
        ...formData,
        inviteeTimezone: selectedTimezone,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime
      });

      if (res.data.success) {
        setIsModalOpen(false);
        navigate(`/booking/confirmed/${res.data.booking.id}`);
      }
    } catch (err: any) {
      console.error('Booking attempt error:', err);
      setErrorMessage(
        err.response?.data?.message || 'Could not complete booking. Please choose another slot.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-5xl w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Host Details & Event Specs (4 Cols) */}
          <div className="lg:col-span-4 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-between bg-slate-50/50">
            <div>
              <Link
                to={`/${username}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors mb-6"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Event Types</span>
              </Link>

              {/* Host pill */}
              <div className="flex items-center gap-3 mb-4">
                {host.avatarUrl ? (
                  <img
                    src={host.avatarUrl}
                    alt={host.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-brand-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-600 text-white font-black text-base flex items-center justify-center">
                    {host.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                    {host.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">@{host.username}</p>
                </div>
              </div>

              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                {eventType.title}
              </h1>

              {eventType.description && (
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  {eventType.description}
                </p>
              )}

              <div className="space-y-2.5 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-600" />
                  <span>{eventType.duration} minutes</span>
                </div>
                {eventType.price && eventType.price > 0 ? (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>
                      {eventType.price} {eventType.currency}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Timezone Switcher Dropdown */}
            <div className="mt-8 pt-6 border-t border-slate-200/80">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-brand-600" />
                Your Timezone
              </label>
              <select
                value={selectedTimezone}
                onChange={(e) => setSelectedTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label} ({tz.value})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Times will automatically display in this timezone.
              </p>
            </div>
          </div>

          {/* Middle Column: Interactive Calendar (4 Cols) */}
          <div className="lg:col-span-4 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col justify-start">
            <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-brand-600" />
              Select Date
            </h3>
            <CalendarPicker
              selectedDate={selectedDate}
              onSelectDate={(dateStr) => {
                setSelectedDate(dateStr);
                setSelectedSlot(null);
              }}
            />
          </div>

          {/* Right Column: Time Slots (4 Cols) */}
          <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col justify-start">
            <TimeSlotPicker
              slots={slotsData || []}
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
              onConfirmSlot={() => setIsModalOpen(true)}
              isLoading={isLoadingSlots}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>

      {/* Booking Form Modal */}
      <BookingFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBookingSubmit}
        slot={selectedSlot}
        eventType={eventType}
        hostName={host.name}
        timezone={selectedTimezone}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />
    </div>
  );
};
