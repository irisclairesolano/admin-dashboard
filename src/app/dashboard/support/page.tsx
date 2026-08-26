'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Tooltip from '@/components/Tooltip';
import Avatar from '@/components/Avatar';
import { AlertDialog } from '@/components/AlertDialog';

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
      if (!silent) setLoading(true);
      const res = await adminApi.getSupportTickets();
      if (res?.data?.data) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetchTickets();
    const timer = setInterval(async () => {
      try {
        const res = await adminApi.getSupportTickets();
        if (!cancelled && res?.data?.data) {
          setTickets(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-xl border border-white/50 shadow-glass">
        <div>
          <h1 className="text-4xl font-display text-transparent bg-clip-text bg-gradient-to-r from-ink to-primary-dark font-bold mb-1 tracking-tight">Support Tickets</h1>
          <p className="text-ink-soft font-body mt-2 text-lg">Manage and reply to user inquiries.</p>
        </div>
        <button 
          onClick={() => fetchTickets(false)}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-paper text-ink font-body font-semibold rounded-xl hover:bg-ink hover:text-white transition-all border border-ink-faint shadow-sm group"
        >
          <i className={`lni lni-reload mr-2 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-xl p-4 rounded-xl border border-white/50 shadow-glass flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          {['all', 'open', 'processing', 'resolved'].map(status => (
            <button
              key={status}
              aria-label={status}
              onClick={() => { setStatusFilter(status as any); setCurrentPage(1); }}
              className={`px-4 py-2 text-sm font-body font-semibold rounded-xl capitalize transition-all ${
                statusFilter === status 
                  ? 'bg-ink text-white shadow-md' 
                  : 'text-ink-soft hover:text-ink bg-white/40 border border-ink-faint/30'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64 group">
          <input
            type="text"
            aria-label="Search tickets"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2 bg-white/70 backdrop-blur-md rounded-xl border border-white/50 shadow-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary transition text-sm font-body"
          />
          <i className="lni lni-search text-ink-muted absolute left-3.5 top-1/2 transform -translate-y-1/2" />
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && tickets.length === 0 ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white/40 p-6 rounded-xl border border-white/30 h-64 animate-pulse flex flex-col gap-4">
              <div className="w-1/4 h-6 bg-ink-faint/50 rounded-lg"></div>
              <div className="w-3/4 h-8 bg-ink-faint/50 rounded-xl"></div>
              <div className="w-full h-12 bg-ink-faint/50 rounded-xl mt-2"></div>
            </div>
          ))
        ) : filteredTickets.length === 0 ? (
          <div className="col-span-full bg-white/50 backdrop-blur-md p-16 rounded-xl border border-white/50 shadow-inner flex flex-col items-center justify-center text-ink-soft">
            <i className="lni lni-comments text-4xl mb-4 text-ink-faint" />
            <p className="font-body font-semibold text-lg">No tickets found</p>
          </div>
        ) : (
          paginatedTickets.map(ticket => (
            <div 
              key={ticket.id} 
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white/70 backdrop-blur-xl p-6 rounded-xl border border-white/50 shadow-glass cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-body font-bold ${
                  ticket.status === 'open' 
                    ? 'bg-status-warning/20 text-status-warning' 
                    : ticket.status === 'processing'
                    ? 'bg-accent-sky/20 text-accent-skyDeep'
                    : 'bg-status-success/20 text-status-success'
                }`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
                <span className="text-xs text-ink-muted font-body font-semibold">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="font-display font-bold text-lg text-ink mb-2 line-clamp-1">{ticket.subject}</h3>
              <p className="text-sm text-ink-soft font-body mb-4 line-clamp-2 flex-1">{ticket.message}</p>
              
              <div className="flex items-center gap-3 pt-4 border-t border-ink-faint/20 mt-auto">
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
