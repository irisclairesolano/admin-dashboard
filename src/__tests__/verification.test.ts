import { describe, it, expect } from 'vitest';
import {
  getWaitingStartTime,
  getWaitingDurationInfo,
  getWaitingAccountStats,
} from '@/lib/verification';

describe('Verification & Action Required Telemetries', () => {
  const baseNow = new Date('2026-11-14T12:00:00Z').getTime();

  describe('getWaitingStartTime', () => {
    it('accurately tracks waiting-start time from created_at for users pending email OTP', () => {
      const user = {
        id: 1,
        name: 'Worker Juan',
        registration_status: 'pending_email_verification',
        email_verified_at: null,
        created_at: '2026-11-14T08:00:00Z',
        updated_at: '2026-11-14T08:00:00Z',
      };

      const startInfo = getWaitingStartTime(user);
      expect(startInfo.reasonKey).toBe('pending_otp');
      expect(startInfo.startTime).toBe('2026-11-14T08:00:00Z');
      expect(startInfo.eventName).toBe('Account Registration');
    });

    it('accurately tracks waiting-start time from email_verified_at for users pending initial ID upload', () => {
      const user = {
        id: 2,
        name: 'Worker Maria',
        registration_status: 'pending_id_upload',
        email_verified_at: '2026-11-14T09:30:00Z',
        created_at: '2026-11-14T09:00:00Z',
        document_url: null,
        document_back_url: null,
        selfie_url: null,
      };

      const startInfo = getWaitingStartTime(user);
      expect(startInfo.reasonKey).toBe('pending_id_upload');
      expect(startInfo.startTime).toBe('2026-11-14T09:30:00Z');
      expect(startInfo.eventName).toBe('OTP Verification');
    });

    it('accurately tracks waiting-start time from updated_at for rejected users awaiting re-upload', () => {
      const user = {
        id: 3,
        name: 'Employer Carlos',
        verification_status: 'rejected',
        registration_status: 'rejected',
        rejection_reason: 'Blurry document',
        created_at: '2026-11-10T08:00:00Z',
        updated_at: '2026-11-12T10:00:00Z',
      };

      const startInfo = getWaitingStartTime(user);
      expect(startInfo.reasonKey).toBe('rejected_reupload');
      expect(startInfo.startTime).toBe('2026-11-12T10:00:00Z');
      expect(startInfo.eventName).toBe('Admin Rejection');
    });
  });

  describe('getWaitingDurationInfo & Aging Buckets', () => {
    it('categorizes under 12 hours as <12h fresh', () => {
      const startTime = new Date(baseNow - 4 * 3600 * 1000).toISOString(); // 4 hours ago
      const info = getWaitingDurationInfo(startTime, baseNow);
      expect(info.agingBucket).toBe('<12h');
      expect(info.isStalled).toBe(false);
      expect(info.durationHours).toBeCloseTo(4, 1);
    });

    it('categorizes 12 to 24 hours as 12-24h priority', () => {
      const startTime = new Date(baseNow - 16 * 3600 * 1000).toISOString(); // 16 hours ago
      const info = getWaitingDurationInfo(startTime, baseNow);
      expect(info.agingBucket).toBe('12-24h');
      expect(info.isStalled).toBe(false);
      expect(info.durationHours).toBeCloseTo(16, 1);
    });

    it('categorizes 24 to 48 hours as 24-48h urgent', () => {
      const startTime = new Date(baseNow - 36 * 3600 * 1000).toISOString(); // 36 hours ago
      const info = getWaitingDurationInfo(startTime, baseNow);
      expect(info.agingBucket).toBe('24-48h');
      expect(info.isStalled).toBe(false);
      expect(info.durationHours).toBeCloseTo(36, 1);
    });

    it('categorizes over 48 hours as >48h stalled', () => {
      const startTime = new Date(baseNow - 52 * 3600 * 1000).toISOString(); // 52 hours ago
      const info = getWaitingDurationInfo(startTime, baseNow);
      expect(info.agingBucket).toBe('>48h');
      expect(info.isStalled).toBe(true);
      expect(info.durationHours).toBeCloseTo(52, 1);
    });
  });

  describe('getWaitingAccountStats', () => {
    it('computes accurate unique counts, reason breakdown, duration averages, and longest waiting user', () => {
      const users = [
        // User 1: Pending OTP (10h ago)
        {
          id: 101,
          name: 'User One',
          role: 'worker',
          registration_status: 'pending_email_verification',
          email_verified_at: null,
          created_at: new Date(baseNow - 10 * 3600 * 1000).toISOString(),
        },
        // User 2: Pending ID Upload (20h ago)
        {
          id: 102,
          name: 'User Two',
          role: 'worker',
          registration_status: 'pending_id_upload',
          email_verified_at: new Date(baseNow - 20 * 3600 * 1000).toISOString(),
          created_at: new Date(baseNow - 25 * 3600 * 1000).toISOString(),
          document_url: null,
          document_back_url: null,
          selfie_url: null,
        },
        // User 3: Awaiting Re-upload Post-Rejection (60h ago - Stalled)
        {
          id: 103,
          name: 'User Three',
          role: 'employer',
          registration_status: 'rejected',
          verification_status: 'rejected',
          rejection_reason: 'Invalid permit',
          created_at: new Date(baseNow - 70 * 3600 * 1000).toISOString(),
          updated_at: new Date(baseNow - 60 * 3600 * 1000).toISOString(),
          business_documents: null,
        },
      ];

      const stats = getWaitingAccountStats(users, baseNow);

      expect(stats.totalUnique).toBe(3);
      expect(stats.byRole.worker).toBe(2);
      expect(stats.byRole.employer).toBe(1);

      // Reason breakdown
      expect(stats.byReason.pendingOtp.count).toBe(1);
      expect(stats.byReason.pendingIdUpload.count).toBe(1);
      expect(stats.byReason.rejectedReupload.count).toBe(1);

      // Aging breakdown
      expect(stats.byAging.under12h.count).toBe(1); // 10h
      expect(stats.byAging.h12to24.count).toBe(1);  // 20h
      expect(stats.byAging.over48h.count).toBe(1);  // 60h

      // Longest waiting user should be User Three (60h)
      expect(stats.durationMetrics.longestWaiting?.user.id).toBe(103);
      expect(stats.durationMetrics.longestWaiting?.hours).toBeCloseTo(60, 1);

      // Average hours: (10 + 20 + 60) / 3 = 30 hours
      expect(stats.durationMetrics.avgHours).toBeCloseTo(30, 1);

      // Median hours: sorted [10, 20, 60] -> 20 hours
      expect(stats.durationMetrics.medianHours).toBeCloseTo(20, 1);
    });

    it('safely handles empty users array', () => {
      const stats = getWaitingAccountStats([], baseNow);
      expect(stats.totalUnique).toBe(0);
      expect(stats.byRole.worker).toBe(0);
      expect(stats.durationMetrics.avgHours).toBe(0);
      expect(stats.durationMetrics.longestWaiting).toBeNull();
    });
  });
});
