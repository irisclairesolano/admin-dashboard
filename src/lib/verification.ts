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
      badgeClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      iconClass: 'lni lni-checkmark-circle text-emerald-600 dark:text-emerald-400',
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
      badgeClass: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
      iconClass: 'lni lni-close text-rose-600 dark:text-rose-400',
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
      badgeClass: 'text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80',
      iconClass: 'lni lni-envelope text-slate-500 dark:text-slate-400',
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
      badgeClass: 'text-slate-700 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80',
      iconClass: 'lni lni-timer text-slate-500 dark:text-slate-400',
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
      badgeClass: 'text-amber-800 dark:text-amber-300 bg-amber-500/10 border-amber-500/20',
      iconClass: 'lni lni-warning text-amber-600 dark:text-amber-400',
      canVerify: true,
    };
  }

  // 6. Fallback Unverified
  return {
    statusKey: 'unverified',
    label: 'Unverified',
    badgeClass: 'text-slate-600 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80',
    iconClass: 'lni lni-user text-slate-400',
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
      modalLabel: 'Wait: Just now in queue',
      color: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 font-medium',
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
      modalLabel: 'Wait: Just now in queue',
      color: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 font-medium',
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
      modalLabel: `Wait: ${durationText} in queue (Overdue)`,
      color: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/25 font-semibold',
      isOverdue: true,
      badge: 'overdue',
      diffHours,
    };
  }
  if (diffHours >= 24) {
    return {
      durationText,
      label: `${durationText} (Urgent)`,
      modalLabel: `Wait: ${durationText} in queue (Urgent)`,
      color: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-medium',
      isOverdue: false,
      badge: 'urgent',
      diffHours,
    };
  }
  if (diffHours >= 12) {
    return {
      durationText,
      label: `${durationText} (Priority)`,
      modalLabel: `Wait: ${durationText} in queue (Priority)`,
      color: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 font-medium',
      isOverdue: false,
      badge: 'priority',
      diffHours,
    };
  }
  return {
    durationText,
    label: `${durationText} (Normal)`,
    modalLabel: `Wait: ${durationText} in queue`,
    color: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 font-medium',
    isOverdue: false,
    badge: 'normal',
    diffHours,
  };
}

export type WaitingReasonKey = 'pending_otp' | 'pending_id_upload' | 'rejected_reupload';
export type AgingBucketKey = '<12h' | '12-24h' | '24-48h' | '>48h';

export interface WaitingStartTimeInfo {
  startTime: string | null;
  label: string;
  reasonKey: WaitingReasonKey;
  reasonLabel: string;
  eventName: string;
}

/**
 * Accurately determines the waiting-start timestamp and underlying trigger event:
 * - Awaiting Re-upload: waiting starts when admin rejected documents (`updated_at` || `created_at`)
 * - Pending Email OTP: waiting starts at initial registration (`created_at`)
 * - Pending ID Upload: waiting starts once OTP is completed (`email_verified_at` || `created_at`)
 */
export function getWaitingStartTime(user: any): WaitingStartTimeInfo {
  if (!user) {
    return {
      startTime: null,
      label: 'Unknown',
      reasonKey: 'pending_id_upload',
      reasonLabel: 'Pending ID Upload',
      eventName: 'Registration',
    };
  }

  const isRejected = user.verification_status === 'rejected' || user.registration_status === 'rejected';
  if (isRejected) {
    return {
      startTime: user.updated_at || user.created_at || null,
      label: 'Rejected',
      reasonKey: 'rejected_reupload',
      reasonLabel: 'Awaiting Re-upload (Post-Rejection)',
      eventName: 'Admin Rejection',
    };
  }

  const isPendingOtp = user.registration_status === 'pending_email_verification' || !user.email_verified_at;
  if (isPendingOtp) {
    return {
      startTime: user.created_at || null,
      label: 'Registered',
      reasonKey: 'pending_otp',
      reasonLabel: 'Pending Email OTP',
      eventName: 'Account Registration',
    };
  }

  // Email verified, awaiting initial ID / permit upload
  return {
    startTime: user.email_verified_at || user.created_at || null,
    label: 'OTP Verified',
    reasonKey: 'pending_id_upload',
    reasonLabel: 'Pending ID Upload',
    eventName: 'OTP Verification',
  };
}

export interface WaitingDurationInfo {
  durationMs: number;
  durationHours: number;
  durationText: string;
  agingBucket: AgingBucketKey;
  agingLabel: string;
  badgeClass: string;
  isStalled: boolean;
}

/**
 * Calculates exact waiting duration elapsed and assigns standardized 4-tier aging SLA buckets:
 * - <12h: Fresh / Normal (Emerald)
 * - 12-24h: Priority (Sky)
 * - 24-48h: Urgent (Amber)
 * - >48h: Stalled / Overdue (Rose)
 */
export function getWaitingDurationInfo(
  startTime: string | null | undefined,
  nowMs: number = Date.now()
): WaitingDurationInfo {
  if (!startTime) {
    return {
      durationMs: 0,
      durationHours: 0,
      durationText: 'Just now',
      agingBucket: '<12h',
      agingLabel: '< 12h (Fresh)',
      badgeClass: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80',
      isStalled: false,
    };
  }

  const startMs = new Date(startTime).getTime();
  if (Number.isNaN(startMs)) {
    return {
      durationMs: 0,
      durationHours: 0,
      durationText: 'Just now',
      agingBucket: '<12h',
      agingLabel: '< 12h (Fresh)',
      badgeClass: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80',
      isStalled: false,
    };
  }

  const durationMs = Math.max(0, nowMs - startMs);
  const durationHours = durationMs / (1000 * 60 * 60);
  const durationText = formatQueueDuration(startTime, nowMs, true);

  if (durationHours >= 48) {
    return {
      durationMs,
      durationHours,
      durationText,
      agingBucket: '>48h',
      agingLabel: '> 48h (Stalled)',
      badgeClass: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/25 font-semibold',
      isStalled: true,
    };
  }

  if (durationHours >= 24) {
    return {
      durationMs,
      durationHours,
      durationText,
      agingBucket: '24-48h',
      agingLabel: '24 – 48h (Urgent)',
      badgeClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20 font-medium',
      isStalled: false,
    };
  }

  if (durationHours >= 12) {
    return {
      durationMs,
      durationHours,
      durationText,
      agingBucket: '12-24h',
      agingLabel: '12 – 24h (Priority)',
      badgeClass: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 font-medium',
      isStalled: false,
    };
  }

  return {
    durationMs,
    durationHours,
    durationText,
    agingBucket: '<12h',
    agingLabel: '< 12h (Fresh)',
    badgeClass: 'bg-slate-100/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 font-medium',
    isStalled: false,
  };
}

export interface WaitingAccountStats {
  totalUnique: number;
  byRole: {
    worker: number;
    employer: number;
    workerPct: number;
    employerPct: number;
  };
  byReason: {
    pendingOtp: { count: number; pct: number; avgHours: number; avgFormatted: string };
    pendingIdUpload: {
      count: number;
      pct: number;
      avgHours: number;
      avgFormatted: string;
      missingFront: number;
      missingBack: number;
      missingSelfie: number;
      missingPermit: number;
    };
    rejectedReupload: { count: number; pct: number; avgHours: number; avgFormatted: string };
  };
  byAging: {
    under12h: { count: number; pct: number };
    h12to24: { count: number; pct: number };
    h24to48: { count: number; pct: number };
    over48h: { count: number; pct: number };
  };
  durationMetrics: {
    avgHours: number;
    avgFormatted: string;
    medianHours: number;
    medianFormatted: string;
    longestWaiting: {
      user: any;
      durationText: string;
      hours: number;
      reasonLabel: string;
    } | null;
  };
}

/**
 * Aggregates complete analytics for all unique accounts awaiting user action.
 */
export function getWaitingAccountStats(users: any[], nowMs: number = Date.now()): WaitingAccountStats {
  const totalUnique = users.length;

  let workerCount = 0;
  let employerCount = 0;

  let otpCount = 0;
  let otpHoursSum = 0;

  let idCount = 0;
  let idHoursSum = 0;
  let missingFront = 0;
  let missingBack = 0;
  let missingSelfie = 0;
  let missingPermit = 0;

  let reuploadCount = 0;
  let reuploadHoursSum = 0;

  let under12hCount = 0;
  let h12to24Count = 0;
  let h24to48Count = 0;
  let over48hCount = 0;

  const allHours: number[] = [];
  let maxDurationHours = -1;
  let longestUserRecord: any = null;
  let longestReasonLabel = '';

  for (const user of users) {
    if (user.role === 'employer') {
      employerCount++;
    } else {
      workerCount++;
    }

    const startInfo = getWaitingStartTime(user);
    const durInfo = getWaitingDurationInfo(startInfo.startTime, nowMs);
    allHours.push(durInfo.durationHours);

    if (durInfo.durationHours > maxDurationHours) {
      maxDurationHours = durInfo.durationHours;
      longestUserRecord = user;
      longestReasonLabel = startInfo.reasonLabel;
    }

    if (durInfo.agingBucket === '<12h') under12hCount++;
    else if (durInfo.agingBucket === '12-24h') h12to24Count++;
    else if (durInfo.agingBucket === '24-48h') h24to48Count++;
    else if (durInfo.agingBucket === '>48h') over48hCount++;

    if (startInfo.reasonKey === 'pending_otp') {
      otpCount++;
      otpHoursSum += durInfo.durationHours;
    } else if (startInfo.reasonKey === 'rejected_reupload') {
      reuploadCount++;
      reuploadHoursSum += durInfo.durationHours;
    } else {
      idCount++;
      idHoursSum += durInfo.durationHours;
      const req = getMissingRequirements(user);
      if (req.missingItems.includes('Front of ID') || req.missingItems.includes('Representative ID')) missingFront++;
      if (req.missingItems.includes('Back of ID')) missingBack++;
      if (req.missingItems.includes('Selfie holding ID')) missingSelfie++;
      if (req.missingItems.includes('Business Permit')) missingPermit++;
    }
  }

  const formatHours = (hrs: number): string => {
    if (hrs <= 0) return '0m';
    if (hrs < 1) return `${Math.max(1, Math.round(hrs * 60))}m`;
    if (hrs < 24) {
      const h = Math.floor(hrs);
      const m = Math.round((hrs - h) * 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    const days = Math.floor(hrs / 24);
    const remHours = Math.round(hrs % 24);
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  };

  const totalSafe = Math.max(1, totalUnique);

  allHours.sort((a, b) => a - b);
  const totalHoursSum = allHours.reduce((acc, h) => acc + h, 0);
  const avgHours = totalUnique > 0 ? totalHoursSum / totalUnique : 0;

  let medianHours = 0;
  if (totalUnique > 0) {
    const mid = Math.floor(totalUnique / 2);
    medianHours = totalUnique % 2 !== 0 ? allHours[mid] : (allHours[mid - 1] + allHours[mid]) / 2;
  }

  return {
    totalUnique,
    byRole: {
      worker: workerCount,
      employer: employerCount,
      workerPct: Math.round((workerCount / totalSafe) * 100),
      employerPct: Math.round((employerCount / totalSafe) * 100),
    },
    byReason: {
      pendingOtp: {
        count: otpCount,
        pct: Math.round((otpCount / totalSafe) * 100),
        avgHours: otpCount > 0 ? otpHoursSum / otpCount : 0,
        avgFormatted: formatHours(otpCount > 0 ? otpHoursSum / otpCount : 0),
      },
      pendingIdUpload: {
        count: idCount,
        pct: Math.round((idCount / totalSafe) * 100),
        avgHours: idCount > 0 ? idHoursSum / idCount : 0,
        avgFormatted: formatHours(idCount > 0 ? idHoursSum / idCount : 0),
        missingFront,
        missingBack,
        missingSelfie,
        missingPermit,
      },
      rejectedReupload: {
        count: reuploadCount,
        pct: Math.round((reuploadCount / totalSafe) * 100),
        avgHours: reuploadCount > 0 ? reuploadHoursSum / reuploadCount : 0,
        avgFormatted: formatHours(reuploadCount > 0 ? reuploadHoursSum / reuploadCount : 0),
      },
    },
    byAging: {
      under12h: { count: under12hCount, pct: Math.round((under12hCount / totalSafe) * 100) },
      h12to24: { count: h12to24Count, pct: Math.round((h12to24Count / totalSafe) * 100) },
      h24to48: { count: h24to48Count, pct: Math.round((h24to48Count / totalSafe) * 100) },
      over48h: { count: over48hCount, pct: Math.round((over48hCount / totalSafe) * 100) },
    },
    durationMetrics: {
      avgHours,
      avgFormatted: formatHours(avgHours),
      medianHours,
      medianFormatted: formatHours(medianHours),
      longestWaiting:
        longestUserRecord && maxDurationHours >= 0
          ? {
              user: longestUserRecord,
              durationText: formatHours(maxDurationHours),
              hours: maxDurationHours,
              reasonLabel: longestReasonLabel,
            }
          : null,
    },
  };
}

