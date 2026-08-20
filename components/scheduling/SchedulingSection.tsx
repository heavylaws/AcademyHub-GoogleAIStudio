'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, Users, Plus, AlertTriangle, CheckCircle2, TrendingUp, ShieldAlert, BarChart3, UserCheck } from 'lucide-react';

interface Session {
  id: string;
  title: string;
  facility: string;
  coach: string;
  sport: string;
  time: string;
  maxCapacity: number;
  enrolledCount: number;
}

interface CoachMetrics {
  id: string;
  name: string;
  sports: string[];
  attendanceRate: number;
  churnRisk: 'Low' | 'Medium' | 'High';
  retentionScore: number;
  batchFillRate: number;
}

export default function SchedulingSection() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('academyhub_sessions');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [
      { id: '1', title: 'High-Velocity Plyometrics', facility: 'Main Court A', coach: 'Coach Davis', sport: 'Basketball', time: '14:00 - 15:30', maxCapacity: 20, enrolledCount: 18 },
      { id: '2', title: 'Sprint Acceleration & Stride', facility: 'Track Strip 1', coach: 'Coach Taylor', sport: 'Track & Field', time: '16:00 - 17:00', maxCapacity: 15, enrolledCount: 14 },
      { id: '3', title: 'Lateral Agility & Direction Change', facility: 'Turf Bay 2', coach: 'Coach Morgan', sport: 'Football (Soccer)', time: '17:30 - 19:00', maxCapacity: 18, enrolledCount: 16 }
    ];
  });

  const coachMetricsList: CoachMetrics[] = [
    { id: 'c1', name: 'Coach Davis', sports: ['Basketball', 'Track & Field'], attendanceRate: 96.4, churnRisk: 'Low', retentionScore: 94.2, batchFillRate: 90.0 },
    { id: 'c2', name: 'Coach Taylor', sports: ['Track & Field', 'Football'], attendanceRate: 94.1, churnRisk: 'Low', retentionScore: 91.8, batchFillRate: 93.3 },
    { id: 'c3', name: 'Coach Morgan', sports: ['Badminton', 'Football'], attendanceRate: 89.2, churnRisk: 'Medium', retentionScore: 84.5, batchFillRate: 88.8 },
  ];

  const [title, setTitle] = useState('');
  const [facility, setFacility] = useState('Main Court A');
  const [coach, setCoach] = useState('Coach Davis');
  const [sport, setSport] = useState('Basketball');
  const [time, setTime] = useState('14:00 - 15:30');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    // Conflict Engine Checks:
    // 1. Facility double-booking check
    const facilityOverlap = sessions.find(s => s.facility === facility && s.time === time);
    if (facilityOverlap) {
      setConflictWarning(`DOUBLE-BOOKING ALERT: ${facility} is already booked for "${facilityOverlap.title}" at ${time}.`);
      setSuccessMsg(null);
      return;
    }

    // 2. Coach double-booking check
    const coachOverlap = sessions.find(s => s.coach === coach && s.time === time);
    if (coachOverlap) {
      setConflictWarning(`COACH SIMULTANEOUS OVERLAP: ${coach} is already scheduled for "${coachOverlap.title}" at ${time}.`);
      setSuccessMsg(null);
      return;
    }

    setConflictWarning(null);
    const newSess: Session = {
      id: Date.now().toString(),
      title,
      facility,
      coach,
      sport,
      time,
      maxCapacity: 16,
      enrolledCount: 12,
    };

    const updated = [...sessions, newSess];
    setSessions(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('academyhub_sessions', JSON.stringify(updated));
    }

    setSuccessMsg(`Session "${title}" successfully scheduled on ${facility} with ${coach}!`);
    setTitle('');
  };

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
            Real-time double-booking conflict detection engine with integrated coach performance analytics.
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
            Coach Performance Dashboard & Retention Metrics
          </h3>
          <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-bold">
            Live KPI Sync
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coachMetricsList.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{c.name}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">{c.sports.join(' • ')}</div>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                  c.churnRisk === 'Low'
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {c.churnRisk} Churn Risk
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[10px] pt-1">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-semibold">Attendance</div>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">{c.attendanceRate}%</div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-semibold">Batch Fill</div>
                  <div className="font-mono font-bold text-cyan-600 dark:text-cyan-400 text-xs mt-0.5">{c.batchFillRate}%</div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-500 font-semibold">Retention</div>
                  <div className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs mt-0.5">{c.retentionScore}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
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
                value={time}
                onChange={(e) => setTime(e.target.value)}
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

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 bg-purple-600 hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-400 text-white dark:text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
              Check Conflicts & Schedule Session
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
                Conflict Guard Live
              </span>
            </div>

            <div className="overflow-x-auto w-full">
              <div className="space-y-3">
              {sessions.map((sess) => {
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
                          <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" /> {sess.coach}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono text-purple-700 dark:text-purple-300 font-bold bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">
                            {sess.time}
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
          </div>
        </div>
      </div>
    </div>
  );
}
