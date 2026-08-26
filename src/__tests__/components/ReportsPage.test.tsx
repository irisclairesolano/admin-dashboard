import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportsPage from '@/app/dashboard/reports/page';
import { adminApi } from '@/lib/api';

// Mock the adminApi methods
vi.mock('@/lib/api', () => ({
  adminApi: {
    getReports: vi.fn(),
    resolveReport: vi.fn(),
  },
}));

describe('ReportsPage Component', () => {
  const mockReports = [
    {
      id: 1,
      reportable_type: 'Job',
      reportable_id: 45,
      reporter: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      type: 'inappropriate_content',
      description: 'The job posting contains spam links.',
      status: 'open',
      created_at: '2026-08-17T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getReports).mockResolvedValue({
      data: { success: true, data: mockReports, last_page: 1 },
    } as any);
  });

  it('fetches and renders reports table on load', async () => {
    render(<ReportsPage />);

    expect(adminApi.getReports).toHaveBeenCalledWith('open', 1);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('inappropriate content')).toBeInTheDocument();
      expect(screen.getByText('The job posting contains spam links.')).toBeInTheDocument();
    });
  });

  it('handles resolving a report successfully', async () => {
    vi.mocked(adminApi.resolveReport).mockResolvedValue({
      data: { success: true, message: 'Report resolved' },
    } as any);

    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find Mark as Resolved button (green CheckCircle icon button)
    const resolveBtn = screen.getByTitle('Mark as Resolved');
    fireEvent.click(resolveBtn);

    // Click custom AlertDialog confirm button
    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    expect(adminApi.resolveReport).toHaveBeenCalledWith(1, 'resolved');
  });

  it('handles dismissing a report successfully', async () => {
    vi.mocked(adminApi.resolveReport).mockResolvedValue({
      data: { success: true, message: 'Report dismissed' },
    } as any);

    render(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find Dismiss Report button (gray XCircle icon button)
    const dismissBtn = screen.getByTitle('Dismiss Report');
    fireEvent.click(dismissBtn);

    // Click custom AlertDialog confirm button
    const confirmBtn = screen.getByText('Confirm');
    fireEvent.click(confirmBtn);

    expect(adminApi.resolveReport).toHaveBeenCalledWith(1, 'dismissed');
  });
});
