import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BulkUserActionModal from '@/components/users/BulkUserActionModal';
import { User } from '@/types/models';

describe('BulkUserActionModal Component', () => {
  const mockUsers: User[] = [
    {
      id: 1,
      name: 'Nena Cruz',
      email: 'nena@example.com',
      role: 'employer',
      verification_status: 'approved',
      created_at: '2026-08-17T00:00:00Z',
      is_suspended: false,
    },
    {
      id: 2,
      name: 'Jose Santos',
      email: 'jose@example.com',
      role: 'worker',
      verification_status: 'pending',
      created_at: '2026-08-16T00:00:00Z',
      is_suspended: false,
    },
  ];

  it('renders summary and requires DELETE keyword confirmation for bulk deletion', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <BulkUserActionModal
        isOpen={true}
        actionType="delete"
        selectedUsers={mockUsers}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Bulk Delete Users')).toBeInTheDocument();
    expect(screen.getByText('2 Users')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Delete 2 Users/i });
    expect(submitBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/Type DELETE in capital letters/i);
    fireEvent.change(input, { target: { value: 'DELETE' } });

    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith([1, 2], expect.stringContaining('Violation of Terms & Community Guidelines'), undefined);
    });
  });

  it('handles bulk suspension with duration selection and SUSPEND keyword', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <BulkUserActionModal
        isOpen={true}
        actionType="suspend"
        selectedUsers={mockUsers}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Bulk Suspend Users')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Type SUSPEND in capital letters/i);
    fireEvent.change(input, { target: { value: 'SUSPEND' } });

    const submitBtn = screen.getByRole('button', { name: /Suspend 2 Users/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith([1, 2], expect.stringContaining('Investigation of multiple user reports'), 'indefinite');
    });
  });
});
