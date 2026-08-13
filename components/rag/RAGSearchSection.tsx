'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Sparkles, 
  Search, 
  MessageSquare, 
  Database, 
  Bot, 
  Table, 
  ArrowRight, 
  RefreshCw, 
  BookOpen, 
  Zap,
  CheckCircle2,
  FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Assessment } from '@/types/academy';

const SAMPLE_QUERIES = [
  'Find players with high endurance but poor core stability',
  'Show basketball athletes with elite composite form scores',
  'Which soccer athletes have knee valgus alignment risk on cuts?',
  'List tennis players with shoulder rotational velocity anomalies'
];

export const RAGSearchSection: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [markdownOutput, setMarkdownOutput] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  // Fetch live assessments from Firestore for context
  useEffect(() => {
    try {
      const q = query(collection(db, 'athlete_assessments'), orderBy('recordedAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const items: Assessment[] = [];
        snap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as Assessment);
        });
        setAssessments(items);
      });
      return () => unsub();
    } catch (e) {
      console.error('Firestore RAG fetch error:', e);
    }
  }, []);

  const executeRAGSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setLoading(true);
    setMarkdownOutput(null);

    try {
      const res = await fetch('/api/rag-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText, assessments })
      });

      const data = await res.json();
      if (data.success && data.markdownResult) {
        setMarkdownOutput(data.markdownResult);
      } else {
        setMarkdownOutput('### Search Error\nFailed to query narrative embeddings.');
      }
    } catch (err) {
      console.error('RAG Search API call failed:', err);
      setMarkdownOutput('### Search Error\nAn unexpected error occurred during database RAG query.');
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (qStr: string) => {
    setSearchQuery(qStr);
    executeRAGSearch(qStr);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Conversational RAG Search Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Talk-to-Database Narrative Log Intelligence
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Query unstructured qualitative coach reports and biomechanics logs using natural language.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-xs text-slate-400">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Vector Corpus: <strong className="text-white">{assessments.length} Athletes</strong></span>
        </div>
      </div>

      {/* Natural Language Query Bar */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          Enter Coach Natural Language Query
        </label>

        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeRAGSearch(searchQuery)}
            placeholder="e.g. Find players with high endurance but poor core stability..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-32 py-3.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-inner font-sans"
          />

          <button
            onClick={() => executeRAGSearch(searchQuery)}
            disabled={loading || !searchQuery.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Querying...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Search Database
              </>
            )}
          </button>
        </div>

        {/* Sample Prompt Chips */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Suggested Coaching Queries
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((qStr, idx) => (
              <button
                key={idx}
                onClick={() => handleChipClick(qStr)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 text-left"
              >
                <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>{qStr}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RAG Search Output Display (Markdown Table & Recommendations) */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            AI RAG Search Synthesis & Strategic Table
          </h3>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
            Gemini Semantic Search Engine
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <div className="text-sm font-bold text-white">Searching Unstructured Athlete Reports...</div>
            <p className="text-xs text-slate-400 font-mono">
              Running semantic vector alignment over narrative biomechanics logs
            </p>
          </div>
        ) : markdownOutput ? (
          <div className="p-6 rounded-xl bg-slate-950 border border-slate-800/80 text-slate-200 text-xs leading-relaxed space-y-4">
            <div className="markdown-body prose prose-invert max-w-none prose-sm prose-table:border prose-table:border-slate-800 prose-th:bg-slate-900 prose-th:text-emerald-400 prose-td:border-slate-800/80 prose-td:p-3 font-sans">
              <ReactMarkdown>{markdownOutput}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center space-y-2 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/50">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400 font-mono">
              Select a sample coaching query above or enter a natural language question to search athlete narrative logs.
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
