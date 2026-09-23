import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JobDetailModal from '@/components/jobs/JobDetailModal';

const { mockAdminApi } = vi.hoisted(() => ({
  mockAdminApi: {
    getJob: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({ adminApi: mockAdminApi }));
vi.mock('@/api/admin', () => ({ adminApi: mockAdminApi }));

describe('JobDetailModal Component', () => {
  const mockJob = {
    id: 10,
    reference_number: 'SIKAP-20260921-0010',
    title: 'Expert Carpenter & Furniture Maker',
    category: 'Carpentry',
    barangay: 'San Juan',
    municipality: 'Bulan',
    compensation: '3200.00',
    rate_unit: 'per_day',
    duration: '5',
    duration_unit: 'Days',
    duration_type: 'project',
    slots: 3,
    filled_slots: 1,
    accepted_count: 1,
    status: 'open',
    is_urgent: true,
    description: 'Looking for skilled carpenter to craft customized dining tables.',
    tools_required: 'Power drill, circular saw, chisels',
    photos: ['https://example.com/photo1.jpg'],
    created_at: '2026-09-20T10:00:00Z',
    employer: {
      id: 5,
      name: 'Maria Clara',
      email: 'maria@example.com',
      phone: '09123456789',
      barangay: 'San Juan',
      municipality: 'Bulan',
      is_verified: true,
      employer_profile: {
        description: 'Quality woodcraft workshop located in Bulan town center.',
      },
    },
  };

  const mockApplications = [
    {
      id: 101,
      status: 'shortlisted',
      cover_note: 'I have 8 years experience in bespoke carpentry.',
      proposed_rate: '3000.00',
      created_at: '2026-09-20T12:00:00Z',
      worker: {
        id: 42,
        name: 'Juan Dela Cruz',
        email: 'juan@worker.com',
      },
    },
  ];

  const mockReports = [
    {
      id: 501,
      type: 'Wage Discrepancy',
      description: 'Offered rate changed from posting description.',
      status: 'open',
      created_at: '2026-09-21T01:00:00Z',
      reporter: {
        name: 'Pedro Penduko',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminApi.getJob.mockResolvedValue({
      data: {
        job: mockJob,
        applications: mockApplications,
        reports: mockReports,
      },
    } as any);
  });

  it('renders modal with job header, title, badges, and quick stats', async () => {
    render(<JobDetailModal job={mockJob} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Expert Carpenter & Furniture Maker')).toBeInTheDocument();
    expect(screen.getByText('SIKAP-20260921-0010')).toBeInTheDocument();
    expect(screen.getByText('Carpentry')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('Urgent Hiring')).toBeInTheDocument();
    expect(screen.getAllByText('₱3,200.00').length).toBeGreaterThanOrEqual(1);
  });

  it('switches tabs and displays tab contents', async () => {
    render(
      <JobDetailModal
        job={mockJob}
        onClose={vi.fn()}
        applicationsData={mockApplications}
        reportsData={mockReports}
      />
    );

    // Default: Overview tab
    expect(screen.getByText(/Looking for skilled carpenter to craft customized dining tables/i)).toBeInTheDocument();
    expect(screen.getByText(/Power drill, circular saw, chisels/i)).toBeInTheDocument();

    // Switch to Employer Profile tab
    const employerTab = screen.getByRole('button', { name: /Employer Profile/i });
    fireEvent.click(employerTab);

    await waitFor(() => {
      expect(screen.getAllByText('Maria Clara').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('maria@example.com')).toBeInTheDocument();
      expect(screen.getByText('09123456789')).toBeInTheDocument();
      expect(screen.getByText(/Quality woodcraft workshop located in Bulan town center/i)).toBeInTheDocument();
    });

    // Switch to Applicants & Hires tab
    const applicantsTab = screen.getByRole('button', { name: /Applicants & Hires/i });
    fireEvent.click(applicantsTab);

    await waitFor(() => {
      expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
      expect(screen.getByText(/8 years experience/i)).toBeInTheDocument();
      expect(screen.getByText('shortlisted')).toBeInTheDocument();
    });

    // Switch to Reports tab
    const reportsTab = screen.getByRole('button', { name: /Reports/i });
    fireEvent.click(reportsTab);

    await waitFor(() => {
      expect(screen.getByText('Wage Discrepancy')).toBeInTheDocument();
      expect(screen.getByText(/Offered rate changed from posting description/i)).toBeInTheDocument();
      expect(screen.getByText(/Pedro Penduko/i)).toBeInTheDocument();
    });

    // Switch to Audit & History tab
    const historyTab = screen.getByText('Audit & History');
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('Lifecycle Milestones')).toBeInTheDocument();
    });
  });

  it('triggers action buttons when provided', async () => {
    const onSuspendToggle = vi.fn();
    const onDelete = vi.fn();

    render(
      <JobDetailModal
        job={mockJob}
        onClose={vi.fn()}
        onSuspendToggle={onSuspendToggle}
        onDelete={onDelete}
      />
    );

    const suspendBtn = screen.getByText('Suspend Job Post');
    fireEvent.click(suspendBtn);
    expect(onSuspendToggle).toHaveBeenCalledWith(10, 'open');

    const deleteBtn = screen.getByText('Soft Delete');
    fireEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalledWith(10);
  });
});
