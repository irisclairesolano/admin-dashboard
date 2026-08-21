import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UsersPage from '@/app/dashboard/users/page';
import { adminApi } from '@/lib/api';

// Mock the adminApi methods
vi.mock('@/lib/api', () => ({
  adminApi: {
    getUsers: vi.fn(),
    suspendUser: vi.fn(),
    deleteUser: vi.fn(),
  },
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
      is_suspended: false,
    },
    {
      id: 2,
      name: 'Jose Santos',
      email: 'jose@example.com',
      role: 'employer',
      verification_status: 'pending',
      registration_status: 'pending_review',
      created_at: '2026-08-16T00:00:00Z',
      is_suspended: false,
    },
    {
      id: 3,
      name: 'Suspended Worker',
      email: 'suspended@example.com',
      role: 'worker',
      verification_status: 'approved',
      registration_status: 'approved',
      created_at: '2026-08-15T00:00:00Z',
      is_suspended: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getUsers).mockResolvedValue({
      data: { success: true, data: mockUsers },
    } as any);
  });

  it('fetches and renders user management table on load', async () => {
    render(<UsersPage />);

    expect(adminApi.getUsers).toHaveBeenCalledTimes(1);

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
    const roleSelect = screen.getByRole('combobox');
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

    // Click suspend button for Nena Cruz (index 0)
    const suspendButtons = screen.getAllByRole('button', { name: /suspend/i });
    fireEvent.click(suspendButtons[0]);

    // Click Confirm in custom AlertDialog
    const confirmBtn = screen.getByRole('button', { name: /Confirm/i });
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

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    // Click Confirm in custom AlertDialog
    const confirmBtn = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmBtn);

    expect(adminApi.deleteUser).toHaveBeenCalledWith(1);
  });
});
