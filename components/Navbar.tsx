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
  const { user, role, loading: authLoading, signOut, academies, activeAcademyId, setActiveAcademy } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const activeAcademy = academies?.find(a => a.id === activeAcademyId);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const isBillingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === 'true';
  const isPlatformAdmin = role === 'admin';

  const navItems = [
    { id: 'dashboard', label: 'Overview & RAG', icon: BarChart2 },
    { id: 'profiles', label: 'Athlete Profiles', icon: UserCheck },
    { id: 'biomechanics', label: 'Biomechanics & AI', icon: Activity },
    { id: 'scheduling', label: 'Scheduling & Court', icon: Calendar },
    ...(isBillingEnabled ? [{ id: 'billing', label: 'Billing & Ledger', icon: CreditCard }] : []),
    ...(isPlatformAdmin ? [{ id: 'platform', label: 'Platform Admin', icon: ShieldCheck }] : []),
    { id: 'auth', label: 'Auth & COPPA', icon: ShieldCheck },
  ];

  const currentRole = role || (user ? 'Authenticated' : 'Guest');
  const displayName = user?.displayName || user?.email?.split('@')[0] || (user ? 'User' : 'Guest');

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors duration-200 pt-[env(safe-area-inset-top,0px)] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6 h-13 lg:h-14 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-sm shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-[6px] flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">AcademyHub</span>
              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                PRO v2.5
              </span>
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Nav */}
        <div className="hidden md:flex items-center gap-1.5 lg:gap-3">
          <nav className="flex items-center gap-0.5 lg:gap-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-lg text-center text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950 active:scale-[0.98] ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 shadow-xs font-black'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="text-[11px] lg:text-xs leading-none whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab(isPlatformAdmin ? 'platform' : 'auth')}
                title="Click to view Platform Admin Console"
                aria-label={`Role ${currentRole}: ${displayName}`}
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[38px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium hover:border-cyan-500/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  role === 'admin' ? 'bg-cyan-500' : role === 'coach' ? 'bg-emerald-500' : role === 'parent' ? 'bg-purple-500' : 'bg-slate-400'
                }`} />
                <span className="font-bold capitalize text-slate-900 dark:text-slate-100 text-[11px]">{currentRole}:</span>
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[80px] hidden sm:inline font-medium text-[11px]">{displayName}</span>
              </button>
              
              {academies.length > 1 && (
                <select
                  value={activeAcademyId || ''}
                  onChange={(e) => setActiveAcademy(e.target.value)}
                  aria-label="Select active academy"
                  className="px-2.5 py-1.5 min-h-[38px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold hover:border-cyan-500/50 transition-all text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {academies.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              )}
              {academies.length === 1 && activeAcademy && (
                <div className="px-2.5 py-1.5 min-h-[38px] flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {activeAcademy.name}
                </div>
              )}
            </div>

            {authLoading ? (
              <div className="px-2.5 min-h-[38px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 text-xs flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-4 h-4 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 flex items-center justify-center text-[9px] font-bold">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="flex items-center justify-center gap-1 px-2.5 py-1.5 min-h-[38px] rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20 text-[11px] font-bold transition-all shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 active:scale-[0.98]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : null}

            <div className="flex items-center justify-center min-h-[38px]">
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
            aria-label="Open Mobile Menu"
            aria-expanded={isMobileMenuOpen}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.97]"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-sm bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom,0px)]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center min-h-[64px] pt-[calc(1rem+env(safe-area-inset-top,0px))]">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">Menu</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label="Close Mobile Menu"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.97]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <nav className="space-y-2" aria-label="Mobile Drawer Navigation">
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
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center w-full gap-3 px-4 min-h-[44px] rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.98] ${
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'}`} />
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
                  className="flex w-full items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    role === 'admin' ? 'bg-cyan-500' : role === 'coach' ? 'bg-emerald-500' : role === 'parent' ? 'bg-purple-500' : 'bg-slate-400'
                  }`} />
                  <span className="font-bold capitalize text-slate-900 dark:text-slate-100">{currentRole}:</span>
                  <span className="text-slate-600 dark:text-slate-300 truncate">{displayName}</span>
                </button>
                
                {academies.length > 1 && (
                  <select
                    value={activeAcademyId || ''}
                    onChange={(e) => setActiveAcademy(e.target.value)}
                    aria-label="Select mobile academy"
                    className="flex w-full items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {academies.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                )}
                {academies.length === 1 && activeAcademy && (
                  <div className="flex w-full items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {activeAcademy.name}
                  </div>
                )}
                
                {authLoading ? (
                  <div className="px-4 min-h-[44px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                  </div>
                ) : user ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 px-4 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt="User"
                          className="w-6 h-6 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-500 dark:text-cyan-400 flex items-center justify-center text-xs font-bold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {user.displayName || user.email}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 active:scale-[0.98]"
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

