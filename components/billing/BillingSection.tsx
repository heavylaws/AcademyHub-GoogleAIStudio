'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  Receipt, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Users, 
  Percent, 
  Calendar, 
  Printer, 
  Send, 
  Database,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { collection, onSnapshot, addDoc, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BillingInvoice, RegisteredChild } from '@/types/academy';

const SPORT_PRICES: Record<string, number> = {
  Basketball: 350,
  Soccer: 300,
  Tennis: 400,
  Swimming: 280,
  Volleyball: 260,
  'Track & Field': 250
};

export const BillingSection: React.FC = () => {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  
  // New Family Registration Form State
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [parentName, setParentName] = useState('Sarah & Thomas Vance');
  const [parentEmail, setParentEmail] = useState('vance.family@example.com');
  const [parentPhone, setParentPhone] = useState('(555) 234-5678');
  const [paymentSchedule, setPaymentSchedule] = useState<'upfront' | 'installment' | 'monthly'>('installment');

  // Multi-child registration list
  const [childrenList, setChildrenList] = useState<RegisteredChild[]>([
    { id: '1', name: 'Marcus Vance', age: 15, sport: 'Basketball', baseFee: 350, discountedFee: 350 },
    { id: '2', name: 'Leo Vance', age: 12, sport: 'Soccer', baseFee: 300, discountedFee: 270 }
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<BillingInvoice | null>(null);
  const [invoiceSaved, setInvoiceSaved] = useState(false);

  // Subscribe to Firestore 'billing' collection
  useEffect(() => {
    try {
      const q = query(collection(db, 'billing'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const items: BillingInvoice[] = [];
        snap.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as BillingInvoice);
        });
        setInvoices(items);
        if (items.length > 0 && !selectedInvoice) {
          setSelectedInvoice(items[0]);
        }
      });
      return () => unsub();
    } catch (e) {
      console.error('Firestore billing sub error:', e);
    }
  }, []);

  // Calculate 10% Sibling Discount Engine
  // Rule: When children.length > 1, sort children by baseFee ascending/descending.
  // Highest priced child keeps 100% fee. All secondary/lower-priced children get 10% Sibling Discount!
  const calculateSiblingDiscount = (kids: RegisteredChild[]) => {
    if (kids.length <= 1) {
      const raw = kids.reduce((acc, k) => acc + k.baseFee, 0);
      return {
        updatedKids: kids.map(k => ({ ...k, discountedFee: k.baseFee })),
        rawTotal: raw,
        siblingDiscount: 0,
        finalTotal: raw
      };
    }

    // Sort descending by baseFee
    const sorted = [...kids].sort((a, b) => b.baseFee - a.baseFee);
    let totalDisc = 0;

    const updatedKids = sorted.map((child, index) => {
      if (index === 0) {
        // Primary highest priced sport
        return { ...child, discountedFee: child.baseFee };
      } else {
        // Sibling discount 10% applied
        const discAmount = child.baseFee * 0.10;
        totalDisc += discAmount;
        return { ...child, discountedFee: child.baseFee - discAmount };
      }
    });

    const rawTotal = kids.reduce((acc, k) => acc + k.baseFee, 0);
    const finalTotal = rawTotal - totalDisc;

    return {
      updatedKids,
      rawTotal,
      siblingDiscount: totalDisc,
      finalTotal
    };
  };

  const currentCalc = calculateSiblingDiscount(childrenList);

  const handleAddChildField = () => {
    const newKid: RegisteredChild = {
      id: String(Date.now()),
      name: 'Maya Vance',
      age: 10,
      sport: 'Swimming',
      baseFee: SPORT_PRICES['Swimming'],
      discountedFee: SPORT_PRICES['Swimming']
    };
    setChildrenList([...childrenList, newKid]);
  };

  const handleRemoveChildField = (id: string) => {
    if (childrenList.length > 1) {
      setChildrenList(childrenList.filter(c => c.id !== id));
    }
  };

  const handleChildSportChange = (id: string, sport: string) => {
    const fee = SPORT_PRICES[sport] || 300;
    setChildrenList(childrenList.map(c => c.id === id ? { ...c, sport, baseFee: fee } : c));
  };

  const handleChildNameChange = (id: string, name: string) => {
    setChildrenList(childrenList.map(c => c.id === id ? { ...c, name } : c));
  };

  const handleCreateInvoice = async () => {
    try {
      const calc = calculateSiblingDiscount(childrenList);
      const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newInv: BillingInvoice = {
        invoiceNumber,
        parentName,
        parentEmail,
        parentPhone,
        children: calc.updatedKids,
        rawTotal: calc.rawTotal,
        siblingDiscount: calc.siblingDiscount,
        finalTotal: calc.finalTotal,
        paymentSchedule,
        status: 'Pending',
        createdAt: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      await addDoc(collection(db, 'billing'), newInv);
      setInvoiceSaved(true);
      setTimeout(() => {
        setInvoiceSaved(false);
        setIsCreatingInvoice(false);
      }, 2000);
    } catch (e) {
      console.error('Error creating invoice:', e);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, status: 'Paid' | 'Pending' | 'Overdue') => {
    try {
      await updateDoc(doc(db, 'billing', invoiceId), { status });
    } catch (e) {
      console.error('Error updating status:', e);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <CreditCard className="w-4 h-4" />
            <span>Financial Ledger & Family Billing</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Consolidated Billing & Sibling Discount Engine
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Automated family invoicing applying 10% Sibling Discounts for multi-child registrations and flexible installment plans.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingInvoice(true)}
          className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Generate Family Invoice
        </button>
      </div>

      {/* Main Grid: Family Registration Form or Selected Invoice Preview + Ledger Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Consolidated Invoice Builder */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Automated Family Invoicing Builder
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                10% Sibling Discount Engine
              </span>
            </div>

            {/* Parent Details */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Parent Email</label>
                  <input
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">Parent Phone</label>
                  <input
                    type="text"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-300 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Registered Dependents Section */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Registered Children ({childrenList.length})
                </span>
                <button
                  onClick={handleAddChildField}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-500/10 px-2 py-1 rounded border border-cyan-500/20 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Child
                </button>
              </div>

              <div className="space-y-2">
                {childrenList.map((child, idx) => (
                  <div
                    key={child.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">Child #{idx + 1}</span>
                      {childrenList.length > 1 && (
                        <button
                          onClick={() => handleRemoveChildField(child.id)}
                          className="text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={child.name}
                        onChange={(e) => handleChildNameChange(child.id, e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                        placeholder="Child Name"
                      />

                      <select
                        value={child.sport}
                        onChange={(e) => handleChildSportChange(child.id, e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white text-xs"
                      >
                        {Object.keys(SPORT_PRICES).map((s) => (
                          <option key={s} value={s}>{s} (${SPORT_PRICES[s]})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                      <span>Base Registration: ${child.baseFee}</span>
                      {childrenList.length > 1 && idx > 0 ? (
                        <span className="text-emerald-400 font-bold">10% Sibling Discount: ${child.discountedFee}</span>
                      ) : (
                        <span className="text-slate-300">Primary Sport: ${child.baseFee}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Payment Schedule Toggles */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Payment Schedule Option
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['upfront', 'installment', 'monthly'] as const).map((sched) => (
                  <button
                    key={sched}
                    onClick={() => setPaymentSchedule(sched)}
                    className={`py-2 px-2 rounded-lg font-bold capitalize transition-all border ${
                      paymentSchedule === sched
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {sched === 'upfront' ? 'Upfront (100%)' : sched === 'installment' ? '2-Part (50/50)' : 'Monthly (12x)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Financial Calculation Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Raw Total Fee:</span>
                <span className="text-white">${currentCalc.rawTotal}</span>
              </div>

              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Sibling Discount (10% lower-priced):</span>
                <span>-${currentCalc.siblingDiscount}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                <span className="text-white">Consolidated Total:</span>
                <span className="text-emerald-400 text-lg">${currentCalc.finalTotal}</span>
              </div>

              {paymentSchedule === 'installment' && (
                <div className="text-[10px] text-slate-400 pt-1">
                  2 Installments: <span className="text-cyan-400 font-bold">${(currentCalc.finalTotal / 2).toFixed(2)}</span> / installment
                </div>
              )}
            </div>

            <button
              onClick={handleCreateInvoice}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" />
              Save & Dispatch Family Invoice
            </button>
          </div>
        </div>

        {/* Right Column: Financial Ledger Table & Invoice Preview */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Financial Ledger Table */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Firestore Collection: &quot;billing&quot; Ledger
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consolidated parent invoices with automatic sibling discount records.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                {invoices.length} Invoices
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Invoice # & Parent</th>
                    <th className="py-3 px-4">Children Count</th>
                    <th className="py-3 px-4">Raw / Discount</th>
                    <th className="py-3 px-4">Final Total</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {invoices.map((inv, idx) => (
                    <tr 
                      key={inv.id || idx} 
                      onClick={() => setSelectedInvoice(inv)}
                      className="hover:bg-slate-950/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-bold text-white">
                        {inv.invoiceNumber}
                        <div className="text-[10px] text-slate-400 font-normal">{inv.parentName}</div>
                      </td>
                      <td className="py-3.5 px-4 text-cyan-400 font-bold">
                        {inv.children.length} Child(ren)
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-slate-400 line-through">${inv.rawTotal}</span>
                        <div className="text-emerald-400 text-[10px] font-bold">-${inv.siblingDiscount} Disc</div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-400 text-sm">
                        ${inv.finalTotal}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize">
                        {inv.paymentSchedule}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={inv.status}
                          onChange={(e) => inv.id && handleUpdateStatus(inv.id, e.target.value as any)}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-[10px] font-bold px-2 py-1 rounded-full border bg-slate-950 ${
                            inv.status === 'Paid'
                              ? 'text-emerald-400 border-emerald-500/30'
                              : inv.status === 'Pending'
                              ? 'text-amber-400 border-amber-500/30'
                              : 'text-rose-400 border-rose-500/30'
                          }`}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Invoice Full Voucher / Stub Preview */}
          {selectedInvoice && (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs font-mono text-emerald-400 font-bold uppercase">
                    OFFICIAL ACADEMYHUB INVOICE STUB
                  </div>
                  <h3 className="text-lg font-bold text-white">{selectedInvoice.invoiceNumber}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.print()} 
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold flex items-center gap-1"
                  >
                    <Printer className="w-4 h-4" /> Print PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-slate-500 uppercase text-[10px]">Billed Parent</div>
                  <div className="font-bold text-white text-sm">{selectedInvoice.parentName}</div>
                  <div className="text-slate-400">{selectedInvoice.parentEmail}</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-slate-500 uppercase text-[10px]">Payment Schedule & Status</div>
                  <div className="font-bold text-emerald-400 text-sm capitalize">{selectedInvoice.paymentSchedule}</div>
                  <div className="text-slate-400">Due Date: {selectedInvoice.dueDate}</div>
                </div>
              </div>

              {/* Itemized Line Items */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Itemized Sport Registrations
                </div>
                <div className="divide-y divide-slate-800/60 font-mono text-xs">
                  {selectedInvoice.children.map((c, i) => (
                    <div key={i} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white">{c.name}</span>
                        <span className="text-slate-400 text-[11px] ml-2">({c.sport})</span>
                      </div>
                      <div className="text-right">
                        {c.discountedFee < c.baseFee ? (
                          <div className="text-emerald-400 font-bold">
                            <span className="line-through text-slate-500 mr-2">${c.baseFee}</span>
                            ${c.discountedFee} (10% Disc)
                          </div>
                        ) : (
                          <div className="text-white font-bold">${c.baseFee}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invoice Summary Total */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center font-mono">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Applied Sibling Savings</div>
                  <div className="text-emerald-400 font-bold text-sm">-${selectedInvoice.siblingDiscount} Total Discount</div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Final Balance Due</div>
                  <div className="text-2xl font-black text-emerald-400">${selectedInvoice.finalTotal}</div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
