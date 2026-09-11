'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Tooltip from '@/components/Tooltip';
import Avatar from '@/components/Avatar';
import { AlertDialog } from '@/components/AlertDialog';
import { usePolling } from '@/hooks/usePolling';
import { formatDate } from '@/lib/date';

interface SupportTicket {
  id: number;
  user_id: number;
  subject: string;
  message: string;
  status: 'open' | 'processing' | 'resolved';
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar_url: string | null;
  };
}

function SupportTicketsPageContent() {
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'processing' | 'resolved'>('all');
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Alert Dialog state
  const [alertState, setAlertState] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const itemsPerPage = 6;

  // Sync search query from URL query parameter
  useEffect(() => {
    setSearchTerm(urlSearch);
    setCurrentPage(1);
  }, [urlSearch]);

  const fetchTickets = async (silent = false) => {
    try {
      setError('');
      if (!silent) setLoading(true);
      const res = await adminApi.getSupportTickets();
      if (res?.data?.data) {
        setTickets(res.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  usePolling(fetchTickets, 30000);

  const handleStatusChange = async (newStatus: 'open' | 'processing' | 'resolved') => {
    if (!selectedTicket) return;
    try {
      setStatusLoading(true);
      await adminApi.updateSupportTicketStatus(selectedTicket.id, newStatus);
      
      setTickets(prev => prev.map(t => 
         t.id === selectedTicket.id ? { ...t, status: newStatus } : t
      ));
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (err) {
      console.error('Failed to update status:', err);
      setAlertState({
        open: true,
        title: 'Error',
        message: 'Failed to update status.',
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    try {
      setReplying(true);
      await adminApi.replyToTicket(selectedTicket.id, replyText);
      
      // Update local state
      setTickets(prev => prev.map(t => 
        t.id === selectedTicket.id 
          ? { ...t, status: 'resolved', admin_reply: replyText } 
          : t
      ));
      
      setSelectedTicket(prev => prev ? { ...prev, status: 'resolved', admin_reply: replyText } : null);
      setReplyText('');
    } catch (err) {
      console.error('Failed to reply:', err);
      setAlertState({
        open: true,
        title: 'Error',
        message: 'Failed to send reply. Check console for details.',
      });
    } finally {
      setReplying(false);
    }
  };

  // Local filter tickets based on search term
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesFilter = statusFilter === 'all' || ticket.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const closeModal = () => {
    setSelectedTicket(null);
    setReplyText('');
  };

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-status-error/10 rounded-full flex items-center justify-center mb-4">
        <i className="lni lni-warning text-2xl text-status-error" />
      </div>
      <h2 className="text-lg font-body font-bold text-ink mb-2">Failed to load support tickets</h2>
      <p className="text-ink-soft font-body text-sm mb-6">{error}</p>
      <button
        onClick={() => { setError(''); fetchTickets(); }}
        className="px-5 py-2.5 bg-ink text-white font-body font-semibold rounded-xl hover:bg-ink-soft transition-colors text-sm"
      >
        Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-ink">Support Tickets</h1>
          <p className="text-xs text-ink-muted mt-0.5">Manage and reply to user inquiries.</p>
        </div>
        <button 
          onClick={() => fetchTickets(false)}
          disabled={loading}
          className="flex items-center px-3 py-1.5 bg-white text-ink-soft hover:text-ink text-xs font-body font-semibold rounded-lg hover:bg-slate-50 transition-all border border-ink-faint/40 shadow-2xs group cursor-pointer"
        >
          <i className={`lni lni-reload mr-1.5 text-xs ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-ink-faint/30 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {['all', 'open', 'processing', 'resolved'].map(status => (
            <button
              key={status}
              aria-label={status}
              onClick={() => { setStatusFilter(status as any); setCurrentPage(1); }}
              className={`px-3 py-1 text-xs font-body font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                statusFilter === status 
                  ? 'bg-ink text-white shadow-2xs' 
                  : 'text-ink-soft hover:text-ink bg-white border border-ink-faint/40'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-60 group">
          <input
            type="text"
            aria-label="Search tickets"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg border border-ink-faint/40 shadow-xs focus:bg-white focus:border-ink/50 outline-none text-xs font-body transition"
          />
          <i className="lni lni-search text-ink-muted absolute left-2.5 top-1/2 transform -translate-y-1/2 text-xs" />
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {loading && tickets.length === 0 ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white/40 p-4 rounded-xl border border-ink-faint/20 h-48 animate-pulse flex flex-col gap-3">
              <div className="w-1/4 h-4 bg-ink-faint/40 rounded-lg"></div>
              <div className="w-3/4 h-6 bg-ink-faint/40 rounded-lg"></div>
              <div className="w-full h-8 bg-ink-faint/40 rounded-lg mt-1"></div>
            </div>
          ))
        ) : error ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-status-error/10 rounded-full flex items-center justify-center mb-3">
              <i className="lni lni-warning text-xl text-status-error" />
            </div>
            <h2 className="text-base font-body font-bold text-ink mb-1">Failed to load support tickets</h2>
            <p className="text-ink-muted font-body text-xs mb-4">{error}</p>
            <button
              onClick={() => { setError(''); fetchTickets(); }}
              className="px-4 py-2 bg-ink text-white font-body font-semibold rounded-lg hover:bg-ink-soft transition-colors text-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="col-span-full bg-white/70 backdrop-blur-md p-10 rounded-xl border border-ink-faint/30 shadow-inner flex flex-col items-center justify-center text-ink-muted">
            <i className="lni lni-comments text-3xl mb-2 text-ink-faint" />
            <p className="font-body font-semibold text-sm">No tickets found</p>
          </div>
        ) : (
          paginatedTickets.map(ticket => (
            <div 
              key={ticket.id} 
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white/90 backdrop-blur-md p-4 rounded-xl border border-ink-faint/30 shadow-xs cursor-pointer hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-body font-bold ${
                    ticket.status === 'open' 
                      ? 'bg-status-warning/20 text-status-warning' 
                      : ticket.status === 'processing'
                      ? 'bg-accent-sky/20 text-accent-skyDeep'
                      : 'bg-status-success/20 text-status-success'
                  }`}>
                    {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                  </span>
                  <span className="text-[11px] text-ink-muted font-body font-semibold">
                    {formatDate(ticket.created_at)}
                  </span>
                </div>
                
                <h3 className="font-display font-bold text-sm text-ink mb-1 line-clamp-1">{ticket.subject}</h3>
                <p className="text-xs text-ink-muted font-body mb-3 line-clamp-2">{ticket.message}</p>
              </div>
              
              <div className="flex items-center gap-2.5 pt-2.5 border-t border-ink-faint/20 mt-auto">
                <Avatar name={ticket.user.name} url={ticket.user.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body font-bold text-ink truncate">{ticket.user.name}</p>
                  <p className="text-xs font-body text-ink-muted truncate">{ticket.user.email}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 backdrop-blur-md border border-ink-faint/30 disabled:opacity-50 hover:bg-white transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-ink-soft font-body font-semibold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-xs font-body font-bold rounded-lg bg-white/80 backdrop-blur-md border border-ink-faint/30 disabled:opacity-50 hover:bg-white transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Reply Modal */}
      {selectedTicket && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="ticket-modal-title"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              closeModal();
            }
          }}
          className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 outline-none"
        >
          <div className="bg-paper w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-ink-faint/20 flex justify-between items-center bg-white">
              <h2 id="ticket-modal-title" className="text-xl font-display font-bold text-ink">Ticket Details</h2>
              <button 
                onClick={closeModal}
                className="p-2 hover:bg-paper-dark rounded-full text-ink-muted hover:text-ink transition-colors"
                aria-label="Close modal"
              >
                <i className="lni lni-close text-lg" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              {/* User Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-ink-faint/20">
                <Avatar name={selectedTicket.user.name} url={selectedTicket.user.avatar_url} size="md" />
                <div>
                  <p className="font-body font-bold text-lg text-ink">{selectedTicket.user.name}</p>
                  <p className="text-sm text-ink-muted font-body font-semibold">{selectedTicket.user.email} • {selectedTicket.user.role}</p>
                </div>
              </div>

              {/* Message */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-display font-bold text-xl text-ink truncate mr-2">{selectedTicket.subject}</h3>
                  <div className="flex bg-paper p-1 rounded-xl border border-ink-faint/30 flex-shrink-0">
                    {([
                      { key: 'open',       label: 'Open',       tip: 'Mark as open — awaiting response',    variant: 'warning' },
                      { key: 'processing', label: 'Processing', tip: 'Mark as in-progress',                  variant: 'default' },
                      { key: 'resolved',   label: 'Resolved',   tip: 'Mark resolved — closes the ticket',   variant: 'success' },
                    ] as const).map(({ key, label, tip, variant }) => (
                      <Tooltip key={key} text={tip} position="top" variant={variant}>
                        <button
                          disabled={statusLoading}
                          onClick={() => handleStatusChange(key)}
                          className={`px-3 py-1.5 text-xs font-body font-semibold rounded-lg transition-colors capitalize ${
                            selectedTicket.status === key
                              ? 'bg-white shadow-sm text-ink border border-ink-faint/30'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          {label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-ink-faint/20 shadow-sm">
                  <p className="text-ink-soft font-body whitespace-pre-wrap leading-relaxed">{selectedTicket.message}</p>
                </div>
              </div>

              {/* Reply Section */}
              {selectedTicket.status === 'resolved' ? (
                <div>
                  <h4 className="font-body font-bold text-sm text-ink-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <i className="lni lni-checkmark-circle text-status-success text-sm" /> Admin Reply
                  </h4>
                  <div className="bg-accent-mint/20 border border-accent-mint/30 p-5 rounded-2xl">
                    <p className="text-ink-soft font-body whitespace-pre-wrap leading-relaxed">{selectedTicket.admin_reply}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-body font-bold text-sm text-ink-muted uppercase tracking-wider mb-3">Your Reply</h4>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response here. This will be emailed to the user..."
                    className="w-full h-40 p-4 rounded-xl border border-ink-faint/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body resize-none bg-white shadow-inner"
                  />
                  <div className="mt-4 flex justify-end gap-3">
                    <Tooltip text="Discard reply and close" position="top">
                      <button
                        onClick={closeModal}
                        className="px-6 py-2.5 rounded-xl font-body font-semibold text-ink-soft hover:bg-white transition-colors"
                      >
                        Cancel
                      </button>
                    </Tooltip>
                    <Tooltip text="Send reply & resolve ticket" position="top" variant="success">
                      <button
                        onClick={handleReply}
                        disabled={replying || !replyText.trim()}
                        className="px-6 py-2.5 bg-primary text-white font-body font-semibold rounded-xl hover:bg-primary-dark transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                      >
                        {replying ? (
                          <i className="lni lni-reload animate-spin mr-1 text-sm" />
                        ) : (
                          <i className="lni lni-comments mr-1 text-sm" />
                        )}
                        Send Reply
                      </button>
                    </Tooltip>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog
        isOpen={alertState.open}
        title={alertState.title}
        message={alertState.message}
        onConfirm={() => setAlertState(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}

export default function SupportTicketsPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-body text-ink-muted">Loading support tickets...</div>}>
      <SupportTicketsPageContent />
    </Suspense>
  );
}
