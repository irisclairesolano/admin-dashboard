import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobsPage from '@/app/dashboard/jobs/page';
import { adminApi } from '@/lib/api';

// Mock the adminApi methods
vi.mock('@/lib/api', () => ({
  adminApi: {
    getJobs: vi.fn(),
    deleteJob: vi.fn(),
    updateJobStatus: vi.fn(),
  },
}));

describe('JobsPage Component', () => {
  const mockJobs = [
    {
      id: 1,
      title: 'Senior House Painter',
      category: 'Domestic',
      barangay: 'San Rafael',
      municipality: 'Bulan',
      compensation: '4500.00',
      duration_type: 'project',
      slots: 2,
      status: 'open',
      employer: {
        name: 'Nena Cruz',
        email: 'nena@example.com',
      },
    },
    {
      id: 2,
      title: 'Farm Harvester',
      category: 'Agriculture',
      barangay: 'Lajong',
      municipality: 'Bulan',
      compensation: '450.00',
      duration_type: 'daily',
      slots: 3,
      status: 'suspended',
      employer: {
        name: 'Don Ramon',
        email: 'ramon@example.com',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getJobs).mockResolvedValue({
      data: { success: true, data: mockJobs },
    } as any);
  });

  it('fetches and displays jobs on render', async () => {
    render(<JobsPage />);

    expect(adminApi.getJobs).toHaveBeenCalledWith(false);

    await waitFor(() => {
      expect(screen.getByText('Senior House Painter')).toBeInTheDocument();
      expect(screen.getByText('Farm Harvester')).toBeInTheDocument();
      expect(screen.getByText('Nena Cruz')).toBeInTheDocument();
      expect(screen.getByText('Don Ramon')).toBeInTheDocument();
    });
  });

  it('handles suspending a job post', async () => {
    vi.mocked(adminApi.updateJobStatus).mockResolvedValue({
      data: { success: true, message: 'Status updated' },
    } as any);

    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('Senior House Painter')).toBeInTheDocument();
    });

    const suspendButtons = screen.getAllByTitle(/suspend/i);
    fireEvent.click(suspendButtons[0]);

    // Click custom AlertDialog confirm button
    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    expect(adminApi.updateJobStatus).toHaveBeenCalledWith(1, 'suspended');
  });

  it('handles deleting a job post', async () => {
    vi.mocked(adminApi.deleteJob).mockResolvedValue({
      data: { success: true, message: 'Job deleted' },
    } as any);

    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('Senior House Painter')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle(/delete/i);
    fireEvent.click(deleteButtons[0]);

    // Click custom AlertDialog confirm button
    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    expect(adminApi.deleteJob).toHaveBeenCalledWith(1);
  });
});
