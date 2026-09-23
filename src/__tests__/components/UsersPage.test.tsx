import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UsersPage from '@/app/dashboard/users/page';
import { adminApi } from '@/lib/api';

// Mock the adminApi methods used by the UsersPage component
vi.mock('@/lib/api', () => ({
  adminApi: {
    getUsers: vi.fn(),
    suspendUser: vi.fn(),
    deleteUser: vi.fn(),
    getUserDetails: vi.fn(),
    getUserApplications: vi.fn(),
    getUserPosts: vi.fn(),
    getUserHired: vi.fn(),
    getUserReviews: vi.fn(),
    getUserReports: vi.fn(),
    getUserLogs: vi.fn(),
    restoreUser: vi.fn(),
    verifyUser: vi.fn(),
  },
}));

// Mock next/navigation used inside UsersContent
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn(() => null) }),
}));

describe('UsersPage Component', () => {
  const mockUsers = [
    {
      id: 1,
      name: 'Nena Cruz',
      email: 'nena@example.com',
      role: 'employer',
      verification_status: 'approved',
      registration_status: 'approved',
      created_at: '2026-08-17T00:00:00Z',
      updated_at: '2026-08-17T00:00:00Z',
      is_suspended: false,
      deleted_at: null,
    },
    {
      id: 2,
      name: 'Jose Santos',
      email: 'jose@example.com',
      role: 'employer',
      verification_status: 'pending',
      registration_status: 'pending_review',
      created_at: '2026-08-16T00:00:00Z',
      updated_at: '2026-08-16T00:00:00Z',
      is_suspended: false,
      deleted_at: null,
    },
    {
      id: 3,
      name: 'Suspended Worker',
      email: 'suspended@example.com',
      role: 'worker',
      verification_status: 'approved',
      registration_status: 'approved',
      created_at: '2026-08-15T00:00:00Z',
      updated_at: '2026-08-15T00:00:00Z',
      is_suspended: true,
      deleted_at: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock both active and trashed user calls
    vi.mocked(adminApi.getUsers).mockResolvedValue({
      data: { success: true, data: mockUsers },
    } as any);
    // Silence any other API calls the component makes on mount
    vi.mocked(adminApi.getUserDetails).mockResolvedValue({ data: {} } as any);
    vi.mocked(adminApi.getUserApplications).mockResolvedValue({ data: { data: [], last_page: 1 } } as any);
    vi.mocked(adminApi.getUserPosts).mockResolvedValue({ data: { data: [], last_page: 1 } } as any);
    vi.mocked(adminApi.getUserHired).mockResolvedValue({ data: { data: [], last_page: 1 } } as any);
    vi.mocked(adminApi.getUserReviews).mockResolvedValue({ data: { data: [], last_page: 1 } } as any);
    vi.mocked(adminApi.getUserReports).mockResolvedValue({ data: { data: [], last_page: 1 } } as any);
    vi.mocked(adminApi.getUserLogs).mockResolvedValue({ data: { data: [], last_page: 1 } } as any);
  });

  it('fetches and renders user management table on load', async () => {
    render(<UsersPage />);

    expect(adminApi.getUsers).toHaveBeenCalledWith(expect.objectContaining({
      trashed: false,
      all: true,
    }));
    expect(adminApi.getUsers).toHaveBeenCalledWith(expect.objectContaining({
      trashed: true,
      all: true,
    }));

    await waitFor(() => {
      expect(screen.getByText('Nena Cruz')).toBeInTheDocument();
      expect(screen.getByText('Jose Santos')).toBeInTheDocument();
      expect(screen.getByText('Suspended Worker')).toBeInTheDocument();
    });
  });

  it('filters users list by search query and role filter', async () => {
    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Nena Cruz')).toBeInTheDocument();
    });

    // Use search box
    const searchInput = screen.getByPlaceholderText(/search users by name/i);
    fireEvent.change(searchInput, { target: { value: 'Nena' } });

    expect(screen.getByText('Nena Cruz')).toBeInTheDocument();
    expect(screen.queryByText('Jose Santos')).not.toBeInTheDocument();

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });

    // Use role select dropdown
    const roleSelect = screen.getByRole('combobox', { name: /filter by user role/i });
    fireEvent.change(roleSelect, { target: { value: 'worker' } });

    expect(screen.queryByText('Nena Cruz')).not.toBeInTheDocument();
    expect(screen.getByText('Suspended Worker')).toBeInTheDocument();
  });

  it('handles suspending and unsuspending a user', async () => {
    vi.mocked(adminApi.suspendUser).mockResolvedValue({
      data: { success: true, message: 'Status updated' },
    } as any);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Nena Cruz')).toBeInTheDocument();
    });

    // Click the Suspend button for Nena Cruz (first non-suspended user)
    const suspendButtons = screen.getAllByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButtons[0]);

    // Wait for the AlertDialog to render asynchronously, then confirm
    const confirmBtn = await screen.findByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmBtn);

    expect(adminApi.suspendUser).toHaveBeenCalledWith(1, true);
  });

  it('handles soft deleting a user', async () => {
    vi.mocked(adminApi.deleteUser).mockResolvedValue({
      data: { success: true, message: 'User deleted' },
    } as any);

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Nena Cruz')).toBeInTheDocument();
    });

    // Find all Delete buttons — use getAllByText for exact button text match
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    // Click the first Delete button (Nena Cruz, id=1)
    fireEvent.click(deleteButtons[0]);

    // Wait for the AlertDialog Confirm button to appear after state update
    const confirmBtn = await screen.findByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmBtn);

    expect(adminApi.deleteUser).toHaveBeenCalledWith(1);
  });

  it('clicking show archived includes archived users on the list alongside active users', async () => {
    const activeList = [
      {
        id: 10,
        name: 'Active Worker',
        email: 'active@example.com',
        role: 'worker',
        verification_status: 'approved',
        registration_status: 'approved',
        created_at: '2026-08-17T00:00:00Z',
        is_suspended: false,
        deleted_at: null,
      },
    ];
    const archivedList = [
      {
        id: 11,
        name: 'Archived Worker',
        email: 'archived@example.com',
        role: 'worker',
        verification_status: 'approved',
        registration_status: 'approved',
        created_at: '2026-08-10T00:00:00Z',
        is_suspended: false,
        deleted_at: '2026-08-18T00:00:00Z',
      },
    ];

    vi.mocked(adminApi.getUsers).mockImplementation(async (params: any) => {
      if (params?.trashed) {
        return { data: { success: true, data: archivedList } } as any;
      }
      return { data: { success: true, data: activeList } } as any;
    });

    render(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Active Worker')).toBeInTheDocument();
    });
    // Initially, archived worker should NOT be in the document
    expect(screen.queryByText('Archived Worker')).not.toBeInTheDocument();

    // Find the "Show Archived" checkbox
    const showArchivedCheckbox = screen.getByRole('checkbox', { name: /show archived users/i });
    expect(showArchivedCheckbox).not.toBeChecked();

    // Check "Show Archived"
    fireEvent.click(showArchivedCheckbox);

    // Both active worker AND archived worker should now be present on the list!
    await waitFor(() => {
      expect(screen.getByText('Active Worker')).toBeInTheDocument();
      expect(screen.getByText('Archived Worker')).toBeInTheDocument();
    });

    // Uncheck "Show Archived"
    fireEvent.click(showArchivedCheckbox);

    // Archived worker should disappear, active worker remains
    await waitFor(() => {
      expect(screen.getByText('Active Worker')).toBeInTheDocument();
      expect(screen.queryByText('Archived Worker')).not.toBeInTheDocument();
    });
  });
});

