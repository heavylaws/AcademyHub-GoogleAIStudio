'use client';

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-800"
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
        className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.97] ${
          theme === 'light'
            ? 'bg-white text-cyan-700 font-bold shadow-xs border border-slate-200'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/60'
        }`}
      >
        <Sun className="w-3.5 h-3.5 shrink-0" />
        <span className="sr-only">Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        aria-checked={theme === 'dark'}
        role="radio"
        aria-label="Dark theme"
        title="Dark theme"
        className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.97] ${
          theme === 'dark'
            ? 'bg-slate-800 text-cyan-400 font-bold shadow-xs border border-slate-700'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/60'
        }`}
      >
        <Moon className="w-3.5 h-3.5 shrink-0" />
        <span className="sr-only">Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        aria-checked={theme === 'system'}
        role="radio"
        aria-label="System preference theme"
        title="System theme"
        className={`min-h-[36px] min-w-[36px] p-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.97] ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 font-bold shadow-xs border border-slate-200 dark:border-slate-700'
            : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/50 dark:hover:bg-slate-800/60'
        }`}
      >
        <Monitor className="w-3.5 h-3.5 shrink-0" />
        <span className="sr-only">System</span>
      </button>
    </div>
  );
}

