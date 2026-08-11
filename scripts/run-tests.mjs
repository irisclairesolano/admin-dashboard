import assert from 'node:assert/strict';
import test, { describe, it, beforeEach } from 'node:test';

// Import adminApi and apiClient
import { adminApi, apiClient, clearApiCache } from '../src/api/admin.ts';

describe('Admin API Suite (Node Test Runner)', () => {
  let patchCalls = [];
  let getCalls = [];
  let deleteCalls = [];

  beforeEach(() => {
    clearApiCache();
    patchCalls = [];
    getCalls = [];
    deleteCalls = [];

    apiClient.get = async (url) => {
      getCalls.push(url);
      if (url === '/admin/users') {
        return { data: { success: true, data: [{ id: 1, name: 'John Doe' }] } };
      }
      if (url === '/admin/users?trashed=1') {
        return { data: { success: true, data: [{ id: 3, name: 'Trashed User' }] } };
      }
      if (url === '/admin/verifications') {
        return { data: { success: true, data: [{ id: 10, name: 'Pending User' }] } };
      }
      return { data: {} };
    };

    apiClient.patch = async (url, body) => {
      patchCalls.push({ url, body });
      return { data: { success: true, message: 'Updated' } };
    };

    apiClient.delete = async (url) => {
      deleteCalls.push(url);
      return { data: { success: true, message: 'Deleted' } };
    };
  });

  it('getUsers fetches active users list via GET /admin/users', async () => {
    const res = await adminApi.getUsers();
    assert.deepEqual(getCalls, ['/admin/users']);
    assert.equal(res.data.data.length, 1);
    assert.equal(res.data.data[0].name, 'John Doe');
  });

  it('getUsers(true) fetches trashed users list via GET /admin/users?trashed=1', async () => {
    const res = await adminApi.getUsers(true);
    assert.deepEqual(getCalls, ['/admin/users?trashed=1']);
    assert.equal(res.data.data[0].name, 'Trashed User');
  });

  it('getVerifications fetches verifications list via GET /admin/verifications', async () => {
    const res = await adminApi.getVerifications();
    assert.deepEqual(getCalls, ['/admin/verifications']);
    assert.equal(res.data.data[0].name, 'Pending User');
  });

  it('suspendUser suspends user via PATCH /admin/users/:id', async () => {
    await adminApi.suspendUser(5, true);
    assert.deepEqual(patchCalls, [{ url: '/admin/users/5', body: { is_suspended: true } }]);
  });

  it('suspendUser unsuspends user via PATCH /admin/users/:id', async () => {
    await adminApi.suspendUser(5, false);
    assert.deepEqual(patchCalls, [{ url: '/admin/users/5', body: { is_suspended: false } }]);
  });

  it('verifyUser approves verification via PATCH /admin/users/:id/verify', async () => {
    await adminApi.verifyUser(10, 'approved');
    assert.deepEqual(patchCalls, [{ url: '/admin/users/10/verify', body: { status: 'approved', rejection_reason: undefined } }]);
  });

  it('verifyUser rejects verification with reason via PATCH /admin/users/:id/verify', async () => {
    await adminApi.verifyUser(10, 'rejected', 'Blurry photo');
    assert.deepEqual(patchCalls, [{ url: '/admin/users/10/verify', body: { status: 'rejected', rejection_reason: 'Blurry photo' } }]);
  });

  it('deleteUser deletes user via DELETE /admin/users/:id', async () => {
    await adminApi.deleteUser(7);
    assert.deepEqual(deleteCalls, ['/admin/users/7']);
  });

  it('restoreUser restores user via PATCH /admin/users/:id/restore', async () => {
    await adminApi.restoreUser(7);
    assert.deepEqual(patchCalls, [{ url: '/admin/users/7/restore', body: undefined }]);
  });
});
