import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobsPage from '@/app/dashboard/jobs/page';
import { adminApi } from '@/lib/api';

// Mock the adminApi methods
vi.mock('@/lib/api', () => ({
  adminApi: {
    getJobs: vi.fn(),
    getJob: vi.fn(),
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
    vi.mocked(adminApi.getJob).mockResolvedValue({
      data: {
        job: mockJobs[0],
        applications: [],
        reports: [],
      },
    } as any);
  });

  it('fetches and displays jobs on render', async () => {
    render(<JobsPage />);

    expect(adminApi.getJobs).toHaveBeenCalledWith(expect.objectContaining({
      trashed: false,
      all: true,
    }));

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

  it('opens centered job details modal when clicking a job row', async () => {
    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('Senior House Painter')).toBeInTheDocument();
    });

    const jobRowTitle = screen.getByText('Senior House Painter');
    fireEvent.click(jobRowTitle);

    await waitFor(() => {
      // Check modal role and header
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Job Overview & Specs')).toBeInTheDocument();
      expect(screen.getByText('Employer Profile')).toBeInTheDocument();
    });

    // Close button should close the modal
    const closeBtn = screen.getByLabelText('Close details');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('only displays applicable bulk actions when selecting jobs', async () => {
    render(<JobsPage />);

    await waitFor(() => {
      expect(screen.getByText('Senior House Painter')).toBeInTheDocument();
      expect(screen.getByText('Farm Harvester')).toBeInTheDocument();
    });

    // Select open job (id: 1, status: 'open')
    const openJobCheckbox = screen.getByRole('checkbox', { name: /select job senior house painter/i });
    fireEvent.click(openJobCheckbox);

    // Floating bar should pop up
    await waitFor(() => {
      expect(screen.getByText(/job selected/i)).toBeInTheDocument();
    });

    // Suspend and Delete should be available, Unsuspend must NOT be available
    expect(screen.getByRole('button', { name: /^bulk suspend/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^bulk delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /bulk unsuspend/i })).not.toBeInTheDocument();

    // Deselect open job
    fireEvent.click(openJobCheckbox);
    await waitFor(() => {
      expect(screen.queryByText(/job selected/i)).not.toBeInTheDocument();
    });

    // Select suspended job (id: 2, status: 'suspended')
    const suspendedJobCheckbox = screen.getByRole('checkbox', { name: /select job farm harvester/i });
    fireEvent.click(suspendedJobCheckbox);

    await waitFor(() => {
      expect(screen.getByText(/job selected/i)).toBeInTheDocument();
    });

    // Unsuspend and Delete should be available, Suspend must NOT be available
    expect(screen.getByRole('button', { name: /^bulk unsuspend/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^bulk delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^bulk suspend/i })).not.toBeInTheDocument();
  });
});
