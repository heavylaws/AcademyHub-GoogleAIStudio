'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState } from 'react';
import {
  Activity,
  Calendar,
  CreditCard,
  ShieldCheck,
  Zap,
  BarChart2,
  UserCheck,
  LogOut,
  Loader2,
  Menu,
  X
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useAuth } from '@/lib/authContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const isBillingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';

  const navItems = [
    { id: 'dashboard', label: 'Overview & RAG', icon: BarChart2 },
    { id: 'profiles', label: 'Athlete Profiles', icon: UserCheck },
    { id: 'biomechanics', label: 'Biomechanics & AI', icon: Activity },
    { id: 'scheduling', label: 'Scheduling & Court', icon: Calendar },
    ...(isBillingEnabled ? [{ id: 'billing', label: 'Billing & Ledger', icon: CreditCard }] : []),
    { id: 'auth', label: 'Auth & COPPA', icon: ShieldCheck },
  ];

  const currentRole = role || (user ? 'Authenticated' : 'Guest');
  const displayName = user?.displayName || user?.email?.split('@')[0] || (user ? 'User' : 'Guest');

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-1.5 lg:py-0 lg:h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">AcademyHub</span>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                PRO v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Sports Performance & Kinematic Analytics Engine
            </p>
          </div>
        </div>

        {/* Desktop & Tablet Nav */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-4">
          <nav className="flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2 px-2 lg:px-3 min-h-[44px] min-w-[44px] lg:min-w-0 rounded-lg text-center text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                  <span className="text-[10px] lg:text-xs leading-tight whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('auth')}
              title="Click to view auth status & RBAC security gate"
              className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-medium hover:border-cyan-500/50 transition-all"
            >
              <span className={`w-2 h-2 rounded-full ${
                role === 'admin' ? 'bg-cyan-500' : role === 'coach' ? 'bg-emerald-500' : role === 'parent' ? 'bg-purple-500' : 'bg-slate-400'
              }`} />
              <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{currentRole}:</span>
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[90px] hidden sm:inline">{displayName}</span>
            </button>

            {authLoading ? (
              <div className="px-3 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-xs flex items-center justify-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-5 h-5 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 text-xs font-semibold transition-all shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : null}

            <div className="flex items-center justify-center min-h-[44px]">
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <div className="flex items-center justify-center min-h-[44px]">
            <ThemeToggle />
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-sm bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center min-h-[64px]">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center w-full gap-3 px-4 min-h-[44px] rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                <button
                  onClick={() => {
                    setActiveTab('auth');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    role === 'admin' ? 'bg-cyan-500' : role === 'coach' ? 'bg-emerald-500' : role === 'parent' ? 'bg-purple-500' : 'bg-slate-400'
                  }`} />
                  <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">{currentRole}:</span>
                  <span className="text-slate-500 dark:text-slate-400 truncate">{displayName}</span>
                </button>
                
                {authLoading ? (
                  <div className="px-4 min-h-[44px] flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="User"
                          className="w-6 h-6 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                        {user.displayName || user.email}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-sm font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}

