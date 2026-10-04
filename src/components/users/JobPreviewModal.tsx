'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Calendar, Eye, XCircle } from 'lucide-react';

interface JobPreviewModalProps {
  selectedJob: any;
  onClose: () => void;
}

export default function JobPreviewModal({ selectedJob, onClose }: JobPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<{
    type: 'image' | 'video';
    url: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxMedia) {
          setLightboxMedia(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, lightboxMedia]);

  if (!selectedJob || !mounted) return null;

  // Photos & Media parsing
  const rawPhotos =
    selectedJob.photos || selectedJob.worksite_photos || selectedJob.images || selectedJob.job_photos || [];
  let photos: string[] = [];
  if (Array.isArray(rawPhotos)) {
    photos = rawPhotos
      .map((p: any) => (typeof p === 'string' ? p : p?.url || p?.uri || ''))
      .filter((url: string) => typeof url === 'string' && url.trim().length > 0);
  } else if (typeof rawPhotos === 'string' && rawPhotos.trim() !== '') {
    try {
      const parsed = JSON.parse(rawPhotos);
      if (Array.isArray(parsed)) {
        photos = parsed
          .map((p: any) => (typeof p === 'string' ? p : p?.url || p?.uri || ''))
          .filter((url: string) => typeof url === 'string' && url.trim().length > 0);
      } else if (typeof parsed === 'string' && parsed.trim().length > 0) {
        photos = [parsed.trim()];
      }
    } catch {
      photos = [rawPhotos.trim()];
    }
  }

  if (photos.length === 0 && selectedJob.image_url && typeof selectedJob.image_url === 'string') {
    photos = [selectedJob.image_url.trim()];
  }

  const videoUrl =
    typeof selectedJob.video_url === 'string' && selectedJob.video_url.trim().length > 0
      ? selectedJob.video_url.trim()
      : typeof selectedJob.video === 'string' && selectedJob.video.trim().length > 0
      ? selectedJob.video.trim()
      : null;

  const hasMedia = photos.length > 0 || !!videoUrl;

  const modalContent = (
    <div
      className="fixed inset-0 bg-ink/50 z-[110] flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Job Preview"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-paper-cream">
          <div>
            <span className="text-xs font-mono font-semibold text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-md">
              {selectedJob.reference_number || `#${selectedJob.id}`}
            </span>
            <h2 className="font-display text-2xl text-ink mt-2">{selectedJob.title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close job preview"
            className="p-2 hover:bg-paper rounded-full text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto font-body space-y-4">
          <div>
            <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Category</span>
            <span className="text-sm font-medium text-ink bg-paper px-3 py-1.5 rounded-lg border border-ink-faint inline-block mt-1">
              {selectedJob.category || 'N/A'}
            </span>
          </div>

          <div>
            <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Location (Privacy Protected)</span>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-ink font-semibold">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Brgy. {selectedJob.barangay || 'N/A'}, {selectedJob.municipality || 'Bulan'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Compensation</span>
              <span className="text-sm font-bold text-status-success mt-1 block">
                ₱{(Number(selectedJob.compensation) || 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Slots Available</span>
              <span className="text-sm font-bold text-ink mt-1 block">
                {(selectedJob.filled_slots ?? selectedJob.accepted_count) ?? 0} / {selectedJob.slots ?? 1} filled
              </span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Schedule Date</span>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-ink font-semibold">
              <Calendar className="w-4 h-4 text-ink-muted" />
              <span>{selectedJob.schedule_date ? new Date(selectedJob.schedule_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Description</span>
            <p className="text-sm text-ink-soft leading-relaxed mt-1 whitespace-pre-line bg-paper p-4 rounded-2xl border border-ink-faint">
              {selectedJob.description}
            </p>
          </div>

          {selectedJob.tools_required && (
            <div>
              <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Tools Required</span>
              <p className="text-sm text-ink-soft mt-1 bg-paper p-4 rounded-2xl border border-ink-faint">
                {selectedJob.tools_required}
              </p>
            </div>
          )}

          {/* Worksite / Job Media Section */}
          {hasMedia && (
            <div>
              <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
                Worksite & Media Attachments ({photos.length + (videoUrl ? 1 : 0)})
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {photos.map((photoUrl, index) => (
                  <div
                    key={index}
                    onClick={() =>
                      setLightboxMedia({
                        type: 'image',
                        url: photoUrl,
                        title: `${selectedJob.title} - Photo #${index + 1}`,
                      })
                    }
                    className="group relative h-24 rounded-xl overflow-hidden border border-ink-faint bg-paper cursor-pointer hover:shadow-md transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt={`Worksite photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                      }}
                    />
                    <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="w-5 h-5" />
                    </div>
                  </div>
                ))}

                {videoUrl && (
                  <div
                    onClick={() =>
                      setLightboxMedia({
                        type: 'video',
                        url: videoUrl,
                        title: `${selectedJob.title} - Worksite Video`,
                      })
                    }
                    className="group relative h-24 rounded-xl overflow-hidden border border-primary/30 bg-ink text-white cursor-pointer hover:shadow-md transition-all flex flex-col items-center justify-center p-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/80 group-hover:bg-primary flex items-center justify-center text-white transition-transform group-hover:scale-110 mb-1">
                      <Eye className="w-4 h-4 ml-0.5" />
                    </div>
                    <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">
                      Play Video
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-ink-faint bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-ink text-white font-body font-semibold rounded-xl hover:bg-ink-soft transition-colors cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/90 z-[130] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center text-white z-10">
            <h4 className="font-display text-base font-bold tracking-wide truncate max-w-md">
              {lightboxMedia.title}
            </h4>
            <div className="flex items-center gap-3">
              <a
                href={lightboxMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-white/80 hover:text-white underline px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Open Original ↗
              </a>
              <button
                onClick={() => setLightboxMedia(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center justify-center cursor-pointer"
                aria-label="Close media viewer"
              >
                <XCircle className="w-7 h-7" />
              </button>
            </div>
          </div>

          <div className="w-full h-full max-w-4xl max-h-[75vh] flex items-center justify-center p-4">
            {lightboxMedia.type === 'video' ? (
              <video
                src={lightboxMedia.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={lightboxMedia.url}
                alt={lightboxMedia.title}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
