'use client';

import React from 'react';
import { useAuth } from '@/lib/authContext';
import { ShieldCheck, User, Zap } from 'lucide-react';

export default function AcademySelector() {
  const { academies, setActiveAcademy } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'coach':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'parent':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="academy-selector-title"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 id="academy-selector-title" className="text-2xl font-black text-white">
            Select Your Academy
          </h2>
          <p className="text-sm text-slate-300 font-medium">
            Choose the academy environment you want to access.
          </p>
        </div>

        <div className="space-y-3" role="group" aria-label="Available Academies">
          {academies.map((academy) => (
            <button
              key={academy.id}
              onClick={() => setActiveAcademy(academy.id)}
              aria-label={`Select ${academy.name} (${academy.role} role)`}
              className="w-full min-h-[52px] flex items-center justify-between p-4 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500/50 transition-all text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.98]"
            >
              <div>
                <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {academy.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {academy.slug}
                </p>
              </div>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-lg border ${getRoleColor(
                  academy.role
                )}`}
              >
                {academy.role}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

