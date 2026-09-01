// ─── Chart Color Palette ─────────────────────────────────────────────────────
// Centralized chart colors – replaces magic hex strings in page.tsx
export const CHART_COLORS = [
  '#FFB6C1', // accent-peach
  '#87CEEB', // accent-sky
  '#90EE90', // accent-mint
  '#FFD700', // accent-gold
  '#DDA0DD', // plum
  '#98FB98', // pale-green
  '#F0E68C', // khaki
  '#FFA07A', // light-salmon
];

export const FUNNEL_COLORS = ['#3E7648', '#87CEEB', '#90EE90'];

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
// Covers all known job statuses with appropriate Tailwind color classes.
export const STATUS_BADGE_MAP: Record<string, string> = {
  open:        'bg-status-success/20 text-status-success border border-status-success/30',
  in_progress: 'bg-accent-sky/40 text-primary-dark border border-accent-sky/50',
  'in progress': 'bg-accent-sky/40 text-primary-dark border border-accent-sky/50',
  completed:   'bg-primary/15 text-primary-dark border border-primary/25',
  cancelled:   'bg-ink-faint/50 text-ink-soft border border-ink-faint',
  suspended:   'bg-status-warning/20 text-status-warning border border-status-warning/30',
};

export const DEFAULT_BADGE_CLASS = 'bg-ink-faint/50 text-ink-soft border border-ink-faint';

// ─── Audit Log Action Types ──────────────────────────────────────────────────
// Shared constant for the log action filter dropdown AND badge color mapping.
// Adding a new backend action type here is the only change required.
export type ActionBadgeStyle = { bg: string; text: string };

export const ACTION_TYPES: Record<string, ActionBadgeStyle> = {
  'user.approved':         { bg: 'bg-status-success/15',  text: 'text-status-success' },
  'user.rejected':         { bg: 'bg-status-error/15',    text: 'text-status-error' },
  'user.suspended':        { bg: 'bg-status-warning/20',  text: 'text-status-warning' },
  'user.unsuspended':      { bg: 'bg-status-success/15',  text: 'text-status-success' },
  'user.deleted':          { bg: 'bg-status-error/15',    text: 'text-status-error' },
  'user.restored':         { bg: 'bg-primary/15',         text: 'text-primary-dark' },
  'job.suspended':         { bg: 'bg-status-warning/20',  text: 'text-status-warning' },
  'job.unsuspended':       { bg: 'bg-status-success/15',  text: 'text-status-success' },
  'job.deleted':           { bg: 'bg-status-error/15',    text: 'text-status-error' },
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
  'App\\Models\\JobPost':  'Job Post',
  'App\\Models\\Job':      'Job Post',
  'App\\Models\\User':     'User',
  'App\\Models\\Review':   'Review',
  'App\\Models\\Comment':  'Comment',
};

export function humanizeModel(type: string): string {
  return REPORTABLE_TYPE_MAP[type] ?? type.split('\\').pop() ?? type;
}
