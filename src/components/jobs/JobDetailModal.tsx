'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Briefcase,
  Calendar,
  MapPin,
  Users,
  ShieldAlert,
  Clock,
  Wrench,
  Phone,
  RefreshCw,
  UserX,
  Trash2,
  Undo,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import Image from 'next/image';
import Avatar from '@/components/Avatar';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { calculateNormalizedHourlyWage } from '@/lib/export/csv';

interface JobDetailModalProps {
  job: any;
  onClose: () => void;
  onSuspendToggle?: (id: number, currentStatus: string) => void;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;
  actionLoading?: number | null;
  onRefresh?: () => void;
  jobDetailData?: any;
  applicationsData?: any[];
  reportsData?: any[];
}

export default function JobDetailModal({
  job,
  onClose,
  onSuspendToggle,
  onDelete,
  onRestore,
  actionLoading = null,
  onRefresh,
  jobDetailData,
  applicationsData,
  reportsData,
}: JobDetailModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'employer' | 'applications' | 'reports' | 'history'>('overview');
  const [deepDataLoading, setDeepDataLoading] = useState(false);
  const [internalJobData, setInternalJobData] = useState<any>(null);
  const [internalApplications, setInternalApplications] = useState<any[]>([]);
  const [internalReports, setInternalReports] = useState<any[]>([]);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const applications = applicationsData ?? internalApplications;
  const reports = reportsData ?? internalReports;
  const deepJobData = jobDetailData ?? internalJobData;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, lightboxImage]);

  // Fetch detailed job info (applications, reports, employerProfile)
  useEffect(() => {
    if (!job?.id) return;
    if (applicationsData !== undefined && reportsData !== undefined && jobDetailData !== undefined) return;

    let isMounted = true;
    setDeepDataLoading(true);

    adminApi
      .getJob(job.id)
      .then((res: any) => {
        if (!isMounted) return;
        const data = res?.data || {};
        if (data.job) {
          setInternalJobData(data.job);
        }
        if (Array.isArray(data.applications)) {
          setInternalApplications(data.applications);
        } else if (Array.isArray(data.job?.applications)) {
          setInternalApplications(data.job.applications);
        }
        if (Array.isArray(data.reports)) {
          setInternalReports(data.reports);
        }
      })
      .catch((_err) => {
        // Fallback gracefully to table-level data if deep fetch fails
      })
      .finally(() => {
        if (isMounted) setDeepDataLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [job?.id, applicationsData, reportsData, jobDetailData]);

  if (!mounted || !job) return null;

  // Merge table job data with deep job data if loaded
  const currentJob = deepJobData ? { ...job, ...deepJobData } : job;
  const employer = currentJob.employer || {};
  const employerProfile = employer.employer_profile || employer.employerProfile || {};

  // Formatted compensation
  const numericComp = parseFloat(currentJob.compensation) || 0;
  const formattedComp = numericComp.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const rateUnitText =
    currentJob.rate_unit === 'per_hour'
      ? 'per hour'
      : currentJob.rate_unit === 'per_project'
      ? 'per project'
      : currentJob.rate_unit === 'per_piece'
      ? 'per piece'
      : currentJob.rate_unit === 'per_day'
      ? 'per day'
      : currentJob.duration_type
      ? String(currentJob.duration_type).replace(/_/g, ' ')
      : 'per day';

  const hourlyRate = calculateNormalizedHourlyWage(
    currentJob.compensation,
    currentJob.rate_unit,
    currentJob.duration,
    currentJob.duration_unit,
    currentJob.duration_type
  );

  // Photos parsing
  let photos: string[] = [];
  if (Array.isArray(currentJob.photos)) {
    photos = currentJob.photos;
  } else if (typeof currentJob.photos === 'string' && currentJob.photos.trim() !== '') {
    try {
      const parsed = JSON.parse(currentJob.photos);
      if (Array.isArray(parsed)) photos = parsed;
    } catch {
      photos = [currentJob.photos];
    }
  }

  const reportsCount = reports.length > 0 ? reports.length : currentJob.reports_count ?? 0;
  const appsCount = applications.length > 0 ? applications.length : currentJob.applications_count ?? 0;
  const filledSlots = currentJob.filled_slots ?? currentJob.accepted_count ?? 0;
  const totalSlots = currentJob.slots ?? 1;

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="job-drawer-title"
      tabIndex={-1}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Centered Modal Card - matching UserDetailDrawer */}
      <div className="relative w-full max-w-5xl lg:w-4/5 h-[88vh] bg-white rounded-3xl shadow-2xl flex flex-col z-10 animate-fade-in border border-white/60 overflow-hidden">
        {/* Header / Top Summary */}
        <div className="p-6 bg-paper-cream border-b border-ink-faint flex flex-col gap-4 relative shrink-0">
          <div className="absolute top-6 right-6 flex items-center gap-1">
            {onRefresh && (
              <button
                onClick={() => {
                  onRefresh();
                  if (job?.id) {
                    setDeepDataLoading(true);
                    adminApi
                      .getJob(job.id, true)
                      .then((res: any) => {
                        const data = res?.data || {};
                        if (data.job) setInternalJobData(data.job);
                        if (Array.isArray(data.applications)) setInternalApplications(data.applications);
                        if (Array.isArray(data.reports)) setInternalReports(data.reports);
                      })
                      .catch(() => {})
                      .finally(() => setDeepDataLoading(false));
                  }
                }}
                className="p-2 rounded-full hover:bg-ink-faint/50 text-ink-muted hover:text-ink transition-colors cursor-pointer"
                aria-label="Refresh details"
                title="Refresh details"
              >
                <RefreshCw className={`w-5 h-5 ${deepDataLoading ? 'animate-spin text-primary' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-ink-faint/50 text-ink-muted hover:text-ink transition-colors cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
              <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div className="flex-1 min-w-0 pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold text-primary uppercase bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20">
                  {currentJob.reference_number || `#${currentJob.id}`}
                </span>
                <h2
                  id="job-drawer-title"
                  className="text-xl sm:text-2xl font-display font-bold text-ink truncate"
                  title={currentJob.title}
                >
                  {currentJob.title}
                </h2>
                {currentJob.deleted_at && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-error/15 text-status-error uppercase tracking-wider">
                    Archived / Soft Deleted
                  </span>
                )}
              </div>

              {/* Badges & Meta Row */}
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-sky text-primary-dark border border-white/50">
                  {currentJob.category || 'General'}
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    currentJob.status === 'open'
                      ? 'bg-status-success/15 text-status-success border-status-success/30'
                      : currentJob.status === 'in_progress' || currentJob.status === 'in progress'
                      ? 'bg-status-warning/15 text-status-warning border-status-warning/30'
                      : currentJob.status === 'completed'
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : currentJob.status === 'suspended'
                      ? 'bg-status-error/15 text-status-error border-status-error/30'
                      : 'bg-ink-faint/50 text-ink-soft border-ink-faint'
                  }`}
                >
                  {currentJob.status}
                </span>

                {currentJob.is_urgent && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-status-error text-white animate-pulse">
                    Urgent Hiring
                  </span>
                )}

                {reportsCount > 0 && (
                  <span className="flex items-center text-[10px] font-bold text-status-error bg-status-error/10 px-2.5 py-0.5 rounded-full border border-status-error/20 uppercase tracking-wider">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    {reportsCount} {reportsCount === 1 ? 'Report' : 'Reports'}
                  </span>
                )}

                <div className="hidden sm:flex items-center gap-2 ml-auto text-xs text-ink-muted">
                  <span>Employer:</span>
                  <span className="font-semibold text-ink truncate max-w-[140px]">
                    {employer.name || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Summary Line */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-1 text-xs sm:text-sm text-ink-soft font-body bg-white/60 p-3 rounded-2xl border border-white/70">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium">
                Brgy. {currentJob.barangay || 'N/A'}, {currentJob.municipality || 'Bulan'}
              </span>
            </div>

            <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-status-success">₱{formattedComp}</span>
              <span className="text-[11px] text-ink-muted">({rateUnitText})</span>
            </div>

            <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>≈ ₱{hourlyRate.toFixed(2)}/hr</span>
            </div>

            <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <span>
                {filledSlots} / {totalSlots} Slots Filled
              </span>
            </div>

            <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />

            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-ink-muted shrink-0" />
              <span>Posted {formatDate(currentJob.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-ink-faint px-6 mt-2 shrink-0 overflow-x-auto gap-2">
          {[
            { id: 'overview', label: 'Job Overview & Specs' },
            { id: 'employer', label: 'Employer Profile' },
            {
              id: 'applications',
              label: `Applicants & Hires (${appsCount})`,
            },
            {
              id: 'reports',
              label: `Reports (${reportsCount})`,
              badge: reportsCount > 0 ? reportsCount : null,
            },
            { id: 'history', label: 'Audit & History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 font-body font-bold text-sm border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="ml-1 px-1.5 py-0.2 bg-status-error text-white text-[10px] rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 font-body">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Job Description Card */}
              <div>
                <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                  Job Description & Scope
                </h4>
                <div className="bg-paper p-5 rounded-2xl border border-ink-faint leading-relaxed text-sm text-ink whitespace-pre-line shadow-2xs">
                  {currentJob.description || 'No detailed description provided.'}
                </div>
              </div>

              {/* Compensation & Rate Breakdown Grid */}
              <div>
                <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                  Compensation & Wage Structure
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-paper p-4 rounded-2xl border border-ink-faint">
                    <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Offered Amount
                    </span>
                    <span className="text-lg font-bold text-status-success mt-1 block">
                      ₱{formattedComp}
                    </span>
                    <span className="text-[11px] text-ink-muted">Rate basis: {rateUnitText}</span>
                  </div>

                  <div className="bg-paper p-4 rounded-2xl border border-ink-faint">
                    <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Hourly Equivalent
                    </span>
                    <span className="text-lg font-bold text-ink mt-1 block">
                      ₱{hourlyRate.toFixed(2)} / hr
                    </span>
                    <span className="text-[11px] text-ink-muted">Normalized 8hr benchmark</span>
                  </div>

                  <div className="bg-paper p-4 rounded-2xl border border-ink-faint">
                    <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Work Duration
                    </span>
                    <span className="text-lg font-bold text-ink mt-1 block">
                      {currentJob.duration
                        ? `${currentJob.duration} ${currentJob.duration_unit || 'Days'}`
                        : 'Flexible'}
                    </span>
                    <span className="text-[11px] text-ink-muted capitalize">
                      Type: {String(currentJob.duration_type || 'project').replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="bg-paper p-4 rounded-2xl border border-ink-faint">
                    <span className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Capacity & Slots
                    </span>
                    <span className="text-lg font-bold text-ink mt-1 block">
                      {filledSlots} of {totalSlots}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {Math.max(0, totalSlots - filledSlots)} openings left
                    </span>
                  </div>
                </div>
              </div>

              {/* Worksite Location & Equipment Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-paper p-5 rounded-2xl border border-ink-faint">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                      Worksite Location
                    </h4>
                  </div>
                  <p className="text-sm font-semibold text-ink">
                    Barangay {currentJob.barangay || 'N/A'}, {currentJob.municipality || 'Bulan'}, Sorsogon
                  </p>
                  {currentJob.exact_location && (
                    <p className="text-xs text-ink-soft mt-2 bg-white/80 p-3 rounded-xl border border-ink-faint/50">
                      <span className="font-semibold text-ink">Specific Address / Landmark:</span>{' '}
                      {currentJob.exact_location}
                    </p>
                  )}
                </div>

                <div className="bg-paper p-5 rounded-2xl border border-ink-faint">
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
                      Tools & Equipment Required
                    </h4>
                  </div>
                  <p className="text-sm text-ink leading-relaxed">
                    {currentJob.tools_required || 'No specific tools or equipment listed by employer.'}
                  </p>
                </div>
              </div>

              {/* Photos Gallery */}
              {photos.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                    Worksite / Job Media ({photos.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {photos.map((photoUrl, index) => (
                      <div
                        key={index}
                        onClick={() => setLightboxImage({ url: photoUrl, title: `${currentJob.title} - Photo #${index + 1}` })}
                        className="group relative h-28 rounded-xl overflow-hidden border border-ink-faint bg-paper cursor-pointer hover:shadow-md transition-all"
                      >
                        <Image
                          src={photoUrl}
                          alt={`Job photo ${index + 1}`}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-ink/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Eye className="w-5 h-5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions Panel in Overview */}
              <div className="pt-4 border-t border-ink-faint flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-ink-muted">
                  <span>Job ID: #{currentJob.id}</span>
                  <span className="mx-2">•</span>
                  <span>Reference: {currentJob.reference_number || 'N/A'}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentJob.deleted_at ? (
                    onRestore && (
                      <button
                        disabled={actionLoading === currentJob.id}
                        onClick={() => onRestore(currentJob.id)}
                        className="px-4 py-2 bg-status-success text-white text-xs font-bold rounded-xl hover:bg-status-success/90 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Undo className="w-3.5 h-3.5" />
                        Restore Job Post
                      </button>
                    )
                  ) : (
                    <>
                      {onSuspendToggle && (
                        <button
                          disabled={actionLoading === currentJob.id}
                          onClick={() => onSuspendToggle(currentJob.id, currentJob.status)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm border cursor-pointer ${
                            currentJob.status === 'suspended'
                              ? 'bg-status-success text-white hover:bg-status-success/90 border-status-success'
                              : 'bg-white border-ink-faint text-ink hover:bg-ink hover:text-white'
                          }`}
                        >
                          <UserX className="w-3.5 h-3.5" />
                          {currentJob.status === 'suspended' ? 'Unsuspend Job Post' : 'Suspend Job Post'}
                        </button>
                      )}

                      {onDelete && (
                        <button
                          disabled={actionLoading === currentJob.id}
                          onClick={() => onDelete(currentJob.id)}
                          className="px-4 py-2 bg-status-error/10 border border-status-error/20 text-status-error text-xs font-bold rounded-xl hover:bg-status-error hover:text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Soft Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMPLOYER PROFILE */}
          {activeTab === 'employer' && (
            <div className="space-y-6">
              <div className="bg-paper p-6 rounded-2xl border border-ink-faint">
                <div className="flex items-start gap-4 mb-6">
                  <Avatar name={employer.name || 'Employer'} url={employer.avatar_url} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-display font-bold text-ink">
                        {employer.name || 'Unknown Employer'}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-accent-peach text-primary-dark border border-accent-peachBright/50">
                        Employer
                      </span>
                      {employer.is_verified || employer.verification_status === 'approved' ? (
                        <span className="flex items-center text-[10px] font-bold text-status-success bg-status-success/10 px-2 py-0.5 rounded-full border border-status-success/20 uppercase">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-ink-muted bg-white px-2 py-0.5 rounded-full border border-ink-faint uppercase">
                          Unverified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{employer.email || 'No email registered'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-ink-faint">
                  <div>
                    <span className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                      Phone Contact
                    </span>
                    <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                      <Phone className="w-4 h-4 text-ink-muted" />
                      <span>{employer.phone || 'No phone number'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                      Municipality / Barangay
                    </span>
                    <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                      <MapPin className="w-4 h-4 text-ink-muted" />
                      <span>
                        Brgy. {employer.barangay || currentJob.barangay || 'N/A'},{' '}
                        {employer.municipality || currentJob.municipality || 'Bulan'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                      Member Since
                    </span>
                    <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                      <Calendar className="w-4 h-4 text-ink-muted" />
                      <span>{employer.created_at ? formatDate(employer.created_at) : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {employerProfile.description && (
                  <div className="mt-5 pt-4 border-t border-ink-faint">
                    <span className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                      Business Overview / Bio
                    </span>
                    <p className="text-sm text-ink-soft bg-white p-4 rounded-xl border border-ink-faint/60 leading-relaxed whitespace-pre-line">
                      {employerProfile.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: APPLICANTS & HIRES */}
          {activeTab === 'applications' && (
            <div className="space-y-4">
              {deepDataLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-ink-muted">
                  <RefreshCw className="w-7 h-7 animate-spin text-primary" />
                  <span className="text-xs mt-3 font-semibold">Loading applicants...</span>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-16 bg-paper rounded-2xl border border-ink-faint">
                  <div className="w-12 h-12 rounded-full bg-ink-faint/40 flex items-center justify-center mx-auto mb-3 text-ink-muted">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-ink">No Applications Yet</h4>
                  <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                    Workers haven't submitted any applications for this job posting yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-2xl border border-ink-faint shadow-2xs">
                  <table className="w-full text-left font-body table-fixed border-collapse">
                    <thead className="bg-paper border-b border-ink-faint text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3 w-[35%]">Worker Details</th>
                        <th className="px-4 py-3 w-[20%]">Status</th>
                        <th className="px-4 py-3 w-[25%]">Applied Date</th>
                        <th className="px-4 py-3 w-[20%] text-right">Proposed Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-faint/30 text-xs">
                      {applications.map((app) => {
                        const worker = app.worker || {};
                        const statusColors: Record<string, string> = {
                          pending: 'bg-status-warning/10 text-status-warning border-status-warning/20',
                          shortlisted: 'bg-accent-sky text-primary-dark border-accent-sky/30',
                          accepted: 'bg-status-success/10 text-status-success border-status-success/20',
                          employer_confirmed: 'bg-status-success/15 text-status-success border-status-success/30',
                          completed: 'bg-primary/10 text-primary border-primary/20',
                          rejected: 'bg-status-error/10 text-status-error border-status-error/20',
                          withdrawn: 'bg-ink-faint/60 text-ink-muted border-ink-faint',
                        };

                        return (
                          <tr key={app.id} className="hover:bg-paper/40 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar name={worker.name || 'Worker'} url={worker.avatar_url} size="sm" />
                                <div className="min-w-0">
                                  <div className="font-bold text-ink truncate">{worker.name || 'Unknown Worker'}</div>
                                  <div className="text-[11px] text-ink-muted truncate">{worker.email}</div>
                                  {app.cover_note && (
                                    <div className="text-[11px] text-ink-soft italic mt-0.5 line-clamp-1">
                                      "{app.cover_note}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                  statusColors[app.status] || 'bg-paper text-ink-muted border-ink-faint'
                                }`}
                              >
                                {app.status ? app.status.replace(/_/g, ' ') : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-ink-soft">
                              {app.created_at ? formatDate(app.created_at) : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-ink">
                              {app.proposed_rate || app.final_agreed_price
                                ? `₱${parseFloat(app.proposed_rate || app.final_agreed_price).toLocaleString()}`
                                : 'Default Rate'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              {deepDataLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-ink-muted">
                  <RefreshCw className="w-7 h-7 animate-spin text-primary" />
                  <span className="text-xs mt-3 font-semibold">Checking reports...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-16 bg-paper rounded-2xl border border-ink-faint">
                  <div className="w-12 h-12 rounded-full bg-status-success/10 text-status-success flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-ink">Clean Record</h4>
                  <p className="text-xs text-ink-muted mt-1 max-w-sm mx-auto">
                    No disciplinary flags or user reports have been filed against this job posting.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-paper p-4 rounded-2xl border border-status-error/20 flex flex-col sm:flex-row justify-between items-start gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-status-error/15 text-status-error border border-status-error/20">
                            {rep.type || 'Report'}
                          </span>
                          <span className="text-xs font-semibold text-ink">
                            Reported by: {rep.reporter?.name || 'Anonymous User'}
                          </span>
                          <span className="text-xs text-ink-muted">
                            • {rep.created_at ? formatDate(rep.created_at) : 'Recently'}
                          </span>
                        </div>
                        <p className="text-sm text-ink-soft mt-2 bg-white/70 p-3 rounded-xl border border-ink-faint">
                          {rep.description || 'No detailed reason provided.'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            rep.status === 'resolved'
                              ? 'bg-status-success/15 text-status-success border-status-success/30'
                              : 'bg-status-warning/15 text-status-warning border-status-warning/30'
                          }`}
                        >
                          {rep.status || 'Open'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: AUDIT & HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="bg-paper p-5 rounded-2xl border border-ink-faint space-y-4">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2">
                  Lifecycle Milestones
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-ink-faint/50">
                    <span className="block text-ink-muted font-bold uppercase tracking-wider text-[10px]">
                      Created Timestamp
                    </span>
                    <span className="font-semibold text-ink mt-1 block">
                      {currentJob.created_at ? new Date(currentJob.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-ink-faint/50">
                    <span className="block text-ink-muted font-bold uppercase tracking-wider text-[10px]">
                      Last Updated
                    </span>
                    <span className="font-semibold text-ink mt-1 block">
                      {currentJob.updated_at ? new Date(currentJob.updated_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-ink-faint/50">
                    <span className="block text-ink-muted font-bold uppercase tracking-wider text-[10px]">
                      Archived / Deleted At
                    </span>
                    <span className={`font-semibold mt-1 block ${currentJob.deleted_at ? 'text-status-error' : 'text-ink-muted'}`}>
                      {currentJob.deleted_at ? new Date(currentJob.deleted_at).toLocaleString() : 'Active (Not Deleted)'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-paper p-5 rounded-2xl border border-ink-faint text-xs text-ink-muted leading-relaxed">
                <div className="flex items-center gap-2 mb-2 font-bold text-ink text-sm">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Administrative Notes</span>
                </div>
                <p>
                  This job post is indexed under Reference #{currentJob.reference_number || currentJob.id}. Any status modification (suspending, unsuspending, or soft deletion) is immediately reflected across worker search queries and employer dashboards.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-lightbox-title"
          className="fixed inset-0 bg-black/90 z-[120] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center text-white z-10">
            <h4 id="job-lightbox-title" className="font-display text-lg font-bold tracking-wide">
              {lightboxImage.title}
            </h4>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center justify-center cursor-pointer"
              aria-label="Close image viewer"
            >
              <XCircle className="w-8 h-8" />
            </button>
          </div>

          <div className="w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center p-4">
            <Image
              src={lightboxImage.url}
              alt={lightboxImage.title}
              width={800}
              height={600}
              unoptimized
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <p className="text-white/60 text-xs font-body mt-4">
            Click anywhere outside or press Escape to close full screen view
          </p>
        </div>
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
