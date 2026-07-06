import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, AlertCircle, HelpCircle, ArrowRight } from 'lucide-react';

interface CommandBarProps {
  onParsedDraft: (draft: { to: string; subject: string; body: string }) => void;
  isParsing: boolean;
  setIsParsing: (val: boolean) => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  onParsedDraft,
  isParsing,
  setIsParsing,
}) => {
  const [command, setCommand] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef<any>(null);

  const SUGGESTED_COMMANDS = [
    "Email Sarah that the Q2 spreadsheet revisions are finished and uploaded",
    "Send an update to Dave about tomorrow's sync, confirming 9:30 AM works",
    "Email Marcus that the APAC margin revenue formula hardcoding has been corrected"
  ];

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
        setErrorMessage('');
      };

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setCommand(text);
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setErrorMessage(`Voice input error: ${event.error}`);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      setErrorMessage("Speech recognition is not supported or permitted in this browser context.");
      // Simulated voice fill for demonstration if unsupported
      setCommand("Email Sarah that the Q2 spreadsheet revisions are finished");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!command.trim()) return;

    setIsParsing(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/parse-email-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse command');
      }

      const data = await res.json();
      if (data.draft) {
        onParsedDraft(data.draft);
        setCommand('');
      } else {
        setErrorMessage('Unable to resolve email parameters from command.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error processing command on server.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800/80 p-5 space-y-4 shadow-xl" id="command-bar-panel">
      {/* Label and Tech-looking specs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4.5 h-4.5 text-amber-500" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">Intelligent Executive Command Center</h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">Natural Language & Voice Parser</span>
      </div>

      {/* Form with input */}
      <form onSubmit={handleSubmit} className="relative flex items-center bg-slate-950 rounded-xl border border-slate-800 focus-within:border-amber-500/50 p-1">
        <button
          type="button"
          onClick={handleToggleVoice}
          className={`p-3 rounded-lg transition-all ${
            isRecording 
              ? 'bg-red-500/10 text-red-500 animate-pulse' 
              : 'text-slate-400 hover:text-amber-500 hover:bg-slate-900'
          }`}
          title={isRecording ? "Stop voice dictation" : "Dictate command with voice"}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Speak or type a command... (e.g. 'Email Sarah that the spreadsheet revisions are finished')"
          className="flex-1 bg-transparent border-0 outline-none text-slate-100 text-sm font-sans px-3 h-11 placeholder-slate-500"
          disabled={isParsing}
        />

        <button
          type="submit"
          disabled={isParsing || !command.trim()}
          className="p-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 rounded-lg transition-all font-medium flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Error Output */}
      {errorMessage && (
        <div className="text-xs text-red-400 font-mono flex items-center gap-2 bg-red-500/5 border border-red-500/15 p-2.5 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Suggestions block */}
      <div className="space-y-2">
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
          <HelpCircle className="w-3 h-3" />
          <span>SUGGESTED EXECUTIVE COMMANDS</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {SUGGESTED_COMMANDS.map((sug, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCommand(sug)}
              className="text-left bg-slate-950/40 hover:bg-slate-950 border border-slate-800/80 hover:border-slate-700 p-3 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-all font-mono flex items-start gap-2 group"
            >
              <ArrowRight className="w-3.5 h-3.5 text-amber-500/60 group-hover:translate-x-0.5 transition-transform mt-0.5 shrink-0" />
              <span className="line-clamp-2 leading-relaxed">{sug}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
