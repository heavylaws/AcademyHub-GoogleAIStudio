'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Activity, 
  Calendar, 
  CreditCard, 
  Search, 
  Menu, 
  X, 
  User, 
  LogOut, 
  Sparkles, 
  Lock, 
  Award,
  ChevronRight
} from 'lucide-react';
import { useAcademyAuth } from '@/hooks/useAcademyAuth';
import { ensureFirestoreSeeded } from '@/lib/firestoreSync';

import { AuthSection } from '@/components/auth/AuthSection';
import { BiomechanicsSection } from '@/components/biomechanics/BiomechanicsSection';
import { SchedulingSection } from '@/components/scheduling/SchedulingSection';
import { BillingSection } from '@/components/billing/BillingSection';
import { RAGSearchSection } from '@/components/rag/RAGSearchSection';

export type ActiveTab = 'auth' | 'biomechanics' | 'scheduling' | 'billing' | 'rag';

export const SidebarLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('biomechanics');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    user,
    userProfile,
    loading,
    loginWithGoogle,
    loginAsDemoRole,
    switchUserRole,
    logout
  } = useAcademyAuth();

  // Seed Firestore on startup
  useEffect(() => {
    ensureFirestoreSeeded();
  }, []);

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
    { id: 'biomechanics', label: 'Biomechanics & Ingestion', icon: Activity, badge: 'Agentic CV' },
    { id: 'scheduling', label: 'Scheduling & Retention', icon: Calendar, badge: 'Live Court' },
    { id: 'billing', label: 'Consolidated Billing', icon: CreditCard, badge: '10% Sibling' },
    { id: 'rag', label: 'Conversational RAG Search', icon: Search, badge: 'Talk-to-DB' },
    { id: 'auth', label: 'Admin & Coach Auth', icon: ShieldCheck, badge: 'COPPA' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-black text-slate-950 text-sm shadow-md">
            AH
          </div>
          <span className="font-bold text-white text-base tracking-wider font-mono">AcademyHub</span>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-30 w-72 bg-slate-900/95 border-r border-slate-800/80 p-5 flex flex-col justify-between transform transition-transform duration-300 ease-in-out backdrop-blur-xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 pb-5 border-b border-slate-800/80">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-400 via-cyan-400 to-emerald-500 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-emerald-500/20">
              AH
            </div>
            <div>
              <div className="font-black text-white text-lg tracking-wider font-mono leading-none">
                AcademyHub
              </div>
              <div className="text-[10px] text-emerald-400 font-mono font-medium mt-1 uppercase tracking-widest">
                Multi-Sport OS
              </div>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-2 font-mono">
              Dashboard Modules
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full px-3.5 py-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Session Card */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Authenticated Profile</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                {userProfile?.displayName ? userProfile.displayName.substring(0, 2).toUpperCase() : 'AH'}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">
                  {userProfile?.displayName || 'Guest Coach'}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono font-semibold uppercase">
                  {userProfile?.role || 'Guest'} Role
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
            <span>COPPA & GDPR Security</span>
            <span className="text-emerald-400">Rules Active</span>
          </div>
        </div>
      </aside>

      {/* Main Content View Container */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'auth' && (
              <AuthSection
                userProfile={userProfile}
                loading={loading}
                onLoginGoogle={loginWithGoogle}
                onLoginDemo={loginAsDemoRole}
                onSwitchRole={switchUserRole}
                onLogout={logout}
              />
            )}

            {activeTab === 'biomechanics' && <BiomechanicsSection />}

            {activeTab === 'scheduling' && <SchedulingSection />}

            {activeTab === 'billing' && <BillingSection />}

            {activeTab === 'rag' && <RAGSearchSection />}
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
};
