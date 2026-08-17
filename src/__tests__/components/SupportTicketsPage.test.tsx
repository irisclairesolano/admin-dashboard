import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SupportTicketsPage from '@/app/dashboard/support/page';
import { adminApi } from '@/lib/api';

// Mock the adminApi methods
vi.mock('@/lib/api', () => ({
  adminApi: {
    getSupportTickets: vi.fn(),
    replyToTicket: vi.fn(),
    updateSupportTicketStatus: vi.fn(),
  },
}));

describe('SupportTicketsPage Component', () => {
  const mockTickets = [
    {
      id: 1,
      user_id: 10,
      subject: 'Login issues',
      message: 'I cannot log in to my worker account.',
      status: 'open' as const,
      admin_reply: null,
      created_at: '2026-08-17T00:00:00Z',
      updated_at: '2026-08-17T00:00:00Z',
      user: {
        id: 10,
        name: 'Alex Rivera',
        email: 'alex@example.com',
        role: 'worker',
        avatar_url: null,
      },
    },
    {
      id: 2,
      user_id: 11,
      subject: 'Billing question',
      message: 'Where can I see my payment history?',
      status: 'resolved' as const,
      admin_reply: 'You can view it in the payment history tab.',
      created_at: '2026-08-16T00:00:00Z',
      updated_at: '2026-08-16T00:00:00Z',
      user: {
        id: 11,
        name: 'Maria Clara',
        email: 'maria@example.com',
        role: 'employer',
        avatar_url: null,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminApi.getSupportTickets).mockResolvedValue({
      data: { success: true, data: mockTickets },
    } as any);
  });

  it('fetches and displays support tickets on render', async () => {
    render(<SupportTicketsPage />);

    expect(adminApi.getSupportTickets).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText('Login issues')).toBeInTheDocument();
      expect(screen.getByText('Billing question')).toBeInTheDocument();
      expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
      expect(screen.getByText('Maria Clara')).toBeInTheDocument();
    });
  });

  it('filters support tickets by status tabs', async () => {
    render(<SupportTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Login issues')).toBeInTheDocument();
      expect(screen.getByText('Billing question')).toBeInTheDocument();
    });

    // Click "open" status filter tab
    const openTab = screen.getByRole('button', { name: /^open$/i });
    fireEvent.click(openTab);

    // Only "open" ticket should be displayed
    expect(screen.getByText('Login issues')).toBeInTheDocument();
    expect(screen.queryByText('Billing question')).not.toBeInTheDocument();

    // Click "resolved" status filter tab
    const resolvedTab = screen.getByRole('button', { name: /^resolved$/i });
    fireEvent.click(resolvedTab);

    // Only "resolved" ticket should be displayed
    expect(screen.queryByText('Login issues')).not.toBeInTheDocument();
    expect(screen.getByText('Billing question')).toBeInTheDocument();
  });

  it('opens details modal and allows sending a reply to resolve an open ticket', async () => {
    vi.mocked(adminApi.replyToTicket).mockResolvedValue({
      data: { success: true, message: 'Reply sent' },
    } as any);

    render(<SupportTicketsPage />);

    await waitFor(() => {
      expect(screen.getByText('Login issues')).toBeInTheDocument();
    });

    // Click on the open ticket card to open modal
    const openCard = screen.getByText('Login issues');
    fireEvent.click(openCard);

    // Check modal contents
    expect(screen.getByText('Ticket Details')).toBeInTheDocument();
    expect(screen.getAllByText('I cannot log in to my worker account.')).toHaveLength(2);


    // Fill in reply textarea
    const textarea = screen.getByPlaceholderText(/type your response here/i);
    fireEvent.change(textarea, { target: { value: 'We reset your password. Please check your email.' } });

    // Click Send Reply
    const sendBtn = screen.getByRole('button', { name: /send reply/i });
    fireEvent.click(sendBtn);

    expect(adminApi.replyToTicket).toHaveBeenCalledWith(1, 'We reset your password. Please check your email.');
  });
});
