'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Users, Plus, AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert, BarChart3, UserCheck, Loader2, RefreshCw } from 'lucide-react';

interface Schedule {
  id: string;
  title: string;
  facility: string;
  coachName: string;
  sport: string;
  date: string;
  timeSlot: string;
  maxCapacity: number;
  enrolledCount: number;
}

export default function SchedulingSection() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [facility, setFacility] = useState('Main Court A');
  const [coachName, setCoachName] = useState('Coach Davis');
  const [sport, setSport] = useState('Basketball');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('14:00 - 15:30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setErrorMsg('Authentication required to view schedules.');
        } else {
          setErrorMsg('Failed to load schedules from server.');
        }
        setSchedules([]);
        return;
      }
      const data = await res.json();
      setSchedules(data.schedules || []);
      setErrorMsg(null);
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setErrorMsg('Network error while loading schedules.');
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/schedules');
        if (!isMounted) return;
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            setErrorMsg('Authentication required to view schedules.');
          } else {
            setErrorMsg('Failed to load schedules from server.');
          }
          setSchedules([]);
        } else {
          const data = await res.json();
          if (isMounted) {
            setSchedules(data.schedules || []);
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMsg('Network error while loading schedules.');
          setSchedules([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setConflictWarning(null);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          facility,
          coachName,
          sport,
          date,
          timeSlot,
          maxCapacity: 20,
          enrolledCount: 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setConflictWarning(data.error || 'Schedule conflict detected');
        } else {
          setErrorMsg(data.error || 'Failed to schedule session');
        }
        return;
      }

      setSuccessMsg(`Session "${title}" successfully scheduled on ${facility} with ${coachName}!`);
      setTitle('');
      fetchSchedules();
    } catch (err) {
      console.error('Error creating schedule:', err);
      setErrorMsg('Failed to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute coach metrics dynamically from persisted database schedules
  const coachStatsMap = new Map<string, { name: string; totalSessions: number; totalCapacity: number; totalEnrolled: number }>();

  schedules.forEach((s) => {
    const existing = coachStatsMap.get(s.coachName) || {
      name: s.coachName,
      totalSessions: 0,
      totalCapacity: 0,
      totalEnrolled: 0,
    };
    existing.totalSessions += 1;
    existing.totalCapacity += s.maxCapacity;
    existing.totalEnrolled += s.enrolledCount;
    coachStatsMap.set(s.coachName, existing);
  });

  const coachStatsList = Array.from(coachStatsMap.values());

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Coach Scheduling & Facility Reservation System
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Server-side transactional conflict detection engine backed by PostgreSQL.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Target Postgres:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">&quot;schedules&quot;</span>
        </div>
      </div>

      {/* COACH PERFORMANCE DASHBOARD */}
      <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Coach Schedule Utilization Analytics
          </h3>
          <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
            <RefreshCw className="w-3 h-3 cursor-pointer" onClick={fetchSchedules} />
            Postgres Sync
          </span>
        </div>

        {coachStatsList.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No active coach schedules found in database. Create a reservation to view live utilization metrics.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coachStatsList.map((c) => {
              const fillPct = c.totalCapacity > 0 ? Math.round((c.totalEnrolled / c.totalCapacity) * 100) : 0;
              return (
                <div key={c.name} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.totalSessions} Active Sessions</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-1">
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 font-semibold">Total Sessions</div>
                      <div className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs mt-0.5">{c.totalSessions}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="text-slate-500 font-semibold">Avg Batch Fill</div>
                      <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs mt-0.5">{fillPct}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Form & Schedule Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Reservation Booking Form */}
        <div className="md:col-span-1 lg:col-span-1 p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Book Court / Facility Reservation
          </h3>

          <form onSubmit={handleAddSession} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Session Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Explosive Jump & Smash Clinic"
                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-mono font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Facility / Court</label>
              <select
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
              >
                <option value="Main Court A">Main Court A</option>
                <option value="Main Court B">Main Court B</option>
                <option value="Track Strip 1">Track Strip 1</option>
                <option value="Turf Bay 2">Turf Bay 2</option>
                <option value="Badminton Court 1">Badminton Court 1</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Coach</label>
              <select
                value={coachName}
                onChange={(e) => setCoachName(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
              >
                <option value="Coach Davis">Coach Davis (Basketball & Plyometrics)</option>
                <option value="Coach Taylor">Coach Taylor (Sprint & Athletics)</option>
                <option value="Coach Morgan">Coach Morgan (Badminton & Agility)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Sport Category</label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-semibold"
              >
                <option value="Basketball">Basketball</option>
                <option value="Track & Field">Track & Field</option>
                <option value="Football (Soccer)">Football (Soccer)</option>
                <option value="Badminton">Badminton</option>
                <option value="Cricket">Cricket</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Time Slot</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full h-11 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-mono font-semibold"
              >
                <option value="14:00 - 15:30">14:00 - 15:30</option>
                <option value="16:00 - 17:00">16:00 - 17:00</option>
                <option value="17:30 - 19:00">17:30 - 19:00</option>
                <option value="19:00 - 20:30">19:00 - 20:30</option>
              </select>
            </div>

            {/* CONFLICT WARNING ALERT */}
            {conflictWarning && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2 font-semibold animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>{conflictWarning}</div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 text-white dark:text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking Conflicts...
                </>
              ) : (
                'Check Conflicts & Schedule Session'
              )}
            </button>
          </form>
        </div>

        {/* Calendar Sessions Grid */}
        <div className="md:col-span-1 lg:col-span-2 space-y-4">
          <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Active Court Reservations & Facility Master Schedule
              </h3>
              <span className="text-xs font-mono text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/20 font-bold">
                Server Conflict Guard Live
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                Loading schedules from PostgreSQL database...
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="font-bold text-slate-700 dark:text-slate-300">No Scheduled Sessions</div>
                <div>There are currently no active facility reservations for this academy.</div>
              </div>
            ) : (
              <div className="overflow-x-auto w-full">
                <div className="space-y-3">
                  {schedules.map((sess) => {
                    const fillPct = Math.round((sess.enrolledCount / sess.maxCapacity) * 100);
                    return (
                      <div key={sess.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                              {sess.title}
                              <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-800">
                                {sess.sport}
                              </span>
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 flex items-center gap-3 text-[11px] mt-1">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> {sess.facility}</span>
                              <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" /> {sess.coachName}</span>
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" /> {sess.date}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-mono text-purple-700 dark:text-purple-300 font-bold bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">
                                {sess.timeSlot}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Capacity Fill Indicator */}
                        <div className="pt-1 flex items-center gap-3">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-900 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-cyan-500 h-full rounded-full transition-all"
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                            Batch Fill: <strong className="text-slate-800 dark:text-slate-200">{sess.enrolledCount}/{sess.maxCapacity} ({fillPct}%)</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
