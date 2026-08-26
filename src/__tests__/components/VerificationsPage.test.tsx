import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VerificationsPage from '@/app/dashboard/verifications/page';
import { adminApi } from '@/lib/api';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => '',
  }),
}));

vi.mock('@/lib/api', () => ({
  adminApi: {
    getVerifications: vi.fn(),
    verifyUser: vi.fn(),
  },
}));

describe('VerificationsPage Component', () => {
  const mockUsers = [
    {
      id: 1,
      name: 'Maria Santos',
      email: 'maria@example.com',
      role: 'worker',
      verification_status: 'pending',
      registration_status: 'pending_review',
      document_url: 'https://example.com/front.jpg',
      document_back_url: 'https://example.com/back.jpg',
      selfie_url: 'https://example.com/selfie.jpg',
      updated_at: '2026-08-20T00:00:00Z',
    },
    {
      id: 2,
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      role: 'employer',
      verification_status: 'pending',
      registration_status: 'pending_review',
      document_url: 'https://example.com/id2.jpg',
      updated_at: '2026-08-21T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getVerifications).mockResolvedValue({
      data: { success: true, data: mockUsers },
    } as any);
  });

  it('renders pending verifications and inputs have aria-labels', async () => {
    render(<VerificationsPage />);

    expect(adminApi.getVerifications).toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
      expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Search pending users')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort order')).toBeInTheDocument();
  });

  it('opens VerificationModal when Review button is clicked and handles approval', async () => {
    vi.mocked(adminApi.verifyUser).mockResolvedValue({ data: { success: true } } as any);

    render(<VerificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    });

    const reviewButtons = screen.getAllByRole('button', { name: 'Review' });
    fireEvent.click(reviewButtons[0]);

    // Modal should be open
    expect(screen.getByTestId('verification-modal')).toBeInTheDocument();
    expect(screen.getByTestId('user-name')).toHaveTextContent('Juan Dela Cruz');

    // Click Approve
    const approveBtn = screen.getByTestId('approve-btn');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(adminApi.verifyUser).toHaveBeenCalledWith(2, 'approved', undefined);
    });
  });

  it('handles rejection through VerificationModal', async () => {
    vi.mocked(adminApi.verifyUser).mockResolvedValue({ data: { success: true } } as any);

    render(<VerificationsPage />);

    await waitFor(() => {
      expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    });

    const reviewButtons = screen.getAllByRole('button', { name: 'Review' });
    fireEvent.click(reviewButtons[0]);

    // Click reject button to enter rejection view
    const rejectBtn = screen.getByTestId('reject-btn');
    fireEvent.click(rejectBtn);

    // Enter rejection reason
    const reasonInput = screen.getByTestId('rejection-reason-input');
    fireEvent.change(reasonInput, { target: { value: 'ID is unreadable' } });

    // Confirm rejection
    const confirmRejectBtn = screen.getByTestId('confirm-reject-btn');
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(adminApi.verifyUser).toHaveBeenCalledWith(2, 'rejected', 'ID is unreadable');
    });
  });
});
