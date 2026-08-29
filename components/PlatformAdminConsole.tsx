'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Plus,
  Loader2,
  RefreshCw,
  Power,
  CheckCircle2,
  AlertCircle,
  Users,
  Activity,
  CreditCard,
} from 'lucide-react';
import PlatformAuditLogs from '@/components/PlatformAuditLogs';

interface PlatformAcademy {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    memberships: number;
    athletes: number;
    assessments: number;
    invoices: number;
  };
}

export default function PlatformAdminConsole() {
  const [academies, setAcademies] = useState<PlatformAcademy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Academy Form State
  const [newAcademyName, setNewAcademyName] = useState('');
  const [newAcademySlug, setNewAcademySlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const fetchPlatformAcademies = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/platform/academies', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load platform academies.');
      }
      const data = await res.json();
      setAcademies(data.academies || []);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch platform academies. Ensure you are signed in as a Platform Admin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformAcademies();
  }, []);

  const handleCreateAcademy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAcademyName.trim() || !newAcademySlug.trim()) return;

    setCreating(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/platform/academies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newAcademyName.trim(),
          slug: newAcademySlug.trim().toLowerCase().replace(/\s+/g, '-'),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create academy.');
      }

      setSuccessMsg(`Successfully created academy '${data.academy.name}'!`);
      setNewAcademyName('');
      setNewAcademySlug('');
      await fetchPlatformAcademies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating academy');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    setActionBusyId(id);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/platform/academies/${id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentActive }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action failed');
      }

      setSuccessMsg(`Updated status for academy '${data.academy.name}' to ${data.academy.isActive ? 'Active' : 'Deactivated'}.`);
      await fetchPlatformAcademies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update academy status');
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/30 mb-1">
            <ShieldCheck className="w-4 h-4" /> Platform Super Admin Console
          </div>
          <h1 className="text-2xl font-black tracking-tight">System Academy Management & Global Audit</h1>
          <p className="text-xs text-slate-400">
            Create tenant academies, toggle access statuses, and monitor system-wide security audit trails.
          </p>
        </div>

        <button
          onClick={fetchPlatformAcademies}
          disabled={loading}
          className="z-10 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Platform Data
        </button>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Create New Academy Card & Form */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 p-6 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Register New Tenant Academy</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Instantly provision a new isolated tenant academy on the platform.</p>
          </div>
        </div>

        <form onSubmit={handleCreateAcademy} className="grid gap-4 sm:grid-cols-3 items-end">
          <div className="space-y-1.5 sm:col-span-1">
            <label htmlFor="plat-academy-name" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Academy Name
            </label>
            <input
              id="plat-academy-name"
              type="text"
              value={newAcademyName}
              onChange={(e) => {
                setNewAcademyName(e.target.value);
                if (!newAcademySlug) {
                  setNewAcademySlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                }
              }}
              placeholder="e.g. Metro Sports Performance"
              required
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <label htmlFor="plat-academy-slug" className="text-xs font-bold text-slate-800 dark:text-slate-200">
              URL Slug Identifier
            </label>
            <input
              id="plat-academy-slug"
              type="text"
              value={newAcademySlug}
              onChange={(e) => setNewAcademySlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="e.g. metro-sports"
              required
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 font-mono outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 px-4 flex items-center justify-center gap-2 shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 active:scale-[0.98] disabled:opacity-60"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Provisioning...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Provision Academy
              </>
            )}
          </button>
        </form>
      </div>

      {/* Platform Academies List */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 p-6 backdrop-blur-xl shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" /> System Registered Academies ({academies.length})
          </h2>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Multi-tenant Root</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-3 px-3">Academy Name</th>
                <th className="py-3 px-3">Slug</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Athletes</th>
                <th className="py-3 px-3">Assessments</th>
                <th className="py-3 px-3">Invoices</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading && academies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-cyan-500 mb-2" />
                    Loading system academies...
                  </td>
                </tr>
              ) : academies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500">No academies registered on the platform yet.</td>
                </tr>
              ) : (
                academies.map((ac) => (
                  <tr key={ac.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white">{ac.name}</td>
                    <td className="py-3.5 px-3 font-mono text-slate-500 dark:text-slate-400">{ac.slug}</td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          ac.isActive
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ac.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {ac.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1"><Users className="w-3 h-3 text-cyan-500" /> {ac._count.athletes}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-500" /> {ac._count.assessments}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1"><CreditCard className="w-3 h-3 text-purple-500" /> {ac._count.invoices}</span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleToggleActive(ac.id, ac.isActive)}
                        disabled={actionBusyId === ac.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          ac.isActive
                            ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                            : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                        }`}
                      >
                        {actionBusyId === ac.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Power className="w-3.5 h-3.5" />
                        )}
                        {ac.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global System Audit Trail */}
      <PlatformAuditLogs />
    </div>
  );
}
