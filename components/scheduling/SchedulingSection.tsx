'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  Users, 
  AlertTriangle, 
  Plus, 
  CheckCircle2, 
  Building2, 
  Award, 
  TrendingDown, 
  TrendingUp, 
  ShieldAlert,
  Database,
  Filter,
  Check
} from 'lucide-react';
import { collection, onSnapshot, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ScheduleSession, CoachMetric } from '@/types/academy';

const FACILITIES = [
  'Court 1 - Main Gymnasium',
  'Court 2 - Outdoor Hardcourt',
  'Turf Field A',
  'Turf Field B',
  'Aquatic Center Pool Lanes 1-4',
  'Indoor Volleyball Court'
];

const SPORTS_LIST = ['Basketball', 'Soccer', 'Tennis', 'Swimming', 'Volleyball', 'Track & Field'];

export const SchedulingSection: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduleSession[]>([]);
  const [coaches, setCoaches] = useState<CoachMetric[]>([]);

  // New Booking Modal & Form State
  const [isAddingSession, setIsAddingSession] = useState(false);
  const [newTitle, setNewTitle] = useState('High Performance Agility Lab');
  const [newSport, setNewSport] = useState('Basketball');
  const [newFacility, setNewFacility] = useState(FACILITIES[0]);
  const [newCoachId, setNewCoachId] = useState('COACH-01');
  const [newDate, setNewDate] = useState('2026-08-14');
  const [newStartTime, setNewStartTime] = useState('10:00');
  const [newEndTime, setNewEndTime] = useState('12:00');
  const [newCapacity, setNewCapacity] = useState(16);
  const [newNotes, setNewNotes] = useState('High intensity plyometric drill');

  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Subscribe to Firestore 'schedules' & 'coaches'
  useEffect(() => {
    try {
      const qSched = query(collection(db, 'schedules'), orderBy('date', 'asc'));
      const unsubSched = onSnapshot(qSched, (snap) => {
        const items: ScheduleSession[] = [];
        snap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as ScheduleSession);
        });
        setSchedules(items);
      });

      const qCoach = collection(db, 'coaches');
      const unsubCoach = onSnapshot(qCoach, (snap) => {
        const items: CoachMetric[] = [];
        snap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as CoachMetric);
        });
        setCoaches(items);
      });

      return () => {
        unsubSched();
        unsubCoach();
      };
    } catch (e) {
      console.error('Firestore scheduling sub error:', e);
    }
  }, []);

  // Calculate Conflict Warning directly on render
  const selectedCoach = coaches.find(c => c.coachId === newCoachId);
  
  let conflictWarning: string | null = null;
  if (selectedCoach && !selectedCoach.sportSpecialties.includes(newSport)) {
    conflictWarning = `Specialty Warning: ${selectedCoach.coachName} does not list ${newSport} as a primary specialty.`;
  } else {
    const timeOverlap = (start1: string, end1: string, start2: string, end2: string) => {
      return (start1 < end2 && start2 < end1);
    };

    const doubleBooked = schedules.find((s) => {
      if (s.date !== newDate) return false;
      return timeOverlap(newStartTime, newEndTime, s.startTime, s.endTime);
    });

    if (doubleBooked) {
      if (doubleBooked.facility === newFacility) {
        conflictWarning = `Conflict Alert: ${newFacility} is already booked for "${doubleBooked.title}" between ${doubleBooked.startTime} - ${doubleBooked.endTime}.`;
      } else if (doubleBooked.coachId === newCoachId) {
        conflictWarning = `Conflict Alert: ${doubleBooked.coachName} is already assigned to "${doubleBooked.title}" between ${doubleBooked.startTime} - ${doubleBooked.endTime}.`;
      }
    }
  }

  const handleCreateSession = async () => {
    try {
      const selectedCoach = coaches.find(c => c.coachId === newCoachId);
      const coachName = selectedCoach ? selectedCoach.coachName : 'Coach Staff';

      const newSession: ScheduleSession = {
        title: newTitle,
        sport: newSport,
        facility: newFacility,
        coachId: newCoachId,
        coachName,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        capacity: newCapacity,
        enrolled: Math.floor(newCapacity * 0.8),
        status: 'Scheduled',
        notes: newNotes
      };

      await addDoc(collection(db, 'schedules'), newSession);
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setIsAddingSession(false);
      }, 2000);
    } catch (e) {
      console.error('Error adding schedule:', e);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Facility Operations & Coach Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Coach Scheduling & Retention Tracker
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Automated conflict checking for court capacity, coach availability, and class retention metrics.
          </p>
        </div>

        <button
          onClick={() => setIsAddingSession(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Book New Court / Class Session
        </button>
      </div>

      {/* Coach Performance & Retention Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {coaches.map((c) => (
          <div
            key={c.coachId}
            className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4 hover:border-slate-700 transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{c.coachName}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{c.email}</p>
              </div>

              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                c.churnRisk === 'Low'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : c.churnRisk === 'Medium'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {c.churnRisk} Churn Risk
              </span>
            </div>

            {/* Specialties */}
            <div className="flex flex-wrap gap-1.5">
              {c.sportSpecialties.map((s) => (
                <span key={s} className="text-[10px] bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800 font-mono">
                  {s}
                </span>
              ))}
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-mono">Program Fill Rate</div>
                <div className="text-lg font-black text-emerald-400 font-mono my-0.5">{c.fillRate}%</div>
                <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                  <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${c.fillRate}%` }}></div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <div className="text-[10px] text-slate-400 font-mono">Attendance Rate</div>
                <div className="text-lg font-black text-cyan-400 font-mono my-0.5">{c.attendanceRate}%</div>
                <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                  <div className="bg-cyan-400 h-1 rounded-full" style={{ width: `${c.attendanceRate}%` }}></div>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 text-[11px] text-slate-400 border border-slate-800/60 leading-snug">
              <span className="text-slate-300 font-semibold">Retention Notes:</span> {c.notes}
            </div>
          </div>
        ))}
      </div>

      {/* Booking Conflict Detection Modal / Drawer */}
      {isAddingSession && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Book Court & Assign Coach
              </h3>
              <button
                onClick={() => setIsAddingSession(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            {/* Conflict Warning Alert Banner */}
            {conflictWarning && (
              <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-300 text-xs font-semibold flex items-start gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-200">Scheduling Conflict Alert Detected</div>
                  <div className="text-[11px] font-mono mt-0.5">{conflictWarning}</div>
                </div>
              </div>
            )}

            {bookingSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Session successfully scheduled into Firestore!
              </div>
            )}

            {/* Modal Form Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Session Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Sport</label>
                  <select
                    value={newSport}
                    onChange={(e) => setNewSport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {SPORTS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Facility / Court</label>
                  <select
                    value={newFacility}
                    onChange={(e) => setNewFacility(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {FACILITIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Assign Coach</label>
                  <select
                    value={newCoachId}
                    onChange={(e) => setNewCoachId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {coaches.map((c) => (
                      <option key={c.coachId} value={c.coachId}>
                        {c.coachName} ({c.sportSpecialties.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">End Time</label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Capacity</label>
                  <input
                    type="number"
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddingSession(false)}
                className="px-4 py-2 rounded-xl bg-slate-950 text-slate-400 hover:text-white border border-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={!!conflictWarning && conflictWarning.includes('Conflict Alert')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                  conflictWarning && conflictWarning.includes('Conflict Alert')
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Team Calendar & Court Booking Table */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Live Team Calendar & Facility Reservations
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time court bookings stored in Firestore &quot;schedules&quot; collection.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            {schedules.length} Active Sessions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Session & Sport</th>
                <th className="py-3 px-4">Facility / Court</th>
                <th className="py-3 px-4">Assigned Coach</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Capacity / Enrolled</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {schedules.map((s, idx) => (
                <tr key={s.id || idx} className="hover:bg-slate-950/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {s.title}
                    <div className="text-[10px] text-emerald-400 font-normal">{s.sport}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {s.facility}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-cyan-400">
                    {s.coachName}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {s.date} ({s.startTime} - {s.endTime})
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {s.enrolled} / {s.capacity}
                    <div className="w-24 bg-slate-950 rounded-full h-1 mt-1 overflow-hidden border border-slate-800">
                      <div 
                        className="bg-emerald-400 h-1 rounded-full" 
                        style={{ width: `${Math.min(100, (s.enrolled / s.capacity) * 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
