import React from 'react';
import { Calendar, Clock, MapPin, AlertTriangle, MessageSquare, Sparkles } from 'lucide-react';
import { CalendarEvent } from '../types';

interface CalendarModuleProps {
  events: CalendarEvent[];
  accessToken: string | null;
  onQuickRescheduleEmail: (recipient: string, subject: string, template: string) => void;
}

export const CalendarModule: React.FC<CalendarModuleProps> = ({
  events,
  accessToken,
  onQuickRescheduleEmail,
}) => {

  const formatTime = (isoString: string) => {
    if (!isoString) return '';
    const dateObj = new Date(isoString);
    if (isNaN(dateObj.getTime())) {
      // If it's already a time string like "09:00"
      return isoString;
    }
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEventDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return '';
    }
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const hrs = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 p-6 flex flex-col h-full shadow-2xl shadow-slate-950/50" id="calendar-module">
      {/* Module Header */}
      <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Upcoming Executive Schedule
              {accessToken && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Calendar Live Sync" />
              )}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {accessToken ? "Live Google Calendar Feed" : "Simulated Timeline Feed"}
            </p>
          </div>
        </div>
      </div>

      {/* Events Timeline List */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto opacity-40" />
            <p className="text-xs text-slate-500 font-mono">Your calendar is completely clear for today.</p>
          </div>
        ) : (
          events.map(evt => {
            const isClash = evt.clash;
            return (
              <div
                key={evt.id}
                className={`transition-all rounded-xl border p-4.5 space-y-3 relative ${
                  isClash
                    ? 'bg-amber-500/[0.02] border-amber-500/20 hover:border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.02)]'
                    : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-800'
                }`}
              >
                {/* Clash marker */}
                {isClash && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] font-mono text-amber-400 font-bold animate-pulse">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    TIMELINE CLASH
                  </div>
                )}

                <div className="space-y-1.5 pr-20">
                  <h4 className="text-[14px] font-bold text-slate-100 leading-snug">{evt.summary}</h4>
                  
                  {/* Metadata line */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {formatTime(evt.start)} - {formatTime(evt.end)}
                      <span className="text-slate-600">({getEventDuration(evt.start, evt.end)})</span>
                    </span>
                    {evt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate max-w-[150px]">{evt.location}</span>
                      </span>
                    )}
                  </div>
                </div>

                {evt.description && (
                  <p className="text-xs text-slate-400 leading-relaxed font-mono bg-slate-950/20 p-2.5 rounded border border-slate-800/30">
                    {evt.description}
                  </p>
                )}

                {/* Resolution trigger for conflicts */}
                {isClash && (
                  <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between gap-4">
                    <p className="text-[10px] text-amber-500 font-mono">
                      Overlaps with <span className="font-bold underline">{evt.clashWith}</span>
                    </p>
                    <button
                      onClick={() => {
                        const recipient = evt.summary.includes('Marcus') ? 'marcus.thorne@apex-finance.com' : 'office@apex-holdings.com';
                        const subject = `Reschedule Sync: ${evt.summary}`;
                        const template = `Hi Marcus,\n\nI noticed a calendar overlap today between our "${evt.summary}" and the APAC Strategy Sync starting at 9:00 AM.\n\nCould we reschedule our sync by 30 minutes, or potentially sync briefly at 10:30 AM? Let me know if that works for you.\n\nBest,\nRohan`;
                        onQuickRescheduleEmail(recipient, subject, template);
                      }}
                      className="px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/20 hover:border-amber-500 font-mono text-[10px] font-bold transition-all flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      EMAIL TO RESOLVE
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
