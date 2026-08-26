'use client';

import React from 'react';
import { X, MapPin, Calendar } from 'lucide-react';

interface JobPreviewModalProps {
  selectedJob: any;
  onClose: () => void;
}

export default function JobPreviewModal({ selectedJob, onClose }: JobPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-ink-faint flex justify-between items-center bg-paper-cream">
          <div>
            <span className="text-xs font-mono font-semibold text-primary uppercase bg-primary/10 px-2.5 py-1 rounded-md">
              {selectedJob.reference_number}
            </span>
            <h2 className="font-display text-2xl text-ink mt-2">{selectedJob.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-paper rounded-full text-ink-muted hover:text-ink transition-colors"
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
              <span>Brgy. {selectedJob.barangay}, {selectedJob.municipality}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Compensation</span>
              <span className="text-sm font-bold text-status-success mt-1 block">
                ₱{Number(selectedJob.compensation).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Slots Available</span>
              <span className="text-sm font-bold text-ink mt-1 block">
                {selectedJob.accepted_count} / {selectedJob.slots} filled
              </span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wide">Schedule Date</span>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-ink font-semibold">
              <Calendar className="w-4 h-4 text-ink-muted" />
              <span>{new Date(selectedJob.schedule_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
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
        </div>

        <div className="p-6 border-t border-ink-faint bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-ink text-white font-body font-semibold rounded-xl hover:bg-ink-soft transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
