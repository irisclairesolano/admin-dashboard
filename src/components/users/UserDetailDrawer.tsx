'use client';

import React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertCircle, MapPin, Star, RefreshCw, Mail, Phone, Calendar, UserX, Undo, Trash2, Search } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { User } from '@/types/models';

interface UserDetailDrawerProps {
  selectedDetailUser: User;
  onClose: () => void;
  userDetailData: any;
  detailLoading: boolean;
  activeTab: 'profile' | 'activity' | 'reviews' | 'reports' | 'logs';
  setActiveTab: (tab: 'profile' | 'activity' | 'reviews' | 'reports' | 'logs') => void;
  actionLoading: number | null;
  onVerify: () => void;
  onSuspend: (id: number, isSuspended: boolean) => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;

  // Tab 2 (Activity/History) props
  employerSubTab: 'posts' | 'hired';
  setEmployerSubTab: (subTab: 'posts' | 'hired') => void;
  activitySearch: string;
  setActivitySearch: (val: string) => void;
  activityStatus: string;
  setActivityStatus: (val: string) => void;
  activityLoading: boolean;
  activityData: any;
  activityPage: number;
  setActivityPage: (page: number) => void;
  onSelectJob: (job: any) => void;

  // Tab 3 (Reviews) props
  reviewsLoading: boolean;
  reviewsData: any;
  reviewsPage: number;
  setReviewsPage: (page: number) => void;

  // Tab 4 (Reports) props
  reportsLoading: boolean;
  reportsData: any;
  reportsPage: number;
  setReportsPage: (page: number) => void;

  // Tab 5 (Logs) props
  logsLoading: boolean;
  logsData: any;
  logsPage: number;
  setLogsPage: (page: number) => void;
}

export default function UserDetailDrawer({
  selectedDetailUser,
  onClose,
  userDetailData,
  detailLoading,
  activeTab,
  setActiveTab,
  actionLoading,
  onVerify,
  onSuspend,
  onDelete,
  onRestore,

  employerSubTab,
  setEmployerSubTab,
  activitySearch,
  setActivitySearch,
  activityStatus,
  setActivityStatus,
  activityLoading,
  activityData,
  activityPage,
  setActivityPage,
  onSelectJob,

  reviewsLoading,
  reviewsData,
  reviewsPage,
  setReviewsPage,

  reportsLoading,
  reportsData,
  reportsPage,
  setReportsPage,

  logsLoading,
  logsData,
  logsPage,
  setLogsPage,
}: UserDetailDrawerProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-drawer-title"
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-50 animate-slide-in overflow-hidden">
        {/* Header / Top Summary */}
        <div className="p-6 bg-paper-cream border-b border-ink-faint flex flex-col gap-4 relative">
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
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm ${selectedDetailUser.role === 'employer' ? 'bg-accent-peach text-primary-dark border border-accent-peachBright/50' : 'bg-accent-mint text-accent-mintDeep border border-accent-mintDeep/30'
                  }`}>
                  {selectedDetailUser.role}
                </span>

                {selectedDetailUser.is_suspended && (
                  <span className="flex items-center text-[10px] font-bold text-status-error bg-status-error/10 px-2 py-0.5 rounded-full border border-status-error/20 uppercase tracking-wider">
                    <ShieldAlert className="w-3 h-3 mr-1" /> Suspended
                  </span>
                )}

                {selectedDetailUser.verification_status === 'approved' ? (
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
                )}
              </div>
            </div>
          </div>

          {/* Stats Summary Line */}
          <div className="flex items-center gap-6 mt-2 text-sm text-ink-soft font-body bg-white/40 p-3 rounded-2xl border border-white/50">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Brgy. {selectedDetailUser.barangay || 'N/A'}, {selectedDetailUser.municipality || 'N/A'}</span>
            </div>
            {userDetailData && (
              <>
                <div className="w-1.5 h-1.5 bg-ink-faint rounded-full" />
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-status-gold fill-status-gold" />
                  <span>{Number(userDetailData.stats.average_rating).toFixed(1)} / 5.0 ({userDetailData.stats.reviews_count} reviews)</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Inconsistency Warning & Missing Document Info */}
        {selectedDetailUser.verification_status !== 'approved' && (
          <div className="px-6 pt-4 shrink-0">
            {selectedDetailUser.registration_status === 'pending_review' && !selectedDetailUser.document_url ? (
              <div className="bg-status-warning/10 border border-status-warning/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-status-warning">Inconsistent Verification State</h4>
                  <p className="text-xs text-status-warning/90 mt-1 leading-relaxed">
                    This user is in "Pending Review" status but has not uploaded any ID documents. Bypassing document review is recommended via manual verification.
                  </p>
                </div>
              </div>
            ) : !selectedDetailUser.document_url ? (
              <div className="bg-ink-faint/50 border border-ink-faint rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-ink-muted shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-ink-soft">Unverified (Missing ID Upload)</h4>
                  <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                    The user has created their account but hasn't submitted their government ID documents. They will not appear in the verification queue.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-ink-faint px-6 mt-4 shrink-0 overflow-x-auto pb-1 gap-2">
          {['profile', 'activity', 'reviews', 'reports', 'logs'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-3 px-4 font-body font-bold text-sm border-b-2 transition-all capitalize whitespace-nowrap ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab === 'activity' ? 'Work History' : tab === 'logs' ? 'Activity Logs' : `${tab} Details`}
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
                  <div>
                    <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Biography / Description</h4>
                    <p className="text-sm text-ink leading-relaxed bg-paper p-4 rounded-2xl border border-ink-faint whitespace-pre-line">
                      {selectedDetailUser.role === 'worker'
                        ? (userDetailData.user.worker_profile?.bio || 'No worker bio provided yet.')
                        : (userDetailData.user.employer_profile?.description || 'No business description provided yet.')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {userDetailData.user.date_of_birth
                            ? new Date(userDetailData.user.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                            : 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>

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

                  {/* Admin Actions Panel */}
                  <div className="border-t border-ink-faint pt-6">
                    <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">Administrative Actions</h4>
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
    </div>
  );
}
