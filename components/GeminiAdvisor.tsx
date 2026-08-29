'use client';

import React, { useState } from 'react';
import { Sparkles, Bot, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth, getAcademyHeaders } from '@/lib/authContext';

export default function GeminiAdvisor() {
  const { user, activeAcademyId } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('Vertical Jump & Kinematic Explosiveness');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse(null);

    if (!user) {
      setResponse('Authentication required: Please sign in to use the AI Biomechanical Advisor.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAcademyHeaders(activeAcademyId),
        },
        credentials: 'include',
        body: JSON.stringify({ prompt, context }),
      });

      const data = await res.json();
      setResponse(data.text || data.error);
    } catch (err) {
      setResponse(err instanceof Error ? err.message : 'Unable to generate a biomechanics recommendation.');
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'How to correct asymmetrical hip hip-rotation during sprinting?',
    'Optimize plyometric landing mechanics for junior basket athletes',
    'Recommend recovery protocol after high ground-reaction force training'
  ];

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl dark:shadow-slate-950/50 relative overflow-hidden transition-colors duration-200">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            AI Biomechanical Advisor
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              Gemini Server-Side
            </span>
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            Real-time motion analysis guidance & training drill synthesis
          </p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1 space-y-1">
            <label htmlFor="advisor-context" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Focus Domain
            </label>
            <select
              id="advisor-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="Vertical Jump & Kinematic Explosiveness">Vertical Jump & Explosiveness</option>
              <option value="Sprint Kinematics & Stride Efficiency">Sprint Kinematics & Stride</option>
              <option value="Agility & Directional Change Acceleration">Agility & Directional Change</option>
              <option value="Injury Prevention & Joint Flexion Safety">Injury Prevention & Mobility</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label htmlFor="advisor-prompt" className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Analysis Request
            </label>
            <div className="flex gap-2">
              <input
                id="advisor-prompt"
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about joint angles, landing forces, or drill programming..."
                className="flex-1 min-h-[44px] bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder:text-slate-500 dark:placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="min-h-[44px] bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Analyze
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-[11px] text-slate-600 dark:text-slate-300">
          <span className="font-bold text-slate-700 dark:text-slate-200">Quick Prompts:</span>
          {samplePrompts.map((sp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(sp)}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 text-slate-800 dark:text-slate-200 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {sp}
            </button>
          ))}
        </div>
      </form>

      {response && (
        <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-cyan-500/30 text-slate-800 dark:text-slate-200 text-xs leading-relaxed space-y-2 shadow-inner">
          <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-extrabold text-xs border-b border-slate-200 dark:border-slate-800 pb-2">
            <Bot className="w-4 h-4" />
            Biomechanical Assessment Output
          </div>
          <p className="whitespace-pre-line text-slate-800 dark:text-slate-200 font-medium">{response}</p>
        </div>
      )}
    </div>
  );
}

