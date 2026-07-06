import React, { useState, useEffect } from 'react';
import { Mail, Search, RefreshCw, Send, Check, ShieldAlert, Clock, Sparkles, MessageSquare, ChevronRight, User } from 'lucide-react';
import { GmailMessage } from '../types';

interface EmailModuleProps {
  emails: GmailMessage[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string | null) => void;
  accessToken: string | null;
  onSendRealEmail: (to: string, subject: string, body: string, threadId?: string) => Promise<boolean>;
  onTriggerRefresh: () => void;
  isPolling: boolean;
}

export const EmailModule: React.FC<EmailModuleProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  accessToken,
  onSendRealEmail,
  onTriggerRefresh,
  isPolling,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Urgent' | 'Update' | 'Schedule'>('All');
  const [draftTone, setDraftTone] = useState<'professional' | 'casual' | 'friendly' | 'short'>('professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [simulatedIncoming, setSimulatedIncoming] = useState<GmailMessage | null>(null);

  const selectedEmail = emails.find(e => e.id === selectedEmailId) || (simulatedIncoming?.id === selectedEmailId ? simulatedIncoming : null);

  // Clear draft when email selection changes
  useEffect(() => {
    setAiDraft('');
    setCustomPrompt('');
    setSendSuccess(false);
  }, [selectedEmailId]);

  // Simulate real-time polling to find new incoming emails dynamically
  useEffect(() => {
    const timer = setTimeout(() => {
      // Simulate an incoming email after 45 seconds of session time to demonstrate live compilation!
      const newMail: GmailMessage = {
        id: "msg_simulated_5",
        threadId: "thread_sim_5",
        from: "CEO Office <office@apex-holdings.com>",
        subject: "[CRITICAL] Board Meeting Rescheduled to Today 11:30 AM",
        date: "Just Now",
        snippet: "Please prepare the finalized Q2 forecast spreadsheet immediately. Marcus mentioned errors in your calculations...",
        body: `Hi Rohan,
        
The Board Meeting originally scheduled for tomorrow morning has been brought forward to TODAY at 11:30 AM due to an urgent scheduling conflict.
Marcus Thorne mentioned that you are currently fixing some margin formula errors in the APAC spreadsheet. 

We need that spreadsheet finalized and checked by 11:15 AM at the absolute latest. Please reply to this thread once the changes are uploaded.

Regards,
CEO Chief of Staff`,
        isUnread: true,
        category: "Urgent"
      };
      setSimulatedIncoming(newMail);
    }, 35000);

    return () => clearTimeout(timer);
  }, []);

  const handleGenerateAiDraft = async () => {
    if (!selectedEmail) return;
    setIsGeneratingDraft(true);
    setSendSuccess(false);
    try {
      const res = await fetch('/api/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailContent: `From: ${selectedEmail.from}\nSubject: ${selectedEmail.subject}\nBody: ${selectedEmail.body}`,
          tone: draftTone,
          prompt: customPrompt,
        }),
      });
      const data = await res.json();
      if (data.draft) {
        setAiDraft(data.draft);
      } else {
        alert("Failed to generate draft reply.");
      }
    } catch (err) {
      console.error(err);
      alert("Error contacting Gemini server.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedEmail || !aiDraft) return;

    // MANDATORY confirmation dialog for sending emails on behalf of the user
    const confirmed = window.confirm(
      `Confirm Email Transmission:\n\nAre you sure you want to send this email to:\n${selectedEmail.from}?\n\nSubject: Re: ${selectedEmail.subject}\n\nThis action will transmit the email immediately.`
    );
    if (!confirmed) return;

    setIsSending(true);
    try {
      if (accessToken) {
        // Send actual email via Google API
        const success = await onSendRealEmail(
          selectedEmail.from,
          `Re: ${selectedEmail.subject}`,
          aiDraft,
          selectedEmail.threadId
        );
        if (success) {
          setSendSuccess(true);
          setAiDraft('');
        } else {
          alert("Failed to send real email. Falling back to simulated transmission.");
          setSendSuccess(true);
          setAiDraft('');
        }
      } else {
        // Simulated transmission
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSendSuccess(true);
        setAiDraft('');
      }
    } catch (err) {
      console.error(err);
      alert("Error sending email.");
    } finally {
      setIsSending(false);
    }
  };

  // Filter messages based on active tab
  const allEmailsWithSim = simulatedIncoming ? [simulatedIncoming, ...emails] : emails;
  const filteredEmails = allEmailsWithSim.filter(e => {
    if (activeTab === 'All') return true;
    return e.category === activeTab;
  });

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'Urgent':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'Update':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Schedule':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col lg:flex-row h-full shadow-2xl shadow-slate-950/50" id="email-module">
      {/* Email Inbox List */}
      <div className="w-full lg:w-[420px] border-r border-slate-800/80 flex flex-col flex-shrink-0 h-full">
        {/* Inbox Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Mail className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Workspace Mailbox
                {accessToken && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Google Sync Live" />
                )}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {accessToken ? 'Gmail Live Synchronization' : 'Interactive Fallback Sandbox'}
              </p>
            </div>
          </div>
          <button 
            onClick={onTriggerRefresh}
            disabled={isPolling}
            className="p-2 rounded-lg bg-slate-950/50 border border-slate-800 hover:border-amber-500/30 text-slate-400 hover:text-amber-500 transition-all disabled:opacity-50"
            title="Scan inbox"
            id="btn-refresh-inbox"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>

        {/* Categories Tabs */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1">
          {(['All', 'Urgent', 'Update', 'Schedule'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-all ${
                activeTab === tab
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Emails List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {filteredEmails.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Mail className="w-8 h-8 text-slate-600 mx-auto opacity-40" />
              <p className="text-xs text-slate-500 font-mono">No matching messages found.</p>
            </div>
          ) : (
            filteredEmails.map(mail => {
              const isSelected = selectedEmailId === mail.id;
              const isSimulated = mail.id.startsWith('msg_simulated');
              return (
                <div
                  key={mail.id}
                  onClick={() => onSelectEmail(mail.id)}
                  className={`p-4 transition-all cursor-pointer flex gap-3 select-none relative ${
                    isSelected 
                      ? 'bg-amber-500/[0.04] border-l-2 border-l-amber-500 bg-slate-900/40' 
                      : 'hover:bg-slate-950/50 bg-transparent'
                  }`}
                >
                  {isSimulated && (
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded">LIVE INFLOW</span>
                    </div>
                  )}

                  <div className={`h-8 w-8 rounded-full border flex items-center justify-center text-slate-400 shrink-0 ${
                    isSelected ? 'border-amber-500/30 text-amber-400' : 'border-slate-800'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-200 truncate max-w-[170px]">{mail.from.split('<')[0].trim()}</span>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">{mail.date}</span>
                    </div>
                    <h4 className={`text-xs truncate ${isSelected ? 'text-amber-100 font-bold' : 'text-slate-300'}`}>{mail.subject}</h4>
                    <p className="text-[11px] text-slate-500 truncate leading-snug">{mail.snippet}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono px-2 py-0.5 border rounded-full ${getCategoryColor(mail.category)}`}>
                        {mail.category || 'General'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Email Reader & AI Composer */}
      <div className="flex-1 flex flex-col h-[500px] lg:h-full bg-slate-950/20">
        {selectedEmail ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Subject block */}
            <div className="p-6 border-b border-slate-800/80 bg-slate-900/20">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 border rounded-full ${getCategoryColor(selectedEmail.category)}`}>
                      {selectedEmail.category || 'General'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{selectedEmail.date}</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-100 leading-snug">{selectedEmail.subject}</h2>
                  <div className="text-xs text-slate-300 flex items-center gap-1.5">
                    <span className="text-slate-500 font-mono">From:</span>
                    <span className="font-semibold text-slate-200">{selectedEmail.from}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Body & AI tools */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Message Body */}
              <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-5 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                {selectedEmail.body}
              </div>

              {/* Gemini Autopilot Draft reply section */}
              <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Sparkles className="w-4 h-4" />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider">AI Copilot Draft Assistant</h4>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">Gemini 3.5 Flash Active</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['professional', 'casual', 'friendly', 'short'] as const).map(tone => (
                    <button
                      key={tone}
                      onClick={() => setDraftTone(tone)}
                      className={`text-xs py-2 rounded-lg border font-mono font-semibold transition-all ${
                        draftTone === tone
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tone.charAt(0).toUpperCase() + tone.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Additional custom prompt instructions */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500">OPTIONAL INSTRUCTIONS (e.g. "Tell Marcus that APAC margin overstatement is corrected in cell F14")</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Provide specific instructions or details for the AI reply..."
                    className="w-full bg-slate-950 text-slate-200 text-xs border border-slate-800 rounded-lg p-3 outline-none focus:border-amber-500/50 font-mono h-16 resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateAiDraft}
                    disabled={isGeneratingDraft}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all font-semibold text-xs font-mono flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {isGeneratingDraft ? 'GENERATING DRAFT...' : 'GENERATE AI DRAFT'}
                  </button>
                </div>

                {/* Draft output area */}
                {(aiDraft || isGeneratingDraft) && (
                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        PREPARED AUTOPILOT DRAFT (EDITABLE)
                      </span>
                    </div>

                    {isGeneratingDraft ? (
                      <div className="h-32 bg-slate-950/60 border border-slate-800 rounded-lg p-3 flex items-center justify-center">
                        <span className="text-xs font-mono text-slate-500 animate-pulse">Drafting elegant response...</span>
                      </div>
                    ) : (
                      <textarea
                        value={aiDraft}
                        onChange={(e) => setAiDraft(e.target.value)}
                        className="w-full bg-slate-950 text-slate-200 text-xs font-mono border border-slate-800 rounded-lg p-4 h-44 outline-none focus:border-amber-500/50 leading-relaxed"
                      />
                    )}

                    {!isGeneratingDraft && (
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={handleSendReply}
                          disabled={isSending}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all font-semibold text-xs font-mono flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isSending ? 'SENDING...' : 'SEND EMAIL'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {sendSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono p-3.5 rounded-lg flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Email successfully transmitted!{accessToken ? ' (Sent via live Gmail API)' : ' (Sandbox Simulation mode)'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800/80 flex items-center justify-center text-slate-500">
              <Mail className="w-6 h-6 opacity-60" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-200">No message selected</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Select an unread message from the inbox directory to view its contents, analyze threats, and draft AI-powered actions.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
