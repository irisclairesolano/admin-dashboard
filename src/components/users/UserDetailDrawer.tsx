'use client';
import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle, MapPin, Star, RefreshCw, Mail, Phone, Calendar, UserX, Undo, Trash2, Search, FileText, FileDown, ExternalLink, Briefcase, Users, Award, ShieldCheck, Clock, Lock, Key, Eye, XCircle } from 'lucide-react';
import Avatar from '@/components/Avatar';
import Image from 'next/image';
import { User } from '@/types/models';
import { formatBirthDate } from '@/lib/date';

interface UserDetailDrawerProps {
  selectedDetailUser: User;
  onClose: () => void;
  userDetailData?: any;
  detailLoading?: boolean;
  activeTab?: 'profile' | 'activity' | 'reviews' | 'reports' | 'logs';
  setActiveTab?: (tab: 'profile' | 'activity' | 'reviews' | 'reports' | 'logs') => void;
  actionLoading?: number | null;
  onVerify?: () => void;
  onSuspend?: (id: number, isSuspended: boolean) => void;
  onDelete?: (id: number) => void;
  onRestore?: (id: number) => void;

  // Tab 2 (Activity/History) props
  employerSubTab?: 'posts' | 'hired';
  setEmployerSubTab?: (subTab: 'posts' | 'hired') => void;
  activitySearch?: string;
  setActivitySearch?: (val: string) => void;
  activityStatus?: string;
  setActivityStatus?: (val: string) => void;
  activityLoading?: boolean;
  activityData?: any;
  activityPage?: number;
  setActivityPage?: (page: number) => void;
  onSelectJob?: (job: any) => void;

  // Tab 3 (Reviews) props
  reviewsLoading?: boolean;
  reviewsData?: any;
  reviewsPage?: number;
  setReviewsPage?: (page: number) => void;

  // Tab 4 (Reports) props
  reportsLoading?: boolean;
  reportsData?: any;
  reportsPage?: number;
  setReportsPage?: (page: number) => void;

  // Tab 5 (Logs) props
  logsLoading?: boolean;
  logsData?: any;
  logsPage?: number;
  setLogsPage?: (page: number) => void;
}

export default function UserDetailDrawer({
  selectedDetailUser,
  onClose,
  userDetailData,
  detailLoading = false,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  actionLoading = null,
  onVerify = () => {},
  onSuspend = () => {},
  onDelete = () => {},
  onRestore = () => {},

  employerSubTab: externalEmployerSubTab,
  setEmployerSubTab: externalSetEmployerSubTab,
  activitySearch: externalActivitySearch,
  setActivitySearch: externalSetActivitySearch,
  activityStatus: externalActivityStatus,
  setActivityStatus: externalSetActivityStatus,
  activityLoading = false,
  activityData = null,
  activityPage: externalActivityPage,
  setActivityPage: externalSetActivityPage,
  onSelectJob = () => {},

  reviewsLoading = false,
  reviewsData = null,
  reviewsPage: externalReviewsPage,
  setReviewsPage: externalSetReviewsPage,

  reportsLoading = false,
  reportsData = null,
  reportsPage: externalReportsPage,
  setReportsPage: externalSetReportsPage,

  logsLoading = false,
  logsData = null,
  logsPage: externalLogsPage,
  setLogsPage: externalSetLogsPage,
}: UserDetailDrawerProps) {
  // Internal state fallbacks to prevent prop drilling overload
  const [internalActiveTab, setInternalActiveTab] = React.useState<'profile' | 'activity' | 'reviews' | 'reports' | 'logs'>('profile');
  const [internalEmployerSubTab, setInternalEmployerSubTab] = React.useState<'posts' | 'hired'>('posts');
  const [internalActivitySearch, setInternalActivitySearch] = React.useState('');
  const [internalActivityStatus, setInternalActivityStatus] = React.useState('all');
  const [internalActivityPage, setInternalActivityPage] = React.useState(1);
  const [internalReviewsPage, setInternalReviewsPage] = React.useState(1);
  const [internalReportsPage, setInternalReportsPage] = React.useState(1);
  const [internalLogsPage, setInternalLogsPage] = React.useState(1);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const activeTab = externalActiveTab ?? internalActiveTab;
  const setActiveTab = externalSetActiveTab ?? setInternalActiveTab;
  const employerSubTab = externalEmployerSubTab ?? internalEmployerSubTab;
  const setEmployerSubTab = externalSetEmployerSubTab ?? setInternalEmployerSubTab;
  const activitySearch = externalActivitySearch ?? internalActivitySearch;
  const setActivitySearch = externalSetActivitySearch ?? setInternalActivitySearch;
  const activityStatus = externalActivityStatus ?? internalActivityStatus;
  const setActivityStatus = externalSetActivityStatus ?? setInternalActivityStatus;
  const activityPage = externalActivityPage ?? internalActivityPage;
  const setActivityPage = externalSetActivityPage ?? setInternalActivityPage;
  const reviewsPage = externalReviewsPage ?? internalReviewsPage;
  const setReviewsPage = externalSetReviewsPage ?? setInternalReviewsPage;
  const reportsPage = externalReportsPage ?? internalReportsPage;
  const setReportsPage = externalSetReportsPage ?? setInternalReportsPage;
  const logsPage = externalLogsPage ?? internalLogsPage;
  const setLogsPage = externalSetLogsPage ?? setInternalLogsPage;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-drawer-title"
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/50 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Centered Modal Body - covers sizeable ~80% width of screen */}
      <div className="relative w-full max-w-5xl lg:w-4/5 h-[88vh] bg-white rounded-3xl shadow-2xl flex flex-col z-10 animate-fade-in border border-white/60 overflow-hidden">
        {/* Header / Top Summary */}
        <div className="p-6 bg-paper-cream border-b border-ink-faint flex flex-col gap-4 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-ink-faint/50 text-ink-muted hover:text-ink transition-colors"
            aria-label="Close details"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex items-start gap-5">
            <Avatar name={selectedDetailUser.name} url={selectedDetailUser.avatar_url} size="lg" isSuspended={selectedDetailUser.is_suspended} />
            <div className="flex-1 min-w-0 pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="user-drawer-title" className="text-2xl font-display font-bold text-ink truncate" title={selectedDetailUser.name}>
                  {selectedDetailUser.name}
                </h2>
                {selectedDetailUser.deleted_at && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-status-error/15 text-status-error uppercase tracking-wider">
                    Archived / Soft Deleted
                  </span>
                )}
              </div>
              <p className="text-sm font-body text-ink-muted truncate mt-0.5">{selectedDetailUser.email}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                  selectedDetailUser.role === 'admin'
                    ? 'bg-primary text-white border border-primary-dark/30 shadow-primary/20'
                    : selectedDetailUser.role === 'employer'
                    ? 'bg-accent-peach text-primary-dark border border-accent-peachBright/50'
                    : 'bg-accent-mint text-accent-mintDeep border border-accent-mintDeep/30'
                }`}>
                  {selectedDetailUser.role === 'admin' ? (selectedDetailUser.admin_role || 'Staff Administrator') : selectedDetailUser.role}
                </span>

                {selectedDetailUser.role === 'admin' && (
                  <span className="flex items-center text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20 uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Protected Admin
                  </span>
                )}

                {selectedDetailUser.is_suspended && (
                  <span className="flex items-center text-[10px] font-bold text-status-error bg-status-error/10 px-2 py-0.5 rounded-full border border-status-error/20 uppercase tracking-wider">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Suspended
                  </span>
                )}

                {selectedDetailUser.role !== 'admin' && (
                  selectedDetailUser.verification_status === 'approved' ? (
                    <span className="flex items-center text-[10px] font-bold text-status-success bg-status-success/10 px-2 py-0.5 rounded-full border border-status-success/20 uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                    </span>
                  ) : selectedDetailUser.verification_status === 'rejected' || selectedDetailUser.registration_status === 'rejected' ? (
                    <span className="flex items-center text-[10px] font-bold text-status-error bg-status-error/10 px-2 py-0.5 rounded-full border border-status-error/20 uppercase tracking-wider">
                      <AlertCircle className="w-3 h-3 mr-1" /> Verification Rejected
                    </span>
                  ) : (
                    <span className="flex items-center text-[10px] font-bold text-ink-muted bg-paper px-2 py-0.5 rounded-full border border-ink-faint uppercase tracking-wider">
                      Unverified
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Stats Summary Line */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-2 text-sm text-ink-soft font-body bg-white/40 p-3 rounded-2xl border border-white/50">
            {selectedDetailUser.role !== 'admin' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Brgy. {selectedDetailUser.barangay || 'N/A'}, {selectedDetailUser.municipality || 'N/A'}</span>
                </div>
                {userDetailData && (
                  <>
                    <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-status-gold fill-status-gold" />
                      <span>{Number(userDetailData.stats.average_rating).toFixed(1)} / 5.0 ({userDetailData.stats.reviews_count} reviews)</span>
                    </div>
                    {selectedDetailUser.role === 'employer' && (
                      <>
                        <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <span>{userDetailData.stats.job_posts_count ?? 0} Job Posts</span>
                        </div>
                        <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-primary" />
                          <span>{userDetailData.stats.hired_workers_count ?? 0} Hires</span>
                        </div>
                      </>
                    )}
                    {selectedDetailUser.role === 'worker' && (
                      <>
                        <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <span>{userDetailData.stats.applications_count ?? 0} Applications</span>
                        </div>
                        <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />
                        <div className="flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-status-success" />
                          <span>{userDetailData.stats.completed_jobs_count ?? 0} Completed</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-ink">System Administrator</span>
                </div>
                <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-ink-muted" />
                  <span>Joined: {new Date(selectedDetailUser.created_at).toLocaleDateString()}</span>
                </div>
                <div className="w-1.5 h-1.5 bg-ink-faint rounded-full hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <Lock className={`w-4 h-4 ${selectedDetailUser.two_factor_confirmed_at ? 'text-status-success' : 'text-ink-muted'}`} />
                  <span>2FA: {selectedDetailUser.two_factor_confirmed_at ? 'Enabled' : 'Disabled'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Inconsistency Warning & Missing Document Info (Workers & Employers only) */}
        {selectedDetailUser.role !== 'admin' && selectedDetailUser.verification_status !== 'approved' && (
          <div className="px-6 pt-4 shrink-0">
            {(() => {
              const hasDoc = !!(
                selectedDetailUser.document_url ||
                (selectedDetailUser as any).document_front_url ||
                (selectedDetailUser as any).id_front_url ||
                (selectedDetailUser.business_documents && (Array.isArray(selectedDetailUser.business_documents) ? selectedDetailUser.business_documents.length > 0 : !!selectedDetailUser.business_documents))
              );

              if (selectedDetailUser.registration_status === 'pending_review' && !hasDoc) {
                return (
                  <div className="bg-status-warning/10 border border-status-warning/20 rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-status-warning">Inconsistent Verification State</h4>
                      <p className="text-xs text-status-warning/90 mt-1 leading-relaxed">
                        This user is in "Pending Review" status but has not uploaded any ID or business documents. Bypassing document review is recommended via manual verification.
                      </p>
                    </div>
                  </div>
                );
              }

              if (!hasDoc) {
                return (
                  <div className="bg-ink-faint/50 border border-ink-faint rounded-2xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-ink-muted shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-ink-soft">Unverified (Missing Document Upload)</h4>
                      <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                        The user has created their account but hasn't submitted their ID or business documents. They will not appear in the verification queue.
                      </p>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>
        )}

        {/* Tab Controls (Role Appropriate) */}
        <div className="flex border-b border-ink-faint px-6 mt-4 shrink-0 overflow-x-auto pb-1 gap-2">
          {(selectedDetailUser.role === 'admin'
            ? [
                { id: 'profile', label: 'Admin Details' },
                { id: 'logs', label: 'Action Audit Logs' }
              ]
            : [
                { id: 'profile', label: 'Profile Details' },
                { id: 'activity', label: selectedDetailUser.role === 'employer' ? 'Job Posts & Hires' : 'Work History & Applications' },
                { id: 'reviews', label: 'Reviews Received' },
                { id: 'reports', label: 'Reports' },
                { id: 'logs', label: 'Activity Logs' }
              ]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 font-body font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 font-body">
          {detailLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
              <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm mt-3 font-semibold">Loading details...</span>
            </div>
          ) : (
            <>
              {/* TAB 1: PROFILE DETAILS */}
              {activeTab === 'profile' && userDetailData && (
                <div className="space-y-6">
                  {/* ADMIN PROFILE VIEW */}
                  {selectedDetailUser.role === 'admin' && (
                    <div className="space-y-6">
                      {/* Admin Information Card */}
                      <div className="bg-paper p-5 rounded-2xl border border-ink-faint">
                        <div className="flex items-center gap-2 mb-4">
                          <ShieldCheck className="w-5 h-5 text-primary" />
                          <h3 className="text-sm font-bold text-ink uppercase tracking-wider">System Staff Credentials</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          <div>
                            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Administrative Level</h4>
                            <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                              <Key className="w-4 h-4 text-primary" />
                              <span className="capitalize">{selectedDetailUser.admin_role || 'Staff Administrator'}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Account Email</h4>
                            <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                              <Mail className="w-4 h-4 text-ink-muted" />
                              <span>{userDetailData.user.email}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Account Created</h4>
                            <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                              <Calendar className="w-4 h-4 text-ink-muted" />
                              <span>{new Date(userDetailData.user.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Security & Access Audit Card */}
                      <div className="bg-paper p-5 rounded-2xl border border-ink-faint">
                        <div className="flex items-center gap-2 mb-4">
                          <Lock className="w-5 h-5 text-primary" />
                          <h3 className="text-sm font-bold text-ink uppercase tracking-wider">Security & Authentication</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          <div>
                            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Two-Factor Authentication</h4>
                            <div className="flex items-center gap-2 text-sm font-semibold">
                              {userDetailData.user.two_factor_confirmed_at ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-status-success" />
                                  <span className="text-status-success">Enabled</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-4 h-4 text-ink-muted" />
                                  <span className="text-ink-muted">Not Configured</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Last Login Date</h4>
                            <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                              <Clock className="w-4 h-4 text-ink-muted" />
                              <span>{userDetailData.user.last_login_at ? new Date(userDetailData.user.last_login_at).toLocaleString() : 'Never'}</span>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Last Login IP</h4>
                            <div className="flex items-center gap-2 text-sm text-ink font-semibold font-mono">
                              <span>{userDetailData.user.last_login_ip || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* WORKER / EMPLOYER PROFILE VIEW */}
                  {selectedDetailUser.role !== 'admin' && (
                    <>
                      <div>
                        <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">
                          {selectedDetailUser.role === 'worker' ? 'Worker Bio & Summary' : 'Business Description'}
                        </h4>
                        <p className="text-sm text-ink leading-relaxed bg-paper p-4 rounded-2xl border border-ink-faint whitespace-pre-line">
                          {selectedDetailUser.role === 'worker'
                            ? (userDetailData.user.worker_profile?.bio || 'No worker bio provided yet.')
                            : (userDetailData.user.employer_profile?.description || 'No business description provided yet.')}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Email Address</h4>
                          <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                            <Mail className="w-4 h-4 text-ink-muted" />
                            <span>{userDetailData.user.email}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Phone Number</h4>
                          <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                            <Phone className="w-4 h-4 text-ink-muted" />
                            <span>{userDetailData.user.phone || 'No phone number'}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Barangay / Municipality</h4>
                          <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                            <MapPin className="w-4 h-4 text-ink-muted" />
                            <span>{userDetailData.user.barangay || 'N/A'}, {userDetailData.user.municipality || 'N/A'}</span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Date of Birth</h4>
                          <div className="flex items-center gap-2 text-sm text-ink font-semibold">
                            <Calendar className="w-4 h-4 text-ink-muted" />
                            <span>
                              {formatBirthDate(userDetailData.user.date_of_birth)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Emergency Contact (Worker or Employer) */}
                      {(userDetailData.user.emergency_contact_name || userDetailData.user.emergency_contact_phone) && (
                        <div className="bg-paper p-4 rounded-2xl border border-ink-faint">
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Emergency Contact</h4>
                          <div className="flex flex-wrap gap-6 text-sm">
                            <div>
                              <span className="text-xs text-ink-muted">Contact Person: </span>
                              <span className="font-semibold text-ink">{userDetailData.user.emergency_contact_name || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-xs text-ink-muted">Emergency Phone: </span>
                              <span className="font-semibold text-ink">{userDetailData.user.emergency_contact_phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Worker Skills Section */}
                      {selectedDetailUser.role === 'worker' && (
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Skills & Certifications</h4>
                          <div className="flex flex-wrap gap-2">
                            {userDetailData.user.worker_profile?.skills && userDetailData.user.worker_profile.skills.length > 0 ? (
                              userDetailData.user.worker_profile.skills.map((s: any) => (
                                <span key={s.id} className="bg-primary/5 border border-primary/10 text-primary px-3 py-1 rounded-xl text-xs font-semibold">
                                  {s.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-ink-muted">No skills listed yet.</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Worker Work History / Experiences Section */}
                      {selectedDetailUser.role === 'worker' && (
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Prior Work Experiences</h4>
                          {userDetailData.user.worker_profile?.experiences && userDetailData.user.worker_profile.experiences.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {userDetailData.user.worker_profile.experiences.map((exp: any) => (
                                <div key={exp.id} className="bg-paper p-4 rounded-2xl border border-ink-faint space-y-1">
                                  <div className="flex justify-between items-start">
                                    <h5 className="text-sm font-bold text-ink">{exp.job_title}</h5>
                                    <span className="text-[10px] font-semibold text-ink-muted bg-white px-2 py-0.5 rounded border border-ink-faint">
                                      {exp.duration}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-primary">{exp.employer_name}</p>
                                  {exp.description && (
                                    <p className="text-xs text-ink-soft mt-1 leading-relaxed">{exp.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-paper p-4 rounded-2xl border border-ink-faint text-sm text-ink-muted flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-ink-muted shrink-0" />
                              <span>No previous work experiences recorded.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Worker Character References Section */}
                      {selectedDetailUser.role === 'worker' && (
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Character References</h4>
                          {userDetailData.user.worker_profile?.references && userDetailData.user.worker_profile.references.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {userDetailData.user.worker_profile.references.map((ref: any) => (
                                <div key={ref.id} className="bg-paper p-3.5 rounded-2xl border border-ink-faint space-y-1">
                                  <h5 className="text-sm font-bold text-ink">{ref.name}</h5>
                                  <div className="text-xs text-ink-muted flex items-center justify-between">
                                    <span className="capitalize">{ref.relationship}</span>
                                    <span className="font-semibold text-ink flex items-center gap-1">
                                      <Phone className="w-3 h-3 text-ink-muted" /> {ref.phone}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-paper p-4 rounded-2xl border border-ink-faint text-sm text-ink-muted flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-ink-muted shrink-0" />
                              <span>No character references provided.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Communication Platforms Section */}
                      <div>
                        <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Communication Platforms</h4>
                        {userDetailData.user.contact_platforms && userDetailData.user.contact_platforms.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {userDetailData.user.contact_platforms.map((cp: any, idx: number) => (
                              <div key={idx} className="bg-paper p-3 rounded-xl border border-ink-faint flex items-center gap-2 text-xs font-semibold text-ink">
                                <span className="font-bold text-primary capitalize">{cp.platform}:</span>
                                <span>{cp.value}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-ink-muted">No communication platforms configured yet.</span>
                        )}
                      </div>

                      {/* Government ID Verification Documents (Worker or Employer Representative) */}
                      {(() => {
                        const frontDoc = userDetailData.user.document_url || (userDetailData.user as any).document_front_url || (userDetailData.user as any).id_front_url;
                        const backDoc = userDetailData.user.document_back_url || (userDetailData.user as any).id_back_url;
                        const selfieDoc = userDetailData.user.selfie_url || (userDetailData.user as any).id_selfie_url;

                        if (!frontDoc && !backDoc && !selfieDoc) return null;

                        return (
                          <div>
                            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Government ID & Verification Media</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {frontDoc && (
                                <div className="bg-paper rounded-2xl border border-ink-faint p-3 flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                                      <FileText className="w-4 h-4 text-primary" /> Front of Government ID
                                    </span>
                                    <button
                                      onClick={() => setLightboxImage({ url: frontDoc, title: 'Government ID (Front)' })}
                                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> Zoom
                                    </button>
                                  </div>
                                  <div
                                    onClick={() => setLightboxImage({ url: frontDoc, title: 'Government ID (Front)' })}
                                    className="h-36 bg-black/5 rounded-xl border border-ink-faint/50 overflow-hidden flex items-center justify-center relative cursor-zoom-in group"
                                  >
                                    <Image
                                      src={frontDoc}
                                      alt="Front ID"
                                      width={300}
                                      height={200}
                                      unoptimized
                                      className="max-w-full max-h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                </div>
                              )}

                              {backDoc && (
                                <div className="bg-paper rounded-2xl border border-ink-faint p-3 flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                                      <FileText className="w-4 h-4 text-primary" /> Back of Government ID
                                    </span>
                                    <button
                                      onClick={() => setLightboxImage({ url: backDoc, title: 'Government ID (Back)' })}
                                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> Zoom
                                    </button>
                                  </div>
                                  <div
                                    onClick={() => setLightboxImage({ url: backDoc, title: 'Government ID (Back)' })}
                                    className="h-36 bg-black/5 rounded-xl border border-ink-faint/50 overflow-hidden flex items-center justify-center relative cursor-zoom-in group"
                                  >
                                    <Image
                                      src={backDoc}
                                      alt="Back ID"
                                      width={300}
                                      height={200}
                                      unoptimized
                                      className="max-w-full max-h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                </div>
                              )}

                              {selfieDoc && (
                                <div className="bg-paper rounded-2xl border border-ink-faint p-3 flex flex-col gap-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                                      <FileText className="w-4 h-4 text-primary" /> Selfie with ID
                                    </span>
                                    <button
                                      onClick={() => setLightboxImage({ url: selfieDoc, title: 'Selfie Holding ID' })}
                                      className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" /> Zoom
                                    </button>
                                  </div>
                                  <div
                                    onClick={() => setLightboxImage({ url: selfieDoc, title: 'Selfie Holding ID' })}
                                    className="h-36 bg-black/5 rounded-xl border border-ink-faint/50 overflow-hidden flex items-center justify-center relative cursor-zoom-in group"
                                  >
                                    <Image
                                      src={selfieDoc}
                                      alt="Selfie with ID"
                                      width={300}
                                      height={200}
                                      unoptimized
                                      className="max-w-full max-h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Uploaded Business Documents (Employer) */}
                      {selectedDetailUser.role === 'employer' && (
                        <div>
                          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Uploaded Business Documents</h4>
                          {userDetailData.user.business_documents && Array.isArray(userDetailData.user.business_documents) && userDetailData.user.business_documents.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {userDetailData.user.business_documents.map((docUrl: string, idx: number) => {
                                const isPdf = typeof docUrl === 'string' && (docUrl.toLowerCase().endsWith('.pdf') || docUrl.includes('.pdf?'));
                                return (
                                  <div key={idx} className="bg-paper rounded-2xl border border-ink-faint p-3 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                                        <FileText className="w-4 h-4 text-primary" />
                                        Document #{idx + 1}
                                      </span>
                                      <a
                                        href={docUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
                                        title="Open document in new tab"
                                      >
                                        <span>View</span>
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                    <div className="h-36 bg-black/5 rounded-xl border border-ink-faint/50 overflow-hidden flex items-center justify-center relative">
                                      {isPdf ? (
                                        <div className="flex flex-col items-center gap-2 p-4 text-center">
                                          <FileText className="w-10 h-10 text-primary/70" />
                                          <span className="text-xs text-ink-muted font-medium">PDF Document</span>
                                          <a
                                            href={docUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-primary px-2.5 py-1 rounded-lg hover:bg-primary/90 transition-colors"
                                          >
                                            <FileDown className="w-3 h-3" /> Download / Open
                                          </a>
                                        </div>
                                      ) : (
                                        <div
                                          onClick={() => setLightboxImage({ url: docUrl, title: `Business Document #${idx + 1}` })}
                                          className="w-full h-full flex items-center justify-center p-1 group cursor-zoom-in"
                                          title="Click to zoom image"
                                        >
                                          <Image
                                            src={docUrl}
                                            alt={`Business Doc ${idx + 1}`}
                                            width={300}
                                            height={200}
                                            unoptimized
                                            className="max-w-full max-h-full object-contain rounded-lg group-hover:scale-105 transition-transform"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="bg-paper p-4 rounded-2xl border border-ink-faint text-sm text-ink-muted flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-ink-muted shrink-0" />
                              <span>No business documents uploaded yet.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Administrative Actions Panel */}
                  <div className="border-t border-ink-faint pt-6">
                    <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">Administrative Actions</h4>
                    {selectedDetailUser.role === 'admin' ? (
                      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                        <p className="text-xs text-ink font-medium leading-relaxed">
                          This is a protected system administrator account. Suspension and deletion controls are disabled for platform safety and role security.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {selectedDetailUser.verification_status !== 'approved' && (
                          <button
                            disabled={actionLoading === selectedDetailUser.id}
                            onClick={onVerify}
                            className="px-5 py-3 bg-status-success text-white text-sm font-semibold rounded-xl hover:bg-status-success/90 transition-all flex items-center gap-1.5 shadow-sm"
                            title="Verify User"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Manually Verify User</span>
                          </button>
                        )}

                        <button
                          disabled={actionLoading === selectedDetailUser.id}
                          onClick={() => onSuspend(selectedDetailUser.id, selectedDetailUser.is_suspended)}
                          className={`px-5 py-3 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-sm border ${selectedDetailUser.is_suspended
                              ? 'bg-status-warning/10 border-status-warning/20 text-status-warning hover:bg-status-warning hover:text-white'
                              : 'bg-white border-ink-faint text-ink hover:bg-ink hover:text-white'
                            }`}
                          title={selectedDetailUser.is_suspended ? 'Unsuspend User' : 'Suspend User'}
                        >
                          <UserX className="w-4 h-4" />
                          <span>{selectedDetailUser.is_suspended ? 'Unsuspend User' : 'Suspend User'}</span>
                        </button>

                        {selectedDetailUser.deleted_at ? (
                          <button
                            disabled={actionLoading === selectedDetailUser.id}
                            onClick={() => onRestore(selectedDetailUser.id)}
                            className="px-5 py-3 bg-paper-dark border border-ink-faint text-ink text-sm font-semibold rounded-xl hover:bg-ink hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                            title="Restore User"
                          >
                            <Undo className="w-4 h-4" />
                            <span>Restore Soft Deleted User</span>
                          </button>
                        ) : (
                          <button
                            disabled={actionLoading === selectedDetailUser.id}
                            onClick={() => onDelete(selectedDetailUser.id)}
                            className="px-5 py-3 bg-status-error/10 border border-status-error/20 text-status-error text-sm font-semibold rounded-xl hover:bg-status-error hover:text-white transition-all flex items-center gap-1.5 shadow-sm"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Soft Delete User</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: JOB POSTS / ACTIVITY */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {/* Employer Activity Search/Filter Header */}
                  {selectedDetailUser.role === 'employer' && (
                    <div className="flex space-x-2 border-b border-ink-faint pb-3">
                      <button
                        onClick={() => setEmployerSubTab('posts')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${employerSubTab === 'posts' ? 'bg-ink text-white' : 'bg-paper text-ink-soft hover:bg-paper-dark'}`}
                      >
                        Job Postings
                      </button>
                      <button
                        onClick={() => setEmployerSubTab('hired')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${employerSubTab === 'hired' ? 'bg-ink text-white' : 'bg-paper text-ink-soft hover:bg-paper-dark'}`}
                      >
                        Hired Workers
                      </button>
                    </div>
                  )}

                  {/* Search Bar for Posts/Applications */}
                  <div className="flex gap-2 shrink-0">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        aria-label="Search activity"
                        placeholder={selectedDetailUser.role === 'employer' && employerSubTab === 'hired' ? "Search workers by name..." : "Search posts by title..."}
                        value={activitySearch}
                        onChange={(e) => setActivitySearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-ink-faint rounded-xl text-sm focus:border-primary outline-none"
                      />
                      <Search className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                    </div>

                    {!(selectedDetailUser.role === 'employer' && employerSubTab === 'hired') && (
                      <select
                        value={activityStatus}
                        aria-label="Filter by activity status"
                        onChange={(e) => setActivityStatus(e.target.value)}
                        className="px-3 py-2 border border-ink-faint rounded-xl text-sm outline-none"
                      >
                        <option value="all">All Status</option>
                        {selectedDetailUser.role === 'employer' ? (
                          <>
                            <option value="open">Open</option>
                            <option value="closed">Closed</option>
                            <option value="completed">Completed</option>
                            <option value="suspended">Suspended</option>
                          </>
                        ) : (
                          <>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                          </>
                        )}
                      </select>
                    )}
                  </div>

                  {/* Activity List Body */}
                  {activityLoading ? (
                    <div className="flex justify-center py-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : activityData && activityData.data && activityData.data.length > 0 ? (
                    <div className="space-y-3">
                      {activityData.data.map((item: any) => {
                        if (selectedDetailUser.role === 'employer' && employerSubTab === 'posts') {
                          return (
                            <div
                              key={item.id}
                              onClick={() => onSelectJob(item)}
                              className="p-4 bg-paper rounded-2xl border border-ink-faint hover:border-primary/40 cursor-pointer transition-all flex justify-between items-center group/post"
                            >
                              <div>
                                <div className="font-bold text-ink group-hover/post:text-primary transition-colors">{item.title}</div>
                                <div className="text-xs text-ink-muted mt-1">
                                  Brgy. {item.barangay}, {item.municipality} • ₱{Number(item.compensation).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.status === 'open' ? 'bg-status-success/15 text-status-success' : 'bg-ink-faint text-ink-soft'
                                  }`}>
                                  {item.status}
                                </span>
                                <div className="text-[10px] text-ink-muted mt-1">{new Date(item.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                          );
                        } else if (selectedDetailUser.role === 'employer' && employerSubTab === 'hired') {
                          return (
                            <div key={item.id} className="p-4 bg-paper rounded-2xl border border-ink-faint flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <Avatar name={item.worker.name} url={item.worker.avatar_url} size="sm" />
                                <div>
                                  <div className="font-bold text-ink">{item.worker.name}</div>
                                  <div className="text-xs text-ink-muted mt-0.5">Hired for: <span className="font-medium">{item.job.title}</span></div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-bold uppercase bg-status-success/15 text-status-success px-2 py-0.5 rounded">
                                  {item.status}
                                </span>
                                <div className="text-[10px] text-ink-muted mt-1">{new Date(item.updated_at || item.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                          );
                        } else {
                          // Worker applications
                          return (
                            <div
                              key={item.id}
                              onClick={() => onSelectJob(item.job)}
                              className="p-4 bg-paper rounded-2xl border border-ink-faint hover:border-primary/40 cursor-pointer transition-all flex justify-between items-center group/post"
                            >
                              <div>
                                <div className="font-bold text-ink group-hover/post:text-primary transition-colors">{item.job?.title || 'N/A'}</div>
                                <div className="text-xs text-ink-muted mt-1">
                                  Employer: {item.job?.employer?.name || 'N/A'} • Agreed Price: ₱{Number(item.final_agreed_price || item.job?.compensation).toLocaleString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.status === 'accepted' || item.status === 'completed' ? 'bg-status-success/15 text-status-success' : 'bg-ink-faint text-ink-soft'
                                  }`}>
                                  {item.status}
                                </span>
                                <div className="text-[10px] text-ink-muted mt-1">{new Date(item.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                          );
                        }
                      })}

                      {/* Pagination controls for activity */}
                      {activityData.last_page > 1 && (
                        <div className="flex justify-between items-center pt-2">
                          <button
                            disabled={activityPage === 1}
                            onClick={() => setActivityPage(Math.max(1, activityPage - 1))}
                            className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <span className="text-xs text-ink-muted">Page {activityPage} of {activityData.last_page}</span>
                          <button
                            disabled={activityPage === activityData.last_page}
                            onClick={() => setActivityPage(Math.min(activityData.last_page, activityPage + 1))}
                            className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-sm text-ink-muted">No activity items found.</div>
                  )}
                </div>
              )}

              {/* TAB 3: REVIEWS RECEIVED */}
              {activeTab === 'reviews' && (
                <div className="space-y-4">
                  {reviewsLoading ? (
                    <div className="flex justify-center py-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : reviewsData && reviewsData.data && reviewsData.data.length > 0 ? (
                    <div className="space-y-4">
                      {reviewsData.data.map((r: any) => (
                        <div key={r.id} className="p-4 bg-paper rounded-2xl border border-ink-faint space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar name={r.reviewer?.name || 'System User'} url={r.reviewer?.avatar_url} size="sm" />
                              <div>
                                <div className="font-bold text-sm text-ink">{r.reviewer?.name || 'System User'}</div>
                                <div className="text-[10px] text-ink-muted uppercase font-semibold tracking-wider">{r.reviewer_role}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-status-gold/10 px-2 py-0.5 rounded border border-status-gold/20 text-xs font-bold text-status-gold">
                              <Star className="w-3.5 h-3.5 fill-status-gold" />
                              <span>{Number(r.overall_rating).toFixed(1)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-ink-soft leading-relaxed italic bg-white/50 p-3 rounded-xl border border-white/60">
                            "{r.comment || 'No comment provided.'}"
                          </p>
                        </div>
                      ))}

                      {/* Pagination controls for reviews */}
                      {reviewsData.last_page > 1 && (
                        <div className="flex justify-between items-center pt-2">
                          <button
                            disabled={reviewsPage === 1}
                            onClick={() => setReviewsPage(Math.max(1, reviewsPage - 1))}
                            className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <span className="text-xs text-ink-muted">Page {reviewsPage} of {reviewsData.last_page}</span>
                          <button
                            disabled={reviewsPage === reviewsData.last_page}
                            onClick={() => setReviewsPage(Math.min(reviewsData.last_page, reviewsPage + 1))}
                            className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-sm text-ink-muted">No reviews received yet.</div>
                  )}
                </div>
              )}

              {/* TAB 4: REPORTS */}
              {activeTab === 'reports' && (
                <div className="space-y-4">
                  {reportsLoading ? (
                    <div className="flex justify-center py-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : reportsData && reportsData.data && reportsData.data.length > 0 ? (
                    <div className="space-y-3">
                      {reportsData.data.map((r: any) => {
                        const isSubmittedByThisUser = r.reporter_id === selectedDetailUser.id;
                        return (
                          <div key={r.id} className="p-4 bg-paper rounded-2xl border border-ink-faint space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isSubmittedByThisUser ? 'bg-primary/10 text-primary' : 'bg-status-error/10 text-status-error'
                                  }`}>
                                  {isSubmittedByThisUser ? 'Submitted by User' : 'Report against User'}
                                </span>
                                <div className="text-xs text-ink-muted mt-1">Type: <span className="font-semibold text-ink capitalize">{r.type}</span></div>
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${r.status === 'open' ? 'bg-status-warning/15 text-status-warning' : 'bg-status-success/15 text-status-success'
                                }`}>
                                {r.status}
                              </span>
                            </div>
                            <p className="text-sm text-ink-soft leading-relaxed italic bg-white/50 p-3 rounded-xl border border-white/60">
                              "{r.description || 'No description provided.'}"
                            </p>
                            <div className="text-[10px] text-ink-muted text-right">
                              {new Date(r.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        );
                      })}

                      {/* Pagination controls for reports */}
                      {reportsData.last_page > 1 && (
                        <div className="flex justify-between items-center pt-2">
                          <button
                            disabled={reportsPage === 1}
                            onClick={() => setReportsPage(Math.max(1, reportsPage - 1))}
                            className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <span className="text-xs text-ink-muted">Page {reportsPage} of {reportsData.last_page}</span>
                          <button
                            disabled={reportsPage === reportsData.last_page}
                            onClick={() => setReportsPage(Math.min(reportsData.last_page, reportsPage + 1))}
                            className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-sm text-ink-muted">No reports found.</div>
                  )}
                </div>
              )}

              {/* TAB 5: ACTIVITY LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  {logsLoading ? (
                    <div className="flex justify-center py-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : logsData && logsData.data && logsData.data.length > 0 ? (
                    <div className="space-y-3">
                      {logsData.data.map((log: any) => (
                        <div key={log.id} className="p-4 bg-paper rounded-2xl border border-ink-faint flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-mono font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
                              {log.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-ink-muted">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-ink">{log.description}</p>
                          {log.admin && log.admin.id !== selectedDetailUser.id && (
                            <div className="text-[10px] text-ink-muted mt-1 flex items-center gap-1.5">
                              <span>Performed by:</span>
                              <Avatar name={log.admin.name} url={log.admin.avatar_url} size="sm" className="h-5 w-5 rounded-md" />
                              <span className="font-semibold">{log.admin.name} (Admin)</span>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Pagination controls for logs */}
                      {logsData.last_page > 1 && (
                        <div className="flex justify-between items-center pt-2">
                          <button
                            disabled={logsPage === 1}
                            onClick={() => setLogsPage(Math.max(1, logsPage - 1))}
                            className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Previous
                          </button>
                          <span className="text-xs text-ink-muted">Page {logsPage} of {logsData.last_page}</span>
                          <button
                            disabled={logsPage === logsData.last_page}
                            onClick={() => setLogsPage(Math.min(logsData.last_page, logsPage + 1))}
                            className="px-3 py-1 bg-paper border border-ink-faint rounded-lg text-xs font-semibold disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-sm text-ink-muted">No activity logs found.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal for Documents/ID Images */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-drawer-lightbox-title"
          className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          {/* Header */}
          <div className="absolute top-4 left-0 right-0 px-6 flex justify-between items-center text-white z-10">
            <h4 id="user-drawer-lightbox-title" className="font-display text-lg font-bold tracking-wide">{lightboxImage.title}</h4>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all flex items-center justify-center"
              aria-label="Close image viewer"
            >
              <XCircle className="w-8 h-8" />
            </button>
          </div>

          {/* Image Container */}
          <div className="w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center p-4">
            <Image
              src={lightboxImage.url}
              alt={lightboxImage.title}
              width={600}
              height={450}
              unoptimized
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <p className="text-white/60 text-xs font-body mt-4">Click anywhere outside to close full screen view</p>
        </div>
      )}
    </div>
  );
}
