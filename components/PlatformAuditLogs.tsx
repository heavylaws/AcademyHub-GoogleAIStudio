'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Loader2, RefreshCw } from 'lucide-react';

interface AuditLogRow {
  id: string;
  academyId: string | null;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export default function PlatformAuditLogs() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(true);

  const fetchLogs = async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = cursor
        ? `/api/platform/audit?cursor=${encodeURIComponent(cursor)}`
        : '/api/platform/audit';
      const res = await fetch(url, { credentials: 'include' });
      if (res.status === 403) {
        setIsPlatformAdmin(false);
        setLogs([]);
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load platform audit logs');
      }
      const data = await res.json();
      if (cursor) {
        setLogs((prev) => [...prev, ...(data.auditLogs || [])]);
      } else {
        setLogs(data.auditLogs || []);
      }
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      console.error(err);
      setError('Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (!isPlatformAdmin) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Platform System Audit Logs
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            aria-label="Refresh Audit Logs"
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center justify-center gap-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.97]"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh Logs</span>
          </button>
          <span className="text-[10px] uppercase tracking-wide text-cyan-700 dark:text-cyan-300 font-mono font-bold bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
            Platform Admin
          </span>
        </div>
      </div>

      {error && (
        <div className="text-xs font-semibold text-rose-800 dark:text-rose-200 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead>
            <tr className="text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <th className="pb-2 pr-4 font-bold">Timestamp</th>
              <th className="pb-2 pr-4 font-bold">Action</th>
              <th className="pb-2 pr-4 font-bold">Actor</th>
              <th className="pb-2 pr-4 font-bold">Target</th>
              <th className="pb-2 pr-4 font-bold">Academy</th>
            </tr>
          </thead>
          <tbody>
            {loading && logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                    Loading audit trail...
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-slate-600 dark:text-slate-300 font-medium">
                  No audit log entries recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 pr-4 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="font-mono text-[11px] font-bold text-cyan-800 dark:text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-800 dark:text-slate-200 font-medium">
                    {log.actorUserId}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-800 dark:text-slate-200 font-medium">
                    {log.targetType}:{log.targetId}
                  </td>
                  <td className="py-2.5 pr-4 font-mono text-slate-600 dark:text-slate-300 font-medium">
                    {log.academyId || 'Global (Platform)'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextCursor && (
        <div className="pt-2 text-center">
          <button
            onClick={() => fetchLogs(nextCursor)}
            disabled={loading}
            className="px-4 py-2.5 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load More Logs'}
          </button>
        </div>
      )}
    </section>
  );
}
