'use client';

import React, { useState } from 'react';
import { CreditCard, DollarSign, Users, CheckCircle2, Award, Calendar, Sparkles, Percent, FileText } from 'lucide-react';

interface ChildRegistration {
  childName: string;
  sport: string;
  monthlyFee: number;
}

interface FamilyInvoice {
  id: string;
  parentName: string;
  parentEmail: string;
  children: ChildRegistration[];
  subtotal: number;
  discountedChildName: string | null;
  siblingDiscountAmount: number;
  netTotal: number;
  paymentSchedule: 'upfront' | '2-part' | 'monthly';
  installmentBreakdown: { label: string; amount: number; dueDate: string; status: string }[];
  status: 'Paid' | 'Installment Active' | 'Pending';
  issuedDate: string;
}

export default function BillingSection() {
  const [paymentSchedule, setPaymentSchedule] = useState<'upfront' | '2-part' | 'monthly'>('monthly');

  // Pre-configured family registrations
  const [registeredChildren, setRegisteredChildren] = useState<ChildRegistration[]>([
    { childName: 'Marcus Vance', sport: 'Football (Soccer)', monthlyFee: 300 },
    { childName: 'Sarah Vance', sport: 'Badminton', monthlyFee: 250 },
  ]);

  const [newChildName, setNewChildName] = useState('');
  const [newChildSport, setNewChildSport] = useState('Track & Field');
  const [newChildFee, setNewChildFee] = useState(220);

  // Calculate 10% Sibling Discount on lowest cost sport
  const calculateSiblingDiscount = (items: ChildRegistration[]) => {
    const subtotal = items.reduce((acc, item) => acc + item.monthlyFee, 0);

    if (items.length <= 1) {
      return {
        subtotal,
        discountedChildName: null,
        siblingDiscountAmount: 0,
        netTotal: subtotal,
      };
    }

    // Find lowest cost item
    let lowestItem = items[0];
    for (let i = 1; i < items.length; i++) {
      if (items[i].monthlyFee < lowestItem.monthlyFee) {
        lowestItem = items[i];
      }
    }

    // 10% discount on lowest cost sport
    const discount = Math.round(lowestItem.monthlyFee * 0.10);
    const net = subtotal - discount;

    return {
      subtotal,
      discountedChildName: lowestItem.childName,
      siblingDiscountAmount: discount,
      netTotal: net,
    };
  };

  const { subtotal, discountedChildName, siblingDiscountAmount, netTotal } = calculateSiblingDiscount(registeredChildren);

  // Calculate Installment breakdown based on selected schedule
  const getInstallments = (net: number, schedule: 'upfront' | '2-part' | 'monthly') => {
    if (schedule === 'upfront') {
      return [
        { label: 'Single Upfront Payment (5% Early Pay Bonus applied)', amount: Math.round(net * 0.95), dueDate: 'Immediate', status: 'Due Now' }
      ];
    } else if (schedule === '2-part') {
      const half = Math.round(net / 2);
      return [
        { label: 'Part 1 of 2 (50%)', amount: half, dueDate: 'Immediate', status: 'Due Now' },
        { label: 'Part 2 of 2 (50%)', amount: net - half, dueDate: '30 Days', status: 'Scheduled' },
      ];
    } else {
      const monthly = Math.round(net / 3);
      return [
        { label: 'Month 1 Installment', amount: monthly, dueDate: 'Immediate', status: 'Due Now' },
        { label: 'Month 2 Installment', amount: monthly, dueDate: '30 Days', status: 'Scheduled' },
        { label: 'Month 3 Installment', amount: net - (monthly * 2), dueDate: '60 Days', status: 'Scheduled' },
      ];
    }
  };

  const currentInstallments = getInstallments(netTotal, paymentSchedule);

  const [familyInvoices, setFamilyInvoices] = useState<FamilyInvoice[]>([
    {
      id: 'INV-FAM-8042',
      parentName: 'Robert Vance',
      parentEmail: 'robert.vance@gmail.com',
      children: [
        { childName: 'Marcus Vance', sport: 'Football (Soccer)', monthlyFee: 300 },
        { childName: 'Sarah Vance', sport: 'Badminton', monthlyFee: 250 },
      ],
      subtotal: 550,
      discountedChildName: 'Sarah Vance',
      siblingDiscountAmount: 25,
      netTotal: 525,
      paymentSchedule: 'monthly',
      installmentBreakdown: [
        { label: 'Month 1 Installment', amount: 175, dueDate: 'Immediate', status: 'Paid' },
        { label: 'Month 2 Installment', amount: 175, dueDate: '30 Days', status: 'Scheduled' },
        { label: 'Month 3 Installment', amount: 175, dueDate: '60 Days', status: 'Scheduled' },
      ],
      status: 'Installment Active',
      issuedDate: '2026-08-01',
    },
    {
      id: 'INV-FAM-8044',
      parentName: 'Elena Johnson',
      parentEmail: 'parent.johnson@gmail.com',
      children: [
        { childName: 'Alex Johnson', sport: 'Basketball', monthlyFee: 300 },
      ],
      subtotal: 300,
      discountedChildName: null,
      siblingDiscountAmount: 0,
      netTotal: 300,
      paymentSchedule: 'upfront',
      installmentBreakdown: [
        { label: 'Single Upfront Payment', amount: 285, dueDate: 'Immediate', status: 'Paid' },
      ],
      status: 'Paid',
      issuedDate: '2026-08-05',
    },
  ]);

  const handleAddChildToFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName) return;

    setRegisteredChildren([
      ...registeredChildren,
      { childName: newChildName, sport: newChildSport, monthlyFee: newChildFee },
    ]);
    setNewChildName('');
  };

  const handleIssueFamilyInvoice = () => {
    const calc = calculateSiblingDiscount(registeredChildren);
    const inst = getInstallments(calc.netTotal, paymentSchedule);

    const newInv: FamilyInvoice = {
      id: `INV-FAM-${Math.floor(1000 + Math.random() * 9000)}`,
      parentName: 'Robert Vance',
      parentEmail: 'robert.vance@gmail.com',
      children: [...registeredChildren],
      subtotal: calc.subtotal,
      discountedChildName: calc.discountedChildName,
      siblingDiscountAmount: calc.siblingDiscountAmount,
      netTotal: calc.netTotal,
      paymentSchedule: paymentSchedule,
      installmentBreakdown: inst,
      status: 'Installment Active',
      issuedDate: new Date().toISOString().split('T')[0],
    };

    setFamilyInvoices([newInv, ...familyInvoices]);
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Consolidated Family Billing Engine & Sibling Discount Ledger
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Single consolidated invoices for multi-child families with automatic 10% Sibling Discount calculation and custom payment installment schedules.
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Target Firestore:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">&quot;invoices&quot;</span>
        </div>
      </div>

      {/* Main Billing Calculator & Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Family Calculator Form */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Family Registration & Discount Engine
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Target Family Account:</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">Robert Vance (robert.vance@gmail.com)</span>
            </div>

            {/* List of Linked Children */}
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Linked Children ({registeredChildren.length}):</span>
                {registeredChildren.length > 1 && (
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                    10% Sibling Discount Applied
                  </span>
                )}
              </span>

              {registeredChildren.map((ch, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{ch.childName}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-[10px]">{ch.sport}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-600 dark:text-amber-400">${ch.monthlyFee}/mo</div>
                    {discountedChildName === ch.childName && (
                      <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        -10% Discounted
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Child Form */}
            <form onSubmit={handleAddChildToFamily} className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-dashed border-slate-300 dark:border-slate-800 space-y-2">
              <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Link Additional Child:</span>
              <input
                type="text"
                placeholder="Child Name (e.g. Leo Vance)"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newChildSport}
                  onChange={(e) => setNewChildSport(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200"
                >
                  <option value="Track & Field">Track ($220)</option>
                  <option value="Cricket">Cricket ($280)</option>
                  <option value="Basketball">Basketball ($300)</option>
                  <option value="Swimming">Swimming ($260)</option>
                </select>
                <button
                  type="submit"
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-lg text-xs py-1.5 transition-colors"
                >
                  + Add Child
                </button>
              </div>
            </form>

            {/* Payment Schedule Selector Toggle */}
            <div className="pt-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Payment Installment Schedule
              </label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentSchedule('upfront')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                    paymentSchedule === 'upfront'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Upfront (1x)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSchedule('2-part')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                    paymentSchedule === '2-part'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  2-Part (50/50)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSchedule('monthly')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all ${
                    paymentSchedule === 'monthly'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Monthly (3x)
                </button>
              </div>
            </div>

            {/* Transparent Calculation Summary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Gross Tuition ({registeredChildren.length} children):</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">${subtotal}</span>
              </div>

              {siblingDiscountAmount > 0 ? (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>10% Sibling Discount ({discountedChildName}):</span>
                  <span className="font-mono">-${siblingDiscountAmount}.00</span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Link 2+ children to unlock automatic 10% Sibling Discount.
                </div>
              )}

              <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm border-t border-slate-200 dark:border-slate-800 pt-2">
                <span>Net Family Invoice Total:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">${netTotal}.00</span>
              </div>
            </div>

            <button
              onClick={handleIssueFamilyInvoice}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
            >
              Issue Consolidated Invoice to Family
            </button>
          </div>
        </div>

        {/* Live Consolidated Invoice Preview & Active Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Preview Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Consolidated Family Invoice Statement Breakdown
              </h3>
              <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-bold">
                Schedule Mode: {paymentSchedule.toUpperCase()}
              </span>
            </div>

            {/* Itemized Line Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Itemized Registrations
              </h4>
              <div className="space-y-2">
                {registeredChildren.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white">{item.childName}</span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-2">[{item.sport}]</span>
                    </div>
                    <div className="font-mono font-bold text-slate-900 dark:text-white">${item.monthlyFee}.00</div>
                  </div>
                ))}
              </div>

              {siblingDiscountAmount > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-bold">
                  <span>10% Sibling Discount Applied to {discountedChildName}</span>
                  <span className="font-mono">-${siblingDiscountAmount}.00</span>
                </div>
              )}
            </div>

            {/* Installment Breakdown Grid */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Selected Payment Installment Schedule ({paymentSchedule})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentInstallments.map((inst, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white text-[11px]">{inst.label}</div>
                    <div className="font-mono font-black text-amber-600 dark:text-amber-400 text-sm">${inst.amount}.00</div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                      <span>Due: {inst.dueDate}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{inst.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Master Family Invoice History Ledger */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span>Master Family Invoice Ledger</span>
              <span className="text-xs font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                10% Sibling Rule Active
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Invoice ID</th>
                    <th className="p-3">Family Parent</th>
                    <th className="p-3">Children</th>
                    <th className="p-3">Sibling Disc.</th>
                    <th className="p-3">Net Total</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {familyInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                      <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">{inv.id}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">
                        {inv.parentName}
                        <div className="text-[10px] text-slate-500 font-mono">{inv.parentEmail}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{inv.children.length} Children</div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                          {inv.children.map(c => c.childName).join(', ')}
                        </div>
                      </td>
                      <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {inv.siblingDiscountAmount > 0 ? `-$${inv.siblingDiscountAmount}` : '$0'}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-300">${inv.netTotal}</td>
                      <td className="p-3 font-mono text-[11px] capitalize">{inv.paymentSchedule}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
