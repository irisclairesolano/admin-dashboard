import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminApi, apiClient, clearApiCache } from '@/api/admin';

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

    it('should delete a user via DELETE /admin/users/:id', async () => {
      vi.spyOn(apiClient, 'delete').mockResolvedValueOnce({
        data: { success: true, message: 'User deleted' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      });

      const response = await adminApi.deleteUser(7);

      expect(apiClient.delete).toHaveBeenCalledWith('/admin/users/7');
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
});
