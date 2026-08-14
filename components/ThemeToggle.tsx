'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800"
      role="radiogroup"
      aria-label="Color theme switcher"
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        aria-checked={theme === 'light'}
        role="radio"
        aria-label="Light theme"
        title="Light theme"
        className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
          theme === 'light'
            ? 'bg-white text-cyan-600 shadow-sm border border-slate-200'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Sun className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-checked={theme === 'dark'}
        role="radio"
        aria-label="Dark theme"
        title="Dark theme"
        className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
          theme === 'dark'
            ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Moon className="w-4 h-4" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        aria-checked={theme === 'system'}
        role="radio"
        aria-label="System preference theme"
        title="System theme"
        className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm border border-slate-200 dark:border-slate-700'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
