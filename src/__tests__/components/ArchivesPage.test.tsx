import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArchivesPage from '@/app/dashboard/archives/page';
import { adminApi } from '@/lib/api';

// Mock the adminApi methods
vi.mock('@/lib/api', () => ({
  adminApi: {
    getUsers: vi.fn(),
    getJobs: vi.fn(),
    restoreUser: vi.fn(),
    restoreJob: vi.fn(),
  },
}));

describe('ArchivesPage Component', () => {
  const mockDeletedUsers = [
    {
      id: 10,
      name: 'Deleted User One',
      email: 'deleted1@example.com',
      role: 'worker',
      deleted_at: '2026-08-17T01:00:00Z',
    },
  ];

  const mockDeletedJobs = [
    {
      id: 20,
      title: 'Deleted Painter Job',
      employer: {
        name: 'Jane Smith',
      },
      deleted_at: '2026-08-17T02:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getUsers).mockResolvedValue({
      data: { success: true, data: mockDeletedUsers },
    } as any);
    vi.mocked(adminApi.getJobs).mockResolvedValue({
      data: { success: true, data: mockDeletedJobs },
    } as any);
  });

  it('fetches and displays deleted users and jobs on render', async () => {
    render(<ArchivesPage />);

    expect(adminApi.getUsers).toHaveBeenCalledWith(true);
    expect(adminApi.getJobs).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(screen.getByText('Deleted User One')).toBeInTheDocument();
    });

    // Click Deleted Jobs tab
    const jobsTab = screen.getByRole('button', { name: /Deleted Jobs/i });
    fireEvent.click(jobsTab);

    await waitFor(() => {
      expect(screen.getByText('Deleted Painter Job')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles restoring a user successfully', async () => {
    // Mock confirmation dialog to click "OK"
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    vi.mocked(adminApi.restoreUser).mockResolvedValue({
      data: { success: true, message: 'User restored' },
    } as any);

    render(<ArchivesPage />);

    await waitFor(() => {
      expect(screen.getByText('Deleted User One')).toBeInTheDocument();
    });

    // Get the restore button for the user and click it
    const restoreBtn = screen.getAllByRole('button', { name: /restore/i })[0];
    fireEvent.click(restoreBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(adminApi.restoreUser).toHaveBeenCalledWith(10);
  });

  it('handles restoring a job successfully', async () => {
    // Mock confirmation dialog to click "OK"
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    vi.mocked(adminApi.restoreJob).mockResolvedValue({
      data: { success: true, message: 'Job restored' },
    } as any);

    render(<ArchivesPage />);

    await waitFor(() => {
      expect(screen.getByText('Deleted User One')).toBeInTheDocument();
    });

    // Click Deleted Jobs tab
    const jobsTab = screen.getByRole('button', { name: /Deleted Jobs/i });
    fireEvent.click(jobsTab);

    await waitFor(() => {
      expect(screen.getByText('Deleted Painter Job')).toBeInTheDocument();
    });

    // Get the restore button for the job and click it
    const restoreBtn = screen.getAllByRole('button', { name: /restore/i })[0];
    fireEvent.click(restoreBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(adminApi.restoreJob).toHaveBeenCalledWith(20);
  });
});
