'use client';

import React from 'react';
import { useAuth } from '@/lib/authContext';
import { ShieldCheck, User, Zap } from 'lucide-react';

export default function AcademySelector() {
  const { academies, setActiveAcademy } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'coach':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'parent':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-white">Select Your Academy</h2>
          <p className="text-sm text-slate-400">
            Choose the academy you want to access.
          </p>
        </div>

        <div className="space-y-3">
          {academies.map((academy) => (
            <button
              key={academy.id}
              onClick={() => setActiveAcademy(academy.id)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-500/50 transition-all text-left group"
            >
              <div>
                <h3 className="font-bold text-white group-hover:text-cyan-400 transition-colors">
                  {academy.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  {academy.slug}
                </p>
              </div>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-1 rounded-md border ${getRoleColor(
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
