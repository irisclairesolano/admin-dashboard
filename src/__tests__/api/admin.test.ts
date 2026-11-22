import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminApi, apiClient, clearApiCache, prefetchAll, prefetchRouteData } from '@/api/admin';

describe('Admin API Suite', () => {
  beforeEach(() => {
    clearApiCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching Users', () => {
    it('should fetch active users list via GET /admin/users', async () => {
      const mockUsers = [
        { id: 1, name: 'John Doe', email: 'john@example.com', registration_status: 'approved' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', registration_status: 'pending_review' },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockUsers },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const response = await adminApi.getUsers();

      expect(apiClient.get).toHaveBeenCalledWith('/admin/users');
      expect(response.data.data).toEqual(mockUsers);
      expect(response.data.data).toHaveLength(2);
    });

    it('should fetch trashed users list via GET /admin/users?trashed=1', async () => {
      const mockTrashedUsers = [
        { id: 3, name: 'Deleted User', email: 'deleted@example.com', is_deleted: true },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockTrashedUsers },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const response = await adminApi.getUsers(true);

      expect(apiClient.get).toHaveBeenCalledWith('/admin/users?trashed=1');
      expect(response.data.data).toEqual(mockTrashedUsers);
    });

    it('should fetch ID verifications pending list via GET /admin/verifications', async () => {
      const mockVerifications = [
        { id: 10, name: 'Applicant One', registration_status: 'pending_review' },
      ];

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        data: { success: true, data: mockVerifications },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const response = await adminApi.getVerifications();

      expect(apiClient.get).toHaveBeenCalledWith('/admin/verifications');
      expect(response.data.data).toEqual(mockVerifications);
    });
  });

  describe('Updating User Statuses', () => {
    it('should suspend a user via PATCH /admin/users/:id', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { success: true, message: 'User suspended successfully' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const userId = 5;
      const response = await adminApi.suspendUser(userId, true);

      expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/5', { is_suspended: true });
      expect(response.data.message).toBe('User suspended successfully');
    });

    it('should unsuspend a user via PATCH /admin/users/:id', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { success: true, message: 'User unsuspended successfully' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const userId = 5;
      const response = await adminApi.suspendUser(userId, false);

      expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/5', { is_suspended: false });
      expect(response.data.message).toBe('User unsuspended successfully');
    });

    it('should approve a user ID verification via PATCH /admin/users/:id/verify', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { success: true, message: 'User verified successfully' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const userId = 10;
      const response = await adminApi.verifyUser(userId, 'approved');

      expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/10/verify', {
        status: 'approved',
        rejection_reason: undefined,
      });
      expect(response.data.message).toBe('User verified successfully');
    });

    it('should reject a user ID verification with reason via PATCH /admin/users/:id/verify', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { success: true, message: 'User verification rejected' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const userId = 10;
      const reason = 'Blurry photo';
      const response = await adminApi.verifyUser(userId, 'rejected', reason);

      expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/10/verify', {
        status: 'rejected',
        rejection_reason: 'Blurry photo',
      });
      expect(response.data.message).toBe('User verification rejected');
    });

    it('should delete a user via DELETE /admin/users/:id with optional reason', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
        data: { success: true, message: 'User deleted' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const response = await adminApi.deleteUser(7, 'Violation of Terms');

      expect(apiClient.delete).toHaveBeenCalledWith('/admin/users/7', { data: { reason: 'Violation of Terms' } });
      expect(response.data.message).toBe('User deleted');
    });

    it('should restore a user via PATCH /admin/users/:id/restore', async () => {
      vi.spyOn(apiClient, 'patch').mockResolvedValueOnce({
        data: { success: true, message: 'User restored' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const response = await adminApi.restoreUser(7);

      expect(apiClient.patch).toHaveBeenCalledWith('/admin/users/7/restore');
      expect(response.data.message).toBe('User restored');
    });
  });

  describe('Page Navigation Prefetching & Cache Hit Alignment', () => {
    it('prefetchAll warms the exact query strings requested by Verifications, Users, Jobs, Moderation, Blacklist, Profanity, Skills, and Support pages', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => ({
        data: { success: true, data: [{ id: 1, url }] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      }));

      await prefetchAll();

      expect(getSpy).toHaveBeenCalledWith('/admin/verifications?all=1&status=all');
      expect(getSpy).toHaveBeenCalledWith('/admin/users?all=1');
      expect(getSpy).toHaveBeenCalledWith('/admin/jobs?all=1');
      expect(getSpy).toHaveBeenCalledWith('/admin/reports?status=open&page=1');
      expect(getSpy).toHaveBeenCalledWith('/admin/support');
      expect(getSpy).toHaveBeenCalledWith('/admin/blacklist?page=1');
      expect(getSpy).toHaveBeenCalledWith('/admin/profanity-words');
      expect(getSpy).toHaveBeenCalledWith('/admin/skills');

      const callsAfterPrefetch = getSpy.mock.calls.length;

      // Subsequent initial loads on those pages hit the warm cache with zero extra network calls
      await adminApi.getVerifications(true, false);
      await adminApi.getUsers({ trashed: false, all: true, forceRefresh: false });
      await adminApi.getJobs({ trashed: false, all: true, forceRefresh: false });
      await adminApi.getReports('open', 1, '', false, false);
      await adminApi.getSupportTickets(false);
      await adminApi.getBlacklist('all', 1, '');
      await adminApi.getProfanityWords();
      await adminApi.getSkillsCatalog(false);

      expect(getSpy.mock.calls.length).toBe(callsAfterPrefetch);
    });

    it('prefetchRouteData warms route-specific endpoints on sidebar hover/focus', async () => {
      const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({
        data: { success: true, data: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      prefetchRouteData('/dashboard/users');
      prefetchRouteData('/dashboard/jobs');
      prefetchRouteData('/dashboard/verifications');

      expect(getSpy).toHaveBeenCalledWith('/admin/users?all=1');
      expect(getSpy).toHaveBeenCalledWith('/admin/jobs?all=1');
      expect(getSpy).toHaveBeenCalledWith('/admin/verifications?all=1&status=all');
    });

    it('returns fresh sessionStorage entries immediately with zero network requests', async () => {
      const url = '/admin/profanity-words';
      const cachedPayload = { data: { data: ['badword'] }, status: 200 };
      sessionStorage.setItem('api_cache_' + url, JSON.stringify(cachedPayload));
      sessionStorage.setItem('api_cache_time_' + url, Date.now().toString());

      const getSpy = vi.spyOn(apiClient, 'get');

      const res = await adminApi.getProfanityWords();
      expect(res.data.data).toEqual(['badword']);
      expect(getSpy).not.toHaveBeenCalled();
    });
  });
});
