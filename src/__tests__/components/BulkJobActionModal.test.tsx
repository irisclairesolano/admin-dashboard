import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BulkJobActionModal from '@/components/jobs/BulkJobActionModal';

describe('BulkJobActionModal Component', () => {
  const mockJobs = [
    {
      id: 1,
      title: 'Senior House Painter',
      category: 'Domestic',
      municipality: 'Bulan',
      applications_count: 2,
      status: 'open',
      employer: { name: 'Nena Cruz' },
    },
    {
      id: 2,
      title: 'Farm Harvester',
      category: 'Agriculture',
      municipality: 'Bulan',
      applications_count: 0,
      status: 'open',
      employer: { name: 'Don Ramon' },
    },
  ];

  it('renders impact summary and handles bulk deletion with keyword confirmation', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <BulkJobActionModal
        isOpen={true}
        actionType="delete"
        selectedJobs={mockJobs}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Bulk Delete Job Postings')).toBeInTheDocument();
    expect(screen.getByText('2 Selected')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('Job Posts')).toBeInTheDocument();
    expect(screen.getByText('Applicants')).toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Delete 2 Jobs/i });
    expect(submitBtn).toBeDisabled();

    // Check applicant acknowledgment checkbox
    const ackCheckbox = screen.getByRole('checkbox');
    fireEvent.click(ackCheckbox);

    // Type confirmation keyword
    const input = screen.getByPlaceholderText(/Type DELETE in capital letters/i);
    fireEvent.change(input, { target: { value: 'DELETE' } });

    expect(submitBtn).not.toBeDisabled();

    // Submit form
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith([1, 2], expect.stringContaining('Violation of Community Guidelines / ToS'));
    });
  });

  it('handles bulk suspension with keyword confirmation and custom reason', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <BulkJobActionModal
        isOpen={true}
        actionType="suspend"
        selectedJobs={mockJobs}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Bulk Suspend Job Postings')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'Other' } });

    const textarea = screen.getByPlaceholderText(/Required: Explain why this administrative action/i);
    fireEvent.change(textarea, { target: { value: 'Reported scam duplicate listings' } });

    const input = screen.getByPlaceholderText(/Type SUSPEND in capital letters/i);
    fireEvent.change(input, { target: { value: 'SUSPEND' } });

    const submitBtn = screen.getByRole('button', { name: /Suspend 2 Jobs/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith([1, 2], 'Reported scam duplicate listings');
    });
  });

  it('handles bulk unsuspend without requiring a typing keyword', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <BulkJobActionModal
        isOpen={true}
        actionType="unsuspend"
        selectedJobs={mockJobs}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Bulk Unsuspend Job Postings')).toBeInTheDocument();
    // Keyword input should NOT exist for unsuspend
    expect(screen.queryByPlaceholderText(/in capital letters/i)).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Unsuspend 2 Jobs/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith([1, 2], expect.stringContaining('Investigation cleared / Approved after review'));
    });
  });
});
