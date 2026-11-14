// ─── Chart Color Palette ─────────────────────────────────────────────────────
// Centralized chart colors – modern editorial palette with clear contrast
export const CHART_COLORS = [
  '#3B82F6', // Cobalt
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#06B6D4', // Cyan
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#64748B', // Slate
];

export const FUNNEL_COLORS = ['#1E3A8A', '#3B82F6', '#10B981'];

// ─── KPI Label Constants ──────────────────────────────────────────────────────
// Single source of truth for KPI label strings used in both the UI stats array
// and the CSV export function.
export const KPI_LABELS = {
  newRegistrations: 'New Registrations',
  jobsPosted: 'Jobs Posted',
  totalApplications: 'Total Applications',
  activeUsers: 'Active Users',
  pendingVerifications: 'Pending Verifications',
  openReports: 'Open Reports',
  supportTickets: 'Support Tickets',
  completionRate: 'Completion Rate',
} as const;

// ─── Job Status Badge Map ────────────────────────────────────────────────────
// Covers all known job statuses with restrained, calm glass badges.
export const STATUS_BADGE_MAP: Record<string, string> = {
  open:        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
  in_progress: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20',
  'in progress': 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20',
  completed:   'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700',
  cancelled:   'bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80',
  suspended:   'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20',
};

export const DEFAULT_BADGE_CLASS = 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80';

// ─── Audit Log Action Types ──────────────────────────────────────────────────
// Shared constant for the log action filter dropdown AND badge color mapping.
// Adding a new backend action type here is the only change required.
export type ActionBadgeStyle = { bg: string; text: string };

export const ACTION_TYPES: Record<string, ActionBadgeStyle> = {
  // Backend underscore actions (as logged by Laravel)
  'approve_user':          { bg: 'bg-emerald-500/10',     text: 'text-emerald-700 dark:text-emerald-400' },
  'reject_user':           { bg: 'bg-rose-500/10',        text: 'text-rose-700 dark:text-rose-400' },
  'correction_user':       { bg: 'bg-amber-500/10',       text: 'text-amber-800 dark:text-amber-300' },
  'suspend_user':          { bg: 'bg-amber-500/10',       text: 'text-amber-800 dark:text-amber-300' },
  'unsuspend_user':        { bg: 'bg-emerald-500/10',     text: 'text-emerald-700 dark:text-emerald-400' },
  'delete_user':           { bg: 'bg-rose-500/10',        text: 'text-rose-700 dark:text-rose-400' },
  'restore_user':          { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-200' },
  'suspend_job':           { bg: 'bg-amber-500/10',       text: 'text-amber-800 dark:text-amber-300' },
  'unsuspend_job':         { bg: 'bg-emerald-500/10',     text: 'text-emerald-700 dark:text-emerald-400' },
  'delete_job':            { bg: 'bg-rose-500/10',        text: 'text-rose-700 dark:text-rose-400' },
  'restore_job':           { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-200' },
  'lift_blacklist':        { bg: 'bg-emerald-500/10',     text: 'text-emerald-700 dark:text-emerald-400' },
  'resolve_report':        { bg: 'bg-emerald-500/10',     text: 'text-emerald-700 dark:text-emerald-400' },
  'dismiss_report':        { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
  'admin_login':           { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },

  // Dot notation aliases
  'user.approved':         { bg: 'bg-emerald-500/10',     text: 'text-emerald-700 dark:text-emerald-400' },
  'user.rejected':         { bg: 'bg-rose-500/10',        text: 'text-rose-700 dark:text-rose-400' },
  'user.suspended':        { bg: 'bg-amber-500/10',       text: 'text-amber-800 dark:text-amber-300' },
  'user.unsuspended':      { bg: 'bg-emerald-500/10',     text: 'text-emerald-700 dark:text-emerald-400' },
  'user.deleted':          { bg: 'bg-rose-500/10',        text: 'text-rose-700 dark:text-rose-400' },
  'user.restored':         { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-200' },
  'job.suspended':         { bg: 'bg-amber-500/10',       text: 'text-amber-800 dark:text-amber-300' },
  'job.unsuspended':       { bg: 'bg-emerald-500/10',     text: 'text-emerald-700 dark:text-emerald-400' },
  'job.deleted':           { bg: 'bg-rose-500/10',        text: 'text-rose-700 dark:text-rose-400' },
  'job.restored':          { bg: 'bg-primary/15',         text: 'text-primary-dark' },
  'report.resolved':       { bg: 'bg-status-success/15',  text: 'text-status-success' },
  'report.dismissed':      { bg: 'bg-ink-faint/50',       text: 'text-ink-soft' },
  'support.replied':       { bg: 'bg-accent-sky/30',      text: 'text-primary-dark' },
  'support.resolved':      { bg: 'bg-status-success/15',  text: 'text-status-success' },
  'verification.approved': { bg: 'bg-status-success/15',  text: 'text-status-success' },
  'verification.rejected': { bg: 'bg-status-error/15',    text: 'text-status-error' },
  'profanity.added':       { bg: 'bg-status-error/10',    text: 'text-status-error' },
  'profanity.removed':     { bg: 'bg-ink-faint/50',       text: 'text-ink-soft' },
  'insight.generated':     { bg: 'bg-accent-sky/20',      text: 'text-primary-dark' },
  'admin.login':           { bg: 'bg-ink-faint/40',       text: 'text-ink-soft' },
};

export const DEFAULT_ACTION_BADGE: ActionBadgeStyle = { bg: 'bg-ink-faint/40', text: 'text-ink-soft' };

// ─── Reportable Type Humanizer ───────────────────────────────────────────────
const REPORTABLE_TYPE_MAP: Record<string, string> = {
  'App\\Models\\JobPost':        'Job Post',
  'App\\Models\\Job':            'Job Post',
  'App\\Models\\User':           'User',
  'App\\Models\\Review':         'Review',
  'App\\Models\\Comment':        'Comment',
  'App\\Models\\Message':        'Chat Message',
  'App\\Models\\Application':    'Application',
  'App\\Models\\SupportTicket':  'Support Ticket',
  'message':                     'Chat Message',
  'application':                 'Application',
  'review':                      'Review',
  'support_ticket':              'Support Ticket',
  'job_post':                    'Job Post',
  'user':                        'User',
};

export function humanizeModel(type: string): string {
  return REPORTABLE_TYPE_MAP[type] ?? type.split('\\').pop() ?? type;
}
