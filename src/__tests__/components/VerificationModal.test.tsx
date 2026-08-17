import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VerificationModal, { User } from '@/components/VerificationModal';

describe('VerificationModal Component', () => {
  const mockUser: User = {
    id: 101,
    name: 'Maria Santos',
    email: 'maria@example.com',
    role: 'applicant',
    document_url: 'https://example.com/id-front.jpg',
    document_back_url: 'https://example.com/id-back.jpg',
    selfie_url: 'https://example.com/selfie-id.jpg',
  };

  it('renders front ID, back ID, and selfie ID images correctly', () => {
    const handleClose = vi.fn();
    render(<VerificationModal user={mockUser} onClose={handleClose} />);

    // Verify user info
    expect(screen.getByTestId('user-name')).toHaveTextContent('Maria Santos');
    expect(screen.getByTestId('user-email')).toHaveTextContent('maria@example.com');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Role: applicant');

    // Verify Front ID Image
    const frontImg = screen.getByTestId('id-front-img') as HTMLImageElement;
    expect(frontImg).toBeInTheDocument();
    expect(frontImg.getAttribute('src')).toBe(mockUser.document_url);
    expect(frontImg.alt).toBe('ID Front');

    // Verify Back ID Image
    const backImg = screen.getByTestId('id-back-img') as HTMLImageElement;
    expect(backImg).toBeInTheDocument();
    expect(backImg.getAttribute('src')).toBe(mockUser.document_back_url);
    expect(backImg.alt).toBe('ID Back');

    // Verify Selfie ID Image
    const selfieImg = screen.getByTestId('selfie-id-img') as HTMLImageElement;
    expect(selfieImg).toBeInTheDocument();
    expect(selfieImg.getAttribute('src')).toBe(mockUser.selfie_url);
    expect(selfieImg.alt).toBe('Selfie holding ID');
  });

  it('handles missing images gracefully', () => {
    const userWithoutImages: User = {
      id: 102,
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      role: 'employer',
      document_url: null,
      document_back_url: null,
      selfie_url: null,
    };

    render(<VerificationModal user={userWithoutImages} onClose={vi.fn()} />);

    expect(screen.getByTestId('no-id-front')).toHaveTextContent('No Front ID uploaded');
    expect(screen.getByTestId('no-id-back')).toHaveTextContent('No Back ID uploaded');
    expect(screen.getByTestId('no-selfie-id')).toHaveTextContent('Selfie not required for employers');
  });

  it('triggers the Approve callback when Approve button is clicked', () => {
    const handleApprove = vi.fn();
    const handleClose = vi.fn();

    render(
      <VerificationModal
        user={mockUser}
        onClose={handleClose}
        onApprove={handleApprove}
      />
    );

    const approveBtn = screen.getByTestId('approve-btn');
    expect(approveBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);

    expect(handleApprove).toHaveBeenCalledTimes(1);
    expect(handleApprove).toHaveBeenCalledWith(101);
  });

  it('triggers the Reject callback with "Generic Rejection" when Reject flow is confirmed', () => {
    const handleReject = vi.fn();
    const handleClose = vi.fn();

    render(
      <VerificationModal
        user={mockUser}
        onClose={handleClose}
        onReject={handleReject}
      />
    );

    // 1. Click Reject button to enter rejection view
    const rejectBtn = screen.getByTestId('reject-btn');
    fireEvent.click(rejectBtn);

    // 2. Confirm rejection
    const confirmRejectBtn = screen.getByTestId('confirm-reject-btn');
    fireEvent.click(confirmRejectBtn);

    expect(handleReject).toHaveBeenCalledTimes(1);
    expect(handleReject).toHaveBeenCalledWith(101, 'Generic Rejection');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<VerificationModal user={mockUser} onClose={handleClose} />);

    fireEvent.click(screen.getByTestId('modal-close-btn'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
