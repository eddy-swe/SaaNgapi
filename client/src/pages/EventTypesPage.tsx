import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Clock,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  Trash2,
  Shield,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { EventType } from '../types';
import { EventTypeModal } from '../components/EventTypeModal';

export const EventTypesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const { data: eventTypes, isLoading } = useQuery({
    queryKey: ['host-event-types'],
    queryFn: async () => {
      const res = await api.get('/event-types');
      return res.data.eventTypes as EventType[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<EventType>) => {
      if (editingEventType) {
        return api.put(`/event-types/${editingEventType.id}`, data);
      } else {
        return api.post('/event-types', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-event-types'] });
      setIsModalOpen(false);
      setEditingEventType(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/event-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['host-event-types'] });
    }
  });

  const handleCopy = (slug: string) => {
    const url = `${window.location.origin}/${user?.username}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleToggleActive = async (event: EventType) => {
    try {
      await api.put(`/event-types/${event.id}`, { isActive: !event.isActive });
      queryClient.invalidateQueries({ queryKey: ['host-event-types'] });
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Event Types</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure your meeting lengths, buffers, pricing, and scheduling rules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingEventType(null);
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Event Type</span>
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-brand-600 mb-2" />
          <p className="text-xs">Loading event types...</p>
        </div>
      ) : !eventTypes || eventTypes.length === 0 ? (
        <div className="mt-8 p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-sm">
          <Sparkles className="w-10 h-10 text-brand-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No event types yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create your first event type (e.g. "30-Min Consultation" or "60-Min Strategy Call") to share with attendees.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingEventType(null);
              setIsModalOpen(true);
            }}
            className="mt-4 px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
          >
            Create Event Type
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {eventTypes.map((event) => {
            const publicUrl = `${window.location.origin}/${user?.username}/${event.slug}`;
            const isCopied = copiedSlug === event.slug;

            return (
              <div
                key={event.id}
                className={`bg-white rounded-3xl border p-6 shadow-sm flex flex-col justify-between transition-all ${
                  event.isActive
                    ? 'border-slate-200/80 hover:shadow-md'
                    : 'border-slate-200 bg-slate-50/50 opacity-70'
                }`}
              >
                <div>
                  {/* Top Bar with color badge & active switch */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: event.color }}
                      />
                      <span className="text-[11px] font-bold text-slate-400 font-mono">
                        /{event.slug}
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={event.isActive}
                        onChange={() => handleToggleActive(event)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-brand-600"></div>
                    </label>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900">{event.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {event.description || 'No description provided.'}
                  </p>

                  {/* Attributes Pills */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-brand-600" />
                      {event.duration} mins
                    </span>

                    {(event.bufferBefore > 0 || event.bufferAfter > 0) && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                        <Shield className="w-3 h-3 text-slate-500" />
                        +{event.bufferBefore + event.bufferAfter}m buffer
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      {event.price && event.price > 0 ? `${event.price} ${event.currency}` : 'Free'}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-5 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopy(event.slug)}
                      className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors text-xs font-bold flex items-center gap-1"
                      title="Copy Link"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Preview Booking Page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEventType(event);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      title="Edit Event Type"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete event type "${event.title}"?`)) {
                          deleteMutation.mutate(event.id);
                        }
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Event Type"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <EventTypeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingEventType}
        onSave={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
        isSaving={saveMutation.isPending}
      />
    </div>
  );
};
