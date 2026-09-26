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
      role: 'worker',
      document_url: null,
      document_back_url: null,
      selfie_url: null,
    };

    render(<VerificationModal user={userWithoutImages} onClose={vi.fn()} />);

    expect(screen.getByTestId('no-id-front')).toHaveTextContent('No Front ID uploaded');
    expect(screen.getByTestId('no-id-back')).toHaveTextContent('No Back ID uploaded');
    expect(screen.getByTestId('no-selfie-id')).toHaveTextContent('No selfie uploaded');
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

  it('triggers the Reject callback with specified reason when Reject flow is confirmed', () => {
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

    // 2. Enter rejection reason
    const reasonInput = screen.getByTestId('rejection-reason-input');
    fireEvent.change(reasonInput, { target: { value: 'ID photo is blurry' } });

    // 3. Confirm rejection
    const confirmRejectBtn = screen.getByTestId('confirm-reject-btn');
    fireEvent.click(confirmRejectBtn);

    expect(handleReject).toHaveBeenCalledTimes(1);
    expect(handleReject).toHaveBeenCalledWith(101, 'ID photo is blurry');
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<VerificationModal user={mockUser} onClose={handleClose} />);

    fireEvent.click(screen.getByTestId('modal-close-btn'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders images correctly when using fallback property names', () => {
    const userWithFallbackProps: User = {
      id: 103,
      name: 'Fallback User',
      email: 'fallback@example.com',
      role: 'worker',
      document_front_url: 'https://example.com/fallback-front.jpg',
      id_back_url: 'https://example.com/fallback-back.jpg',
      id_selfie_url: 'https://example.com/fallback-selfie.jpg',
    };

    render(<VerificationModal user={userWithFallbackProps} onClose={vi.fn()} />);

    const frontImg = screen.getByTestId('id-front-img') as HTMLImageElement;
    expect(frontImg).toBeInTheDocument();
    expect(frontImg.getAttribute('src')).toBe('https://example.com/fallback-front.jpg');

    const backImg = screen.getByTestId('id-back-img') as HTMLImageElement;
    expect(backImg).toBeInTheDocument();
    expect(backImg.getAttribute('src')).toBe('https://example.com/fallback-back.jpg');

    const selfieImg = screen.getByTestId('selfie-id-img') as HTMLImageElement;
    expect(selfieImg).toBeInTheDocument();
    expect(selfieImg.getAttribute('src')).toBe('https://example.com/fallback-selfie.jpg');
  });

  it('opens interactive lightbox and controls zoom and rotation', () => {
    render(<VerificationModal user={mockUser} onClose={vi.fn()} />);

    // Click front ID image to open lightbox
    fireEvent.click(screen.getByTestId('id-front-img'));

    // Lightbox should now be visible
    expect(screen.getByTestId('lightbox-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('lightbox-zoom-level')).toHaveTextContent('100%');

    // Zoom in
    fireEvent.click(screen.getByTestId('lightbox-zoom-in'));
    expect(screen.getByTestId('lightbox-zoom-level')).toHaveTextContent('150%');

    // Rotate
    fireEvent.click(screen.getByTestId('lightbox-rotate'));

    // Reset view
    const resetBtn = screen.getByTestId('lightbox-reset');
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(screen.getByTestId('lightbox-zoom-level')).toHaveTextContent('100%');

    // Close lightbox
    fireEvent.click(screen.getByTestId('lightbox-close-btn'));
    expect(screen.queryByTestId('lightbox-overlay')).not.toBeInTheDocument();
  });

  it('renders employer business documents and allows previewing PDFs in modal', () => {
    const employerWithDocs: User = {
      id: 104,
      name: 'ABC Corp',
      email: 'abc@corp.com',
      role: 'employer',
      business_documents: [
        'https://example.com/dti-permit.pdf',
        'https://example.com/bir-permit.jpg',
      ],
    };

    render(<VerificationModal user={employerWithDocs} onClose={vi.fn()} />);

    // Shows 2 documents count
    expect(screen.getByText('Business Registration & Permits')).toBeInTheDocument();
    expect(screen.getByText('2 documents attached')).toBeInTheDocument();

    // Click preview on the PDF document
    const previewPdfBtn = screen.getByText('Preview');
    expect(previewPdfBtn).toBeInTheDocument();
    fireEvent.click(previewPdfBtn);

    // Lightbox opens with iframe
    expect(screen.getByTestId('lightbox-pdf-iframe')).toBeInTheDocument();
    expect(screen.getByTestId('lightbox-pdf-iframe')).toHaveAttribute('src', 'https://example.com/dti-permit.pdf');

    // Close lightbox
    fireEvent.click(screen.getByTestId('lightbox-close-btn'));
    expect(screen.queryByTestId('lightbox-overlay')).not.toBeInTheDocument();
  });
});
