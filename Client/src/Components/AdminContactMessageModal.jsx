import React, { useState, useMemo, useEffect } from 'react';
import { CheckCircle, X, Copy, Mail, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../api/api';

// Lightweight template list (could move to separate config later)
const RESPONSE_TEMPLATES = [
  {
    id: 'ack',
    label: 'Acknowledgment',
    body: 'Hi {{name}},\n\nThanks for reaching out. We have received your message and will get back to you shortly.\n\nBest regards,\nSupport Team'
  },
  {
    id: 'kyc',
    label: 'KYC Docs Reminder',
    body: 'Hi {{name}},\n\nWe still need the following KYC documents to proceed: {{missing_items}}. Please upload them at your earliest convenience.\n\nThank you!\nCompliance Team'
  },
  {
    id: 'loan_status',
    label: 'Loan Status Update',
    body: 'Hi {{name}},\n\nYour loan application is currently in the {{status_stage}} stage. We will notify you as soon as it progresses.\n\nRegards,\nBorrowEase Support'
  },
  {
    id: 'payment_issue',
    label: 'Payment Troubleshooting',
    body: 'Hi {{name}},\n\nWe noticed a failed payment attempt. Common fixes: (1) Confirm card / balance, (2) Try another method, (3) Clear browser cache. Let us know if it persists.\n\nSupport Team'
  },
  {
    id: 'resolved',
    label: 'Resolution Confirmation',
    body: 'Hi {{name}},\n\nWe believe your issue should now be resolved. If anything is still unclear, just reply and we\'ll gladly help further.\n\nWarm regards,\nBorrowEase Support'
  }
];

const replaceTokens = (template, message) => {
  if (!template) return '';
  const name = message?.name || 'there';
  return template
    .replace(/{{name}}/g, name)
    .replace(/{{status_stage}}/g, message?.status || 'processing')
    .replace(/{{missing_items}}/g, 'required documents');
};

const AdminContactMessageModal = ({ isDark, message, onClose, onReplied, onMarkResolved }) => {
  const [response, setResponse] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [autoResolve, setAutoResolve] = useState(false);
  const [sending, setSending] = useState(false);
  const [deliveryPollMap, setDeliveryPollMap] = useState({}); // responseId -> status

  // Poll delivery status for any responses with queued/failed states (treat failed as waiting for retry/backoff)
  useEffect(() => {
    let timer;
    const poll = async () => {
      if (!message?._id || !message.responses?.messages?.length) return;
      const targets = message.responses.messages.filter(r => ['queued','sending','failed'].includes(r.emailDelivery?.status));
      if (!targets.length) return; // nothing to poll
      const updates = {};
      await Promise.all(targets.map(async (r) => {
        try {
          const res = await API.get(`/contact/admin/message/${message._id}/response/${r._id}/delivery-status`);
          if (res.data?.success) updates[r._id] = res.data.delivery.status;
        } catch (e) { /* swallow */ }
      }));
      if (Object.keys(updates).length) {
        setDeliveryPollMap(prev => ({ ...prev, ...updates }));
      }
      timer = setTimeout(poll, 4000);
    };
    poll();
    return () => { if (timer) clearTimeout(timer); };
  }, [message?._id, message?.responses?.messages?.length]);

  const spamPercent = useMemo(() => message?.spamScore != null ? Math.round(Math.min(message.spamScore,1)*100) : null, [message]);

  const handleInsertTemplate = () => {
    if (!selectedTemplate) return;
    const tpl = RESPONSE_TEMPLATES.find(t => t.id === selectedTemplate);
    if (!tpl) return;
    const text = replaceTokens(tpl.body, message);
    if (!response.trim()) {
      setResponse(text);
    } else {
      // append with spacing
      setResponse(r => r + '\n\n' + text);
    }
    toast.success('Template inserted');
  };

  const handleSend = async () => {
    if (!response.trim()) return;
    try {
      setSending(true);
      const res = await API.post(`/contact/admin/message/${message._id}/respond`, {
        response: response.trim(),
        isPublic
      });
      if (res.data.success) {
        toast.success('Response sent');
        onReplied?.(message._id, { response: response.trim(), isPublic });
        if (autoResolve) onMarkResolved?.(message._id);
        onClose();
      } else {
        toast.error(res.data.error || 'Failed to send');
      }
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.error || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl shadow-2xl border ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        {/* Header */}
        <div className={`flex items-start justify-between px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div>
            <h2 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <Mail className="w-5 h-5" /> {message.subject || 'No Subject'}
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>From {message.name} · {message.email}</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded hover:bg-gray-200/40 ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Quick meta badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-1 rounded-full font-medium ${message.status === 'resolved' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>{message.status}</span>
            {message.priority && <span className="px-2 py-1 rounded-full bg-purple-600 text-white">{message.priority}</span>}
            {message.requiresReview && <span className="px-2 py-1 rounded-full bg-red-600 text-white">Needs Review</span>}
            {message.autoResponseSent && <span className="px-2 py-1 rounded-full bg-emerald-600 text-white">Auto-Replied</span>}
            {spamPercent != null && <span className={`px-2 py-1 rounded-full ${spamPercent>=80?'bg-red-600':'bg-emerald-600'} text-white`}>Spam {spamPercent}%</span>}
          </div>

            <div>
              <h3 className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Message</h3>
              <div className={`p-4 rounded-lg text-sm whitespace-pre-wrap border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>{message.message || '(No body)'}</div>
            </div>

          {message.responses?.messages?.length > 0 && (
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Previous Responses</h3>
              <div className="space-y-3">
                {message.responses.messages.map(r => (
                  <div key={r._id} className={`p-3 rounded border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex justify-between items-center mb-1 text-xs opacity-70">
                      <span>{new Date(r.respondedAt).toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <span>{r.isPublic? 'Public':'Private'}</span>
                        {r.isPublic && (
                          <DeliveryBadge isDark={isDark} status={deliveryPollMap[r._id] || r.emailDelivery?.status} />
                        )}
                      </div>
                    </div>
                    <div className="whitespace-pre-wrap text-sm">{r.message}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Compose Response</span>
            </div>
            <div className="grid md:grid-cols-4 gap-3 items-start">
              <select
                value={selectedTemplate}
                onChange={(e)=>setSelectedTemplate(e.target.value)}
                className={`md:col-span-2 px-3 py-2 rounded border text-sm ${isDark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'}`}
              >
                <option value="">Select Template...</option>
                {RESPONSE_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <button
                type="button"
                onClick={handleInsertTemplate}
                disabled={!selectedTemplate}
                className={`px-3 py-2 rounded text-sm font-medium ${selectedTemplate ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
              >Insert</button>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(message.email); toast.success('Email copied'); }}
                className={`px-3 py-2 rounded text-sm font-medium ${isDark ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <Copy className="w-4 h-4 inline mr-1"/> Copy Email
              </button>
            </div>
            <textarea
              value={response}
              onChange={(e)=>setResponse(e.target.value)}
              rows={6}
              placeholder="Type or insert a template..."
              className={`w-full px-4 py-3 rounded border text-sm font-mono leading-relaxed ${isDark ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400'}`}
            />
            <div className="flex flex-wrap gap-4 text-xs items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPublic} onChange={e=>setIsPublic(e.target.checked)} />
                <span>Public (user-visible)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoResolve} onChange={e=>setAutoResolve(e.target.checked)} />
                <span>Mark resolved after send</span>
              </label>
              <span className="opacity-60">{response.length} chars</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={!response.trim() || sending}
                className={`px-5 py-2 rounded font-semibold inline-flex items-center gap-2 ${(!response.trim() || sending) ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                <Mail className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Reply'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded font-medium ${isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >Close</button>
              {autoResolve && (
                <span className="text-xs flex items-center gap-1 text-green-500"><CheckCircle className="w-3 h-3"/> Will mark resolved</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminContactMessageModal;

// Inline badge component
const DeliveryBadge = ({ status, isDark }) => {
  if (!status) return null;
  const base = 'px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide';
  const colorMap = {
    queued: 'bg-amber-500/20 text-amber-600 border border-amber-500/30',
    sending: 'bg-blue-500/20 text-blue-600 border border-blue-500/30 animate-pulse',
    sent: 'bg-green-500/20 text-green-600 border border-green-500/30',
    failed: 'bg-red-500/20 text-red-600 border border-red-500/30',
    permanent_failure: 'bg-red-700/30 text-red-700 border border-red-700/40',
    not_applicable: isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500',
    skipped: 'bg-gray-300 text-gray-600'
  };
  return <span className={`${base} ${colorMap[status] || 'bg-gray-200 text-gray-700'}`}>{status.replace('_',' ')}</span>;
};
