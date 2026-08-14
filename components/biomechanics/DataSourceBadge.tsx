'use client';

import React from 'react';
import { DataSource } from '@/types/assessment';
import { Edit3, Sparkles, Cpu, UserCheck } from 'lucide-react';

interface DataSourceBadgeProps {
  dataSource?: DataSource | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

/**
 * Clean UI Status Badge representing evaluation origin:
 * - 'Manual Coach Entry' when data_source === 'manual'
 * - 'AI Assessed' when processed by Gemini / AI agentic pipeline
 */
export default function DataSourceBadge({
  dataSource = 'manual',
  size = 'sm',
  showIcon = true,
  className = '',
}: DataSourceBadgeProps) {
  const isAI = dataSource === 'ai_agentic' || dataSource === 'ai' || dataSource === 'gemini';

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-xs sm:text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  if (isAI) {
    return (
      <span
        className={`inline-flex items-center font-mono font-bold rounded-lg border transition-all shadow-sm ${sizeClasses} bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 dark:border-purple-400/30 ${className}`}
        title="Evaluated via Server-Side Gemini Multi-Agent Biomechanics Pipeline"
      >
        {showIcon && (
          <Sparkles className={`${iconSizes} text-purple-600 dark:text-purple-400 animate-pulse shrink-0`} />
        )}
        <span>AI Assessed</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-mono font-bold rounded-lg border transition-all ${sizeClasses} bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 border-cyan-500/30 dark:border-cyan-500/30 ${className}`}
      title="Evaluated via Manual Coach Form Entry with Deterministic Scoring Formula"
    >
      {showIcon && (
        <UserCheck className={`${iconSizes} text-cyan-600 dark:text-cyan-400 shrink-0`} />
      )}
      <span>Manual Coach Entry</span>
    </span>
  );
}
