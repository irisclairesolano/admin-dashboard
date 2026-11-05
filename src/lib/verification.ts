/**
 * ============================================================================
 * Verification & KYC Status Utilities (verification.ts)
 * ============================================================================
 * Standardized logic for checking identification documents presence,
 * calculating accurate user onboarding/verification labels, and guarding
 * administrative verification actions across the SIKAP admin dashboard.
 */

export function hasSubmittedDocs(user: any): boolean {
  if (!user) return false;
  if (Boolean(user.document_url || user.document_back_url || user.selfie_url)) return true;
  if (Boolean((user as any).document_front_url || (user as any).id_front_url || (user as any).id_back_url || (user as any).id_selfie_url)) return true;
  if (Array.isArray(user.business_documents)) return user.business_documents.length > 0;
  if (typeof user.business_documents === 'string' && user.business_documents.trim() !== '' && user.business_documents !== '[]') return true;
  return false;
}

export interface UserVerificationInfo {
  statusKey: 'approved' | 'rejected' | 'pending_review' | 'pending_id_upload' | 'pending_email' | 'unverified';
  label: string;
  badgeClass: string;
  iconClass: string;
  canVerify: boolean;
  disabledReason?: string;
}

export function getUserVerificationInfo(user: any): UserVerificationInfo {
  if (!user) {
    return {
      statusKey: 'unverified',
      label: 'Unverified',
      badgeClass: 'text-ink-muted bg-paper border-ink-faint',
      iconClass: 'lni lni-user',
      canVerify: false,
      disabledReason: 'No user data available',
    };
  }

  // 1. Approved / Verified (Only true if KYC identity verification was explicitly approved or badged)
  if (
    user.verification_status === 'approved' ||
    user.verification_badge === true
  ) {
    return {
      statusKey: 'approved',
      label: 'Verified',
      badgeClass: 'text-status-success bg-status-success/10 border-status-success/20',
      iconClass: 'lni lni-checkmark-circle',
      canVerify: false,
      disabledReason: 'User is already verified and approved',
    };
  }

  // 2. Rejected
  if (
    user.verification_status === 'rejected' ||
    user.registration_status === 'rejected'
  ) {
    return {
      statusKey: 'rejected',
      label: 'Rejected',
      badgeClass: 'text-status-error bg-status-error/10 border-status-error/20',
      iconClass: 'lni lni-close',
      canVerify: false,
      disabledReason: 'Verification was rejected; user must re-upload in mobile app',
    };
  }

  // 3. Pending Email Verification (User created account but hasn't verified OTP)
  if (
    user.registration_status === 'pending_email_verification' ||
    !user.email_verified_at
  ) {
    return {
      statusKey: 'pending_email',
      label: 'Pending Email OTP',
      badgeClass: 'text-sky-700 bg-sky-50 border-sky-200',
      iconClass: 'lni lni-envelope text-sky-600',
      canVerify: false,
      disabledReason: 'User has not verified email address yet',
    };
  }

  const hasDocs = hasSubmittedDocs(user);

  // 4. Pending ID Upload (User verified email, but has NOT uploaded ID yet)
  if (!hasDocs || user.registration_status === 'pending_id_upload') {
    return {
      statusKey: 'pending_id_upload',
      label: 'Pending ID Upload',
      badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
      iconClass: 'lni lni-timer text-amber-600',
      canVerify: false,
      disabledReason: 'Cannot verify: User has not uploaded identification documents yet',
    };
  }

  // 5. Pending Review (User uploaded documents, awaiting admin KYC decision)
  if (
    user.registration_status === 'pending_review' ||
    user.verification_status === 'pending' ||
    hasDocs
  ) {
    return {
      statusKey: 'pending_review',
      label: 'Pending Review',
      badgeClass: 'text-status-gold bg-status-gold/10 border-status-gold/20',
      iconClass: 'lni lni-warning text-status-warning',
      canVerify: true,
    };
  }

  // 6. Fallback Unverified
  return {
    statusKey: 'unverified',
    label: 'Unverified',
    badgeClass: 'text-ink-muted bg-paper border-ink-faint',
    iconClass: 'lni lni-user',
    canVerify: false,
    disabledReason: 'Cannot verify: User has not submitted documents',
  };
}

export interface MissingRequirementsInfo {
  missingItems: string[];
  isComplete: boolean;
  summary: string;
}

export function getMissingRequirements(user: any): MissingRequirementsInfo {
  if (!user) return { missingItems: ['User record missing'], isComplete: false, summary: 'No user data' };

  const missing: string[] = [];
  const front = Boolean(user.document_url || (user as any).document_front_url || (user as any).id_front_url);
  const back = Boolean(user.document_back_url || (user as any).id_back_url);
  const selfie = Boolean(user.selfie_url || (user as any).id_selfie_url);
  const business = Array.isArray(user.business_documents)
    ? user.business_documents.length > 0
    : (typeof user.business_documents === 'string' && user.business_documents.trim() !== '' && user.business_documents !== '[]');

  if (user.role === 'employer') {
    if (!front) missing.push('Representative ID');
    if (!business) missing.push('Business Permit');
  } else {
    if (!front) missing.push('Front of ID');
    if (!back) missing.push('Back of ID');
    if (!selfie) missing.push('Selfie holding ID');
  }

  const isComplete = missing.length === 0;
  const summary = isComplete
    ? 'All required documents submitted'
    : `Missing ${missing.join(', ')}`;

  return { missingItems: missing, isComplete, summary };
}

export interface SlaStatusInfo {
  durationText: string;
  label: string;
  modalLabel: string;
  color: string;
  isOverdue: boolean;
  badge: 'overdue' | 'urgent' | 'priority' | 'normal';
  diffHours: number;
}

/**
 * Formats exact real-time elapsed duration in queue without artificially clamping sub-hour times to "1h".
 */
export function formatQueueDuration(
  submittedDate: string | Date | undefined,
  nowMs: number = Date.now(),
  includeSecondsUnderHour: boolean = true
): string {
  if (!submittedDate) return 'Just now';
  const parsed = new Date(submittedDate).getTime();
  if (Number.isNaN(parsed)) return 'Just now';

  const diffMs = Math.max(0, nowMs - parsed);
  const totalSeconds = Math.floor(diffMs / 1000);

  if (totalSeconds < 60) {
    return `${Math.max(1, totalSeconds)}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const remSeconds = totalSeconds % 60;

  if (totalMinutes < 60) {
    return includeSecondsUnderHour ? `${totalMinutes}m ${remSeconds}s` : `${totalMinutes}m`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;

  if (totalHours < 48) {
    return remMinutes > 0 ? `${totalHours}h ${remMinutes}m` : `${totalHours}h`;
  }

  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  return remHours > 0 ? `${days}d ${remHours}h (${totalHours}h)` : `${days}d (${totalHours}h)`;
}

/**
 * Automated 4-tier SLA Aging Engine (<12h Normal | 12-24h Priority | 24-48h Urgent | >=48h Overdue)
 * with real-time minute/second precision.
 */
export function getSlaStatus(
  submittedDate: string | Date | undefined,
  nowMs: number = Date.now(),
  includeSecondsUnderHour: boolean = true
): SlaStatusInfo {
  if (!submittedDate) {
    return {
      durationText: 'Just now',
      label: 'Just now (Normal)',
      modalLabel: 'SLA: Just now in queue',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      isOverdue: false,
      badge: 'normal',
      diffHours: 0,
    };
  }

  const parsed = new Date(submittedDate).getTime();
  if (Number.isNaN(parsed)) {
    return {
      durationText: 'Just now',
      label: 'Just now (Normal)',
      modalLabel: 'SLA: Just now in queue',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
      isOverdue: false,
      badge: 'normal',
      diffHours: 0,
    };
  }

  const diffMs = Math.max(0, nowMs - parsed);
  const diffHours = diffMs / (1000 * 60 * 60);
  const durationText = formatQueueDuration(submittedDate, nowMs, includeSecondsUnderHour);

  if (diffHours >= 48) {
    return {
      durationText,
      label: `${durationText} (Overdue)`,
      modalLabel: `SLA: ${durationText} in queue (Overdue)`,
      color: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
      isOverdue: true,
      badge: 'overdue',
      diffHours,
    };
  }
  if (diffHours >= 24) {
    return {
      durationText,
      label: `${durationText} (Urgent)`,
      modalLabel: `SLA: ${durationText} in queue (Urgent)`,
      color: 'bg-amber-50 text-amber-700 border-amber-300 font-semibold',
      isOverdue: false,
      badge: 'urgent',
      diffHours,
    };
  }
  if (diffHours >= 12) {
    return {
      durationText,
      label: `${durationText} (Priority)`,
      modalLabel: `SLA: ${durationText} in queue (Priority)`,
      color: 'bg-sky-50 text-sky-700 border-sky-200 font-medium',
      isOverdue: false,
      badge: 'priority',
      diffHours,
    };
  }
  return {
    durationText,
    label: `${durationText} (Normal)`,
    modalLabel: `SLA: ${durationText} in queue`,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium',
    isOverdue: false,
    badge: 'normal',
    diffHours,
  };
}

