import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, AlertTriangle, CheckSquare, Sparkles, Volume2, Clock, VolumeX } from 'lucide-react';
import { MorningBriefing } from '../types';

interface BriefingPanelProps {
  briefing: MorningBriefing;
  onSelectEmail: (id: string) => void;
  isLoading: boolean;
}

export const BriefingPanel: React.FC<BriefingPanelProps> = ({ briefing, onSelectEmail, isLoading }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Load speech synthesis voices
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const allVoices = window.speechSynthesis.getVoices();
        setVoices(allVoices.filter(v => v.lang.startsWith('en')));
        // Default to a premium-sounding English voice if available
        const defaultVoice = allVoices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || 
                             allVoices.find(v => v.lang.startsWith('en'));
        if (defaultVoice) {
          setSelectedVoice(defaultVoice.name);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handlePlayPause = () => {
    if (!window.speechSynthesis) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        window.speechSynthesis.cancel();
        
        // Clean text from symbols
        const cleanText = briefing.audioText
          .replace(/[\*\_\#]/g, '')
          .replace(/(\r\n|\n|\r)/gm, " ");

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        if (selectedVoice) {
          const voiceObj = voices.find(v => v.name === selectedVoice);
          if (voiceObj) utterance.voice = voiceObj;
        }
        
        utterance.rate = speechRate;
        
        utterance.onend = () => {
          setIsPlaying(false);
        };
        
        utterance.onerror = (e) => {
          console.error("Speech error:", e);
          setIsPlaying(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  };

  // Convert markdown bullets to neat HTML list
  const renderExecutiveSummary = (summary: string) => {
    const lines = summary.split('\n').filter(line => line.trim().length > 0);
    return (
      <ul className="space-y-3.5">
        {lines.map((line, idx) => {
          const cleanLine = line.replace(/^\s*\*\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
          const isCritical = cleanLine.toLowerCase().includes('critical') || cleanLine.toLowerCase().includes('breach') || cleanLine.toLowerCase().includes('SLA');
          const isError = cleanLine.toLowerCase().includes('overstated') || cleanLine.toLowerCase().includes('error');
          return (
            <li key={idx} className="flex items-start gap-3 text-slate-300 text-[15px] leading-relaxed">
              <span className={`mt-2 h-2 w-2 rounded-full flex-shrink-0 ${
                isCritical ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 
                isError ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-500'
              }`} />
              <span className="flex-1">
                {line.startsWith('*') ? (
                  // Simple high fidelity styling for bold key words
                  <span dangerouslySetInnerHTML={{ 
                    __html: cleanLine.replace(/([A-Za-z0-9\s.\-$]+?:\s+)/, '<strong class="text-slate-100 font-semibold">$1</strong>')
                  }} />
                ) : cleanLine}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/80 p-8 h-full flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-amber-500 animate-pulse" />
        </div>
        <p className="text-slate-400 font-mono text-sm">Orchestrating executive brief via Gemini...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col h-full shadow-2xl shadow-slate-950/50" id="briefing-panel">
      {/* Header with Rise & Shine Narration controls */}
      <div className="p-6 border-b border-slate-800/80 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
              Executive Briefing <span className="text-xs font-mono py-0.5 px-2 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">Voice Active</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Rise & Shine Narration Engine</p>
          </div>
        </div>

        {/* Audio controls */}
        <div className="flex flex-wrap items-center gap-3">
          {isPlaying && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950/60 rounded-lg border border-slate-800/60">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="text-[10px] text-amber-400 font-mono ml-1.5">STREAMING</span>
            </div>
          )}

          {/* Voice selector */}
          <select 
            value={selectedVoice} 
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="bg-slate-950 text-slate-300 text-xs font-mono border border-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-500/50 max-w-[150px]"
          >
            {voices.map(v => (
              <option key={v.name} value={v.name}>{v.name.replace('Google', 'AI')}</option>
            ))}
          </select>

          {/* Speed Selector */}
          <select 
            value={speechRate} 
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="bg-slate-950 text-slate-300 text-xs font-mono border border-slate-800 rounded-lg px-2 py-1.5 outline-none focus:border-amber-500/50"
          >
            <option value="0.8">0.8x</option>
            <option value="1.0">1.0x</option>
            <option value="1.15">1.15x</option>
            <option value="1.3">1.3x</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handlePlayPause}
              className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all font-medium flex items-center gap-1.5 text-xs font-mono shadow-[0_0_12px_rgba(245,158,11,0.2)]"
              title={isPlaying ? "Pause Briefing" : "Listen to Briefing"}
              id="btn-play-briefing"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-slate-950" /> : <Play className="w-3.5 h-3.5 fill-slate-950" />}
              {isPlaying ? "PAUSE" : "LISTEN"}
            </button>
            {isPlaying && (
              <button
                onClick={handleStop}
                className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 transition"
                title="Stop Audio"
              >
                <VolumeX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Executive Summary */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono text-slate-400 tracking-wider uppercase flex items-center gap-2">
            <span>Executive Agenda</span>
            <span className="h-px flex-1 bg-slate-800/80" />
          </h3>
          <div className="bg-slate-950/40 rounded-xl p-5 border border-slate-800/50">
            {renderExecutiveSummary(briefing.executiveSummary)}
          </div>
        </div>

        {/* Timeline Clashes */}
        {briefing.timelineClashes && briefing.timelineClashes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-amber-500 tracking-wider uppercase flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>Timeline Clashes Detected</span>
              <span className="h-px flex-1 bg-amber-500/10" />
            </h3>
            <div className="space-y-3">
              {briefing.timelineClashes.map((clash, idx) => (
                <div 
                  key={idx} 
                  className="bg-amber-500/5 rounded-xl p-4.5 border border-amber-500/20 space-y-2.5 relative overflow-hidden"
                >
                  {/* subtle top line accent */}
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-amber-500/30" />
                  <div className="flex items-center justify-between">
                    <h4 className="text-[14px] font-bold text-amber-400">{clash.title}</h4>
                    <span className="text-[10px] font-mono py-0.5 px-2 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">CONFLICT</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">{clash.description}</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {clash.events.map((evt, eIdx) => (
                      <span key={eIdx} className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded">
                        {evt}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Urgent Actions */}
        {briefing.urgentActions && briefing.urgentActions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-mono text-slate-400 tracking-wider uppercase flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Critical Action Directory</span>
              <span className="h-px flex-1 bg-slate-800/80" />
            </h3>
            <div className="space-y-2.5">
              {briefing.urgentActions.map((action, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-950/40 hover:bg-slate-950/80 transition-all border border-slate-800/60 rounded-xl p-4 flex items-start gap-4"
                >
                  <div className="mt-1 h-5 w-5 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-500 font-mono text-[10px] flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-slate-100">{action.title}</h4>
                      {action.dueDate && (
                        <span className="text-[10px] font-mono text-amber-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {action.dueDate}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{action.description}</p>
                    {action.sourceEmailId && (
                      <button 
                        onClick={() => onSelectEmail(action.sourceEmailId!)}
                        className="text-[10px] text-amber-500/80 hover:text-amber-500 font-mono font-medium hover:underline flex items-center gap-1 pt-1.5"
                      >
                        <Sparkles className="w-3 h-3" />
                        View Source Message & Draft Response
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
