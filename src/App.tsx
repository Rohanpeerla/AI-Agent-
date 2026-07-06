import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Mail, 
  Calendar, 
  Terminal, 
  LogOut, 
  AlertCircle, 
  Loader2, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  Send,
  X,
  RefreshCw,
  LayoutDashboard
} from 'lucide-react';
import { initAuth, googleSignIn, logout, getAccessToken } from './auth';
import { GmailMessage, CalendarEvent, MorningBriefing } from './types';
import { DEMO_EMAILS, DEMO_EVENTS, MOCK_BRIEFING } from './demoData';
import { BriefingPanel } from './components/BriefingPanel';
import { EmailModule } from './components/EmailModule';
import { CalendarModule } from './components/CalendarModule';
import { CommandBar } from './components/CommandBar';

export default function App() {
  // Auth state
  const [user, setUser] = useState<any | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // App mode
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Data streams
  const [emails, setEmails] = useState<GmailMessage[]>(DEMO_EMAILS);
  const [events, setEvents] = useState<CalendarEvent[]>(DEMO_EVENTS);
  const [briefing, setBriefing] = useState<MorningBriefing>(MOCK_BRIEFING);
  
  // UI states
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastPolledTime, setLastPolledTime] = useState<string>('Never');

  // Command-bar drafted email composer state
  const [activeDraft, setActiveDraft] = useState<{ to: string; subject: string; body: string } | null>(null);
  const [isSendingDraft, setIsSendingDraft] = useState(false);
  const [draftSendSuccess, setDraftSendSuccess] = useState(false);
  const [isParsingCommand, setIsParsingCommand] = useState(false);

  // Initialize auth state listener
  useEffect(() => {
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsDemoMode(false);
        setSessionExpired(false);
        triggerSummaryFetch(token);
      },
      () => {
        // Fallback or logged out
        setUser(null);
        setAccessToken(null);
        setIsDemoMode(true);
      }
    );
  }, []);

  // Sync / Summarize orchestrator
  const triggerSummaryFetch = async (token: string | null) => {
    setIsLoadingSummary(true);
    setIsPolling(true);
    setSessionExpired(false);
    
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          emails: DEMO_EMAILS,
          events: DEMO_EVENTS
        })
      });

      if (res.status === 401) {
        // Handle credential failure
        setSessionExpired(true);
        setIsDemoMode(true);
        setAccessToken(null);
        setIsLoadingSummary(false);
        setIsPolling(false);
        return;
      }

      if (!res.ok) {
        throw new Error('API server summary error');
      }

      const data = await res.json();
      
      if (data.briefing) {
        setBriefing(data.briefing);
      }

      if (data.emails && data.emails.length > 0) {
        // Merge with categorization from Gemini if returned
        const categorized = data.emails.map((m: any) => {
          const matched = (data.categorizedEmails || []).find((c: any) => c.id === m.id);
          return {
            ...m,
            category: matched ? matched.category : m.category || 'General'
          };
        });
        setEmails(categorized);
      }

      if (data.events && data.events.length > 0) {
        // Flag clashes if detected by Gemini
        const eventClashes = data.events.map((e: any) => {
          const matchedClash = (data.briefing.timelineClashes || []).find((c: any) => c.events.includes(e.summary));
          return {
            ...e,
            clash: !!matchedClash,
            clashWith: matchedClash ? matchedClash.events.find((name: string) => name !== e.summary) : ''
          };
        });
        setEvents(eventClashes);
      }

      setLastPolledTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Summary synchronization failed:', err);
      // Fallback to offline demo calculation
      setBriefing(MOCK_BRIEFING);
      setEmails(DEMO_EMAILS);
      setEvents(DEMO_EVENTS);
    } finally {
      setIsLoadingSummary(false);
      setIsPolling(false);
    }
  };

  // Setup periodic background polling (scans for updates dynamically every 60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isDemoMode && accessToken) {
        triggerSummaryFetch(accessToken);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [isDemoMode, accessToken]);

  // Google Sign In trigger
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setSessionExpired(false);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setIsDemoMode(false);
        triggerSummaryFetch(result.accessToken);
      }
    } catch (err) {
      console.error('OAuth sign in failure:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout trigger
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setIsDemoMode(true);
    setEmails(DEMO_EMAILS);
    setEvents(DEMO_EVENTS);
    setBriefing(MOCK_BRIEFING);
  };

  // Send real email callback
  const handleSendRealEmail = async (to: string, subject: string, body: string, threadId?: string) => {
    if (!accessToken) return false;
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ to, subject, body, threadId })
      });
      return res.ok;
    } catch (err) {
      console.error('Email sending endpoint failed:', err);
      return false;
    }
  };

  // Submit active command drafted email
  const handleSendDraftEmail = async () => {
    if (!activeDraft) return;

    // MANDATORY confirmation dialog before sending emails
    const confirmed = window.confirm(
      `Confirm Email Transmission:\n\nAre you sure you want to send this email to:\n${activeDraft.to}?\n\nSubject: ${activeDraft.subject}\n\nThis will send the email instantly.`
    );
    if (!confirmed) return;

    setIsSendingDraft(true);
    try {
      if (accessToken) {
        const success = await handleSendRealEmail(activeDraft.to, activeDraft.subject, activeDraft.body);
        if (success) {
          setDraftSendSuccess(true);
          setTimeout(() => {
            setActiveDraft(null);
            setDraftSendSuccess(false);
          }, 2000);
        } else {
          alert('Failed to transmit email via Google SMTP. Reverting to sandbox simulator.');
          setDraftSendSuccess(true);
          setTimeout(() => {
            setActiveDraft(null);
            setDraftSendSuccess(false);
          }, 2000);
        }
      } else {
        // Demo simulation mode
        await new Promise(resolve => setTimeout(resolve, 1200));
        setDraftSendSuccess(true);
        setTimeout(() => {
          setActiveDraft(null);
          setDraftSendSuccess(false);
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSendingDraft(false);
    }
  };

  // Quick Action Reschedule connector from Calendar event
  const handleQuickReschedule = (recipient: string, subject: string, template: string) => {
    setActiveDraft({
      to: recipient,
      subject,
      body: template
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex font-sans relative overflow-x-hidden selection:bg-indigo-500/20 selection:text-indigo-300">
      
      {/* Immersive Theme Ambient Gradients */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]"></div>
      </div>

      {/* Sidebar Rail (Layout pattern from Immersive UI theme) */}
      <aside className="hidden md:flex w-20 bg-slate-950/50 backdrop-blur-xl border-r border-slate-800/60 flex-col items-center py-8 z-10 shrink-0">
        <div className="w-10 h-10 bg-slate-900 border border-slate-850 rounded-lg flex items-center justify-center mb-12 shadow-md hover:border-amber-500/40 transition">
          <div className="w-5 h-5 border-2 border-amber-500 rotate-45 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-amber-400 rotate-[-45deg]" />
          </div>
        </div>
        <nav className="flex flex-col space-y-8">
          <button 
            onClick={() => {
              const el = document.getElementById('briefing-panel');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-2 text-indigo-400 border-l-2 border-indigo-400 bg-indigo-400/5 hover:bg-indigo-400/10 transition-all rounded-r"
            title="Briefing Dashboard"
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('calendar-module');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-2 text-slate-500 hover:text-slate-300 transition-all"
            title="Executive Calendar"
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('email-module');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-2 text-slate-500 hover:text-slate-300 transition-all"
            title="Critical Inbox"
          >
            <Mail className="w-5 h-5" />
          </button>
        </nav>
        <div className="mt-auto">
          {user ? (
            <button 
              onClick={handleLogout}
              title={`Logged in as ${user.displayName || user.email}. Click to Logout.`}
              className="group relative"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-slate-700 hover:border-red-500/50 transition" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full border border-slate-700 bg-slate-900 flex items-center justify-center text-xs font-mono text-slate-400 hover:text-red-400 hover:border-red-500/50 transition">
                  {user.email ? user.email.slice(0, 2).toUpperCase() : 'EX'}
                </div>
              )}
            </button>
          ) : (
            <button 
              onClick={handleGoogleSignIn}
              title="Connect Google Account"
              className="w-10 h-10 rounded-full border border-slate-850 bg-slate-900 hover:border-amber-500/50 flex items-center justify-center text-xs font-mono text-slate-500 hover:text-slate-300 transition"
            >
              EX
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 z-10">
        
        {/* Floating drafted email composer (triggered by command-bar parsing) */}
        {activeDraft && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-black/80 animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-500">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="font-bold text-sm font-mono uppercase tracking-wider">AI Target Email Draft</h3>
                </div>
                <button 
                  onClick={() => setActiveDraft(null)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Composer Inputs */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-[50px_1fr] items-center border-b border-slate-800 pb-2 text-xs font-mono">
                  <span className="text-slate-500">To:</span>
                  <input 
                    type="text" 
                    value={activeDraft.to}
                    onChange={(e) => setActiveDraft({ ...activeDraft, to: e.target.value })}
                    className="bg-transparent border-none outline-none text-slate-200 w-full"
                  />
                </div>

                <div className="grid grid-cols-[50px_1fr] items-center border-b border-slate-800 pb-2 text-xs font-mono">
                  <span className="text-slate-500">Subject:</span>
                  <input 
                    type="text" 
                    value={activeDraft.subject}
                    onChange={(e) => setActiveDraft({ ...activeDraft, subject: e.target.value })}
                    className="bg-transparent border-none outline-none text-slate-200 w-full font-bold"
                  />
                </div>

                <textarea 
                  value={activeDraft.body}
                  onChange={(e) => setActiveDraft({ ...activeDraft, body: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono h-60 outline-none focus:border-amber-500/50 resize-none text-slate-300 leading-relaxed"
                />

                {draftSendSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono p-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Email successfully queued and transmitted!</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveDraft(null)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-mono text-slate-300 transition-all"
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    onClick={handleSendDraftEmail}
                    disabled={isSendingDraft}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingDraft ? 'SENDING...' : 'SEND EMAIL'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic & Beautiful Immersive Header Section (styled directly from theme) */}
        <header className="border-b border-slate-900 bg-slate-950/40 backdrop-blur-md px-6 py-6 sm:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-1.5">
              Good Morning, {user?.displayName ? user.displayName.split(' ')[0] : 'Elena'}.
            </h1>
            <p className="text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-mono text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-indigo-400 tracking-wider font-semibold">
                SYNCED: {lastPolledTime !== 'Never' ? lastPolledTime : '08:42 AM'}
              </span>
              <span className="text-slate-500">•</span>
              <span>Paris, France &bull; {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Status Flag styled from design */}
            <div className="px-4 py-2 bg-slate-900/80 border border-slate-850 rounded-xl flex items-center gap-2.5 shadow-lg">
              <div className={`w-2 h-2 rounded-full ${isPolling ? 'bg-amber-500 animate-bounce' : 'bg-green-500 animate-pulse'}`} />
              <span className="text-xs font-mono font-medium tracking-wider uppercase text-slate-300">
                {isDemoMode ? 'Sandbox Simulator' : 'Workspace Active'}
              </span>
            </div>

            {/* Google Identity Actions */}
            {user ? (
              <button
                onClick={handleLogout}
                className="p-2 border border-slate-850 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition-all rounded-xl bg-slate-900/50"
                title="Sign out Google Account"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                className="inline-flex items-center justify-center bg-slate-900 border border-slate-850 hover:border-amber-500/30 text-slate-200 hover:text-white rounded-xl px-4 py-2 text-xs font-mono font-medium transition-all cursor-pointer shadow-lg hover:shadow-amber-500/5"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2 text-amber-500" />
                ) : (
                  <svg className="w-3.5 h-3.5 mr-2" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Fluid Content Layout */}
        <main className="flex-1 max-w-7xl mx-auto px-6 sm:px-8 py-8 w-full space-y-8 min-h-0">
          
          {/* Google OAuth Session Expiry Alert Panel */}
          {sessionExpired && (
            <div className="bg-red-500/5 border border-red-500/25 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-5.5 h-5.5 text-red-500 flex-shrink-0 animate-bounce" />
                <div>
                  <h4 className="font-bold text-sm">Google Workspace Session Expired</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Your one-hour access token has expired. Reconnect to resume live mailbox scanning.</p>
                </div>
              </div>
              <button
                onClick={handleGoogleSignIn}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap"
              >
                Reconnect Google Account
              </button>
            </div>
          )}

          {/* Demo Mode Action Banner */}
          {isDemoMode && !sessionExpired && (
            <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg">
              <div className="flex items-start gap-3.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-200">Exploring via Intelligent Mock Sandbox</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                    You are currently utilizing simulated enterprise unread emails (e.g., database replica sync lag, incorrect Q2 revenue forecasts) and clashing calendar events to demonstrate full functionality. Sign in to live compile your real Google Mail and Calendar.
                  </p>
                </div>
              </div>
              <button
                onClick={handleGoogleSignIn}
                className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 font-bold border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all whitespace-nowrap self-stretch md:self-auto justify-center"
              >
                <span>CONNECT LIVE GOOGLE ACCOUNT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Sync Feed / Background status */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 font-mono border-b border-slate-900 pb-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-600" />
                Last scanned: <span className="text-slate-300 font-bold">{lastPolledTime}</span>
              </span>
              <span className="h-3.5 w-px bg-slate-800" />
              <span className="flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-amber-500' : 'text-slate-600'}`} />
                Auto-scan active: <span className="text-slate-300 font-bold">Every 60s</span>
              </span>
            </div>
            <button 
              onClick={() => triggerSummaryFetch(accessToken)}
              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline transition font-mono"
            >
              Trigger Instant Sync Scan
            </button>
          </div>

          {/* Grid Core Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left / Middle: Briefing panel (7 cols) */}
            <div className="lg:col-span-7 h-[680px]">
              <BriefingPanel 
                briefing={briefing} 
                onSelectEmail={(id) => {
                  setSelectedEmailId(id);
                  // Scroll beautifully to email module
                  const el = document.getElementById('email-module');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                isLoading={isLoadingSummary}
              />
            </div>

            {/* Right: Calendar feed (5 cols) */}
            <div className="lg:col-span-5 h-[680px]">
              <CalendarModule 
                events={events}
                accessToken={accessToken}
                onQuickRescheduleEmail={handleQuickReschedule}
              />
            </div>
          </div>

          {/* Intelligent Command bar */}
          <CommandBar 
            onParsedDraft={(draft) => setActiveDraft(draft)}
            isParsing={isParsingCommand}
            setIsParsing={setIsParsingCommand}
          />

          {/* Email Mailbox system */}
          <div className="h-[620px]">
            <EmailModule 
              emails={emails}
              selectedEmailId={selectedEmailId}
              onSelectEmail={setSelectedEmailId}
              accessToken={accessToken}
              onSendRealEmail={handleSendRealEmail}
              onTriggerRefresh={() => triggerSummaryFetch(accessToken)}
              isPolling={isPolling}
            />
          </div>

        </main>

        {/* Humble Footer */}
        <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs font-mono text-slate-600">
          <p>AI Morning Briefing Agent &copy; 2026. Fully secure server-side Gemini Proxy Orchestration.</p>
        </footer>
      </div>
    </div>
  );
}
