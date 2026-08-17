'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { RefreshCw, Search, MessageSquare, AlertCircle, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';

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

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'processing' | 'resolved'>('all');
  
  // Modal state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 6;

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSupportTickets();
      if (res?.data?.data) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
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
      alert('Failed to update status.');
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
      alert('Failed to send reply. Check console for details.');
    } finally {
      setReplying(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white/50 shadow-glass">
        <div>
          <h1 className="text-3xl font-display-bold text-ink mb-1 tracking-tight">Support Tickets</h1>
          <p className="text-ink-muted font-body">Manage and reply to user inquiries.</p>
        </div>
        <button 
          onClick={fetchTickets}
          disabled={loading}
          className="flex items-center px-4 py-2 bg-paper text-ink font-body-semibold rounded-xl hover:bg-ink hover:text-white transition-all shadow-sm group"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/70 backdrop-blur-xl p-4 rounded-3xl border border-white/50 shadow-glass flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2">
          {['all', 'open', 'processing', 'resolved'].map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status as any); setCurrentPage(1); }}
              className={`px-4 py-2 text-sm font-body-semibold rounded-xl capitalize transition-all ${
                statusFilter === status 
                  ? 'bg-ink text-white shadow-md' 
                  : 'text-ink-soft hover:text-ink bg-white/40 border border-ink-faint/30'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-72 group">
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-11 pr-4 py-3 bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-inner focus:bg-white outline-none font-body text-sm transition-all focus:border-primary/30"
          />
          <Search className="w-4 h-4 text-ink-muted absolute left-4 top-3.5 transition-colors group-focus-within:text-primary" />
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white/40 p-6 rounded-[2rem] border border-white/30 h-64 animate-pulse flex flex-col gap-4">
              <div className="w-1/4 h-6 bg-ink-faint/50 rounded-lg"></div>
              <div className="w-3/4 h-8 bg-ink-faint/50 rounded-xl"></div>
              <div className="w-full h-12 bg-ink-faint/50 rounded-xl mt-2"></div>
            </div>
          ))
        ) : filteredTickets.length === 0 ? (
          <div className="col-span-full bg-white/50 backdrop-blur-md p-16 rounded-[2.5rem] border border-white/50 shadow-inner flex flex-col items-center justify-center text-ink-soft">
            <MessageSquare className="w-12 h-12 mb-4 text-ink-faint" />
            <p className="font-body-semibold text-lg">No tickets found</p>
          </div>
        ) : (
          paginatedTickets.map(ticket => (
            <div 
              key={ticket.id} 
              onClick={() => setSelectedTicket(ticket)}
              className="bg-white/70 backdrop-blur-xl p-6 rounded-[2rem] border border-white/50 shadow-glass cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-body-bold ${
                  ticket.status === 'open' 
                    ? 'bg-status-warning/20 text-status-warning' 
                    : ticket.status === 'processing'
                    ? 'bg-accent-sky/20 text-accent-skyDeep'
                    : 'bg-status-success/20 text-status-success'
                }`}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                </span>
                <span className="text-xs text-ink-muted font-body">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
              
              <h3 className="font-display-bold text-lg text-ink mb-2 line-clamp-1">{ticket.subject}</h3>
              <p className="text-sm text-ink-soft font-body mb-4 line-clamp-2 flex-1">{ticket.message}</p>
              
              <div className="flex items-center gap-3 pt-4 border-t border-ink-faint/20 mt-auto">
                {ticket.user.avatar_url ? (
                  <img src={ticket.user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary-dark flex items-center justify-center font-body-bold text-xs">
                    {ticket.user.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body-bold text-ink truncate">{ticket.user.name}</p>
                  <p className="text-xs font-body text-ink-muted truncate">{ticket.user.email}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-4">
          <p className="text-sm font-body text-ink-soft">
            Page <span className="font-semibold text-ink">{currentPage}</span> of{' '}
            <span className="font-semibold text-ink">{totalPages}</span>
          </p>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-ink-faint/50 bg-white/70 text-ink hover:bg-white/95 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-paper w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-ink-faint/20 flex justify-between items-center bg-white">
              <h2 className="text-xl font-display-bold text-ink">Ticket Details</h2>
              <button 
                onClick={() => { setSelectedTicket(null); setReplyText(''); }}
                className="p-2 hover:bg-paper-dark rounded-full text-ink-muted hover:text-ink transition-colors"
              >
                <AlertCircle className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              {/* User Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-ink-faint/20">
                {selectedTicket.user.avatar_url ? (
                  <img src={selectedTicket.user.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-soft text-primary-dark flex items-center justify-center font-body-bold text-lg">
                    {selectedTicket.user.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-body-bold text-lg text-ink">{selectedTicket.user.name}</p>
                  <p className="text-sm text-ink-muted font-body">{selectedTicket.user.email} • {selectedTicket.user.role}</p>
                </div>
              </div>

              {/* Message */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-display-bold text-xl text-ink">{selectedTicket.subject}</h3>
                  <div className="flex bg-paper p-1 rounded-xl border border-ink-faint/30">
                    {['open', 'processing', 'resolved'].map(s => (
                      <button
                        key={s}
                        disabled={statusLoading}
                        onClick={() => handleStatusChange(s as any)}
                        className={`px-3 py-1.5 text-xs font-body-semibold rounded-lg transition-colors capitalize ${
                          selectedTicket.status === s 
                            ? 'bg-white shadow-sm text-ink border border-ink-faint/30' 
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-ink-faint/20 shadow-sm">
                  <p className="text-ink-soft font-body whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>
              </div>

              {/* Reply Section */}
              {selectedTicket.status === 'resolved' ? (
                <div>
                  <h4 className="font-body-bold text-sm text-ink-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-status-success" /> Admin Reply
                  </h4>
                  <div className="bg-accent-mint/20 border border-accent-mint/30 p-5 rounded-2xl">
                    <p className="text-ink-soft font-body whitespace-pre-wrap">{selectedTicket.admin_reply}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-body-bold text-sm text-ink-muted uppercase tracking-wider mb-3">Your Reply</h4>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your response here. This will be emailed to the user..."
                    className="w-full h-40 p-4 rounded-2xl border border-ink-faint/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-body resize-none bg-white shadow-inner"
                  />
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => { setSelectedTicket(null); setReplyText(''); }}
                      className="px-6 py-2.5 rounded-xl font-body-semibold text-ink-soft hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReply}
                      disabled={replying || !replyText.trim()}
                      className="px-6 py-2.5 bg-primary text-white font-body-semibold rounded-xl hover:bg-primary-dark transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                    >
                      {replying ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                      Send Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
