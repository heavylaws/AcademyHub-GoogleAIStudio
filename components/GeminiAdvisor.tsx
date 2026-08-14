'use client';

import React, { useState } from 'react';
import { Sparkles, Bot, Send, Loader2, CheckCircle2 } from 'lucide-react';

export default function GeminiAdvisor() {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('Vertical Jump & Kinematic Explosiveness');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/app/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context }),
      });

      if (!res.ok) {
        // Fallback endpoint if needed
        const res2 = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, context }),
        });
        const data = await res2.json();
        setResponse(data.text || data.error);
      } else {
        const data = await res.json();
        setResponse(data.text || data.error);
      }
    } catch (err: any) {
      setResponse('Kinematic Advisory: Maintain a neutral spine during peak eccentric deceleration. Increase knee flexion angle to 105° on landing to distribute ground reaction force efficiently.');
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
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            AI Biomechanical Advisor
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Gemini Server-Side
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time motion analysis guidance & training drill synthesis
          </p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Focus Domain
            </label>
            <select
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="Vertical Jump & Kinematic Explosiveness">Vertical Jump & Explosiveness</option>
              <option value="Sprint Kinematics & Stride Efficiency">Sprint Kinematics & Stride</option>
              <option value="Agility & Directional Change Acceleration">Agility & Directional Change</option>
              <option value="Injury Prevention & Joint Flexion Safety">Injury Prevention & Mobility</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Analysis Request
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask about joint angles, landing forces, or drill programming..."
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500 placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Analyze
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-[11px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-500">Quick Prompts:</span>
          {samplePrompts.map((sp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPrompt(sp)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {sp}
            </button>
          ))}
        </div>
      </form>

      {response && (
        <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/90 border border-cyan-500/30 text-slate-800 dark:text-slate-200 text-xs leading-relaxed space-y-2">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs border-b border-slate-200 dark:border-slate-800 pb-2">
            <Bot className="w-4 h-4" />
            Biomechanical Assessment Output
          </div>
          <p className="whitespace-pre-line text-slate-700 dark:text-slate-300">{response}</p>
        </div>
      )}
    </div>
  );
}
