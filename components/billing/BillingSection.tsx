'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  Users,
  CheckCircle2,
  Award,
  Calendar,
  Sparkles,
  Percent,
  FileText,
  ShieldAlert,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import {
  ChildRegistration,
  FamilyInvoice,
  PaymentSchedule,
  PaymentStatus,
  calculateSiblingDiscount,
  getInstallments,
} from '@/types/billing';
import { createInvoice, updateInvoice } from '@/services/billingService';
import { useInvoicesSubscription } from '@/hooks/useInvoicesSubscription';

export default function BillingSection() {
  const { user, role } = useAuth();
  const isAdmin = role === 'admin';
  const parentEmail = role === 'parent' ? (user?.email || undefined) : undefined;

  const {
    invoices: familyInvoices,
    loading: invoicesLoading,
    error: invoicesError,
    isPermissionDenied,
    isLive,
    totalCount,
    refresh,
  } = useInvoicesSubscription({ parentEmail, role });

  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule>('monthly');
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<FamilyInvoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Pre-configured family registrations
  const [registeredChildren, setRegisteredChildren] = useState<ChildRegistration[]>([
    { childName: 'Marcus Vance', sport: 'Football (Soccer)', monthlyFee: 300 },
    { childName: 'Sarah Vance', sport: 'Badminton', monthlyFee: 250 },
  ]);

  const [newChildName, setNewChildName] = useState('');
  const [newChildSport, setNewChildSport] = useState('Track & Field');
  const [newChildFee, setNewChildFee] = useState(220);

  const { subtotal, discountedChildName, siblingDiscountAmount, netTotal } = calculateSiblingDiscount(registeredChildren);
  const currentInstallments = getInstallments(netTotal, paymentSchedule);

  const handleAddChildToFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName) return;

    setRegisteredChildren([
      ...registeredChildren,
      { childName: newChildName, sport: newChildSport, monthlyFee: newChildFee },
    ]);
    setNewChildName('');
  };

  const handleIssueFamilyInvoice = async () => {
    const calc = calculateSiblingDiscount(registeredChildren);
    const inst = getInstallments(calc.netTotal, paymentSchedule);

    try {
      setIsSubmitting(true);
      const targetParentName = user?.displayName || 'Robert Vance';
      const targetParentEmail = user?.email || 'robert.vance@gmail.com';

      if (!user) {
        throw new Error('Authentication required: Please sign in to issue invoices.');
      }

      await createInvoice({
        parentName: targetParentName,
        parentEmail: targetParentEmail,
        children: [...registeredChildren],
        subtotal: calc.subtotal,
        discountedChildName: calc.discountedChildName,
        siblingDiscountAmount: calc.siblingDiscountAmount,
        netTotal: calc.netTotal,
        paymentSchedule: paymentSchedule,
        installmentBreakdown: inst,
        payment_status: 'pending',
        issuedDate: new Date().toISOString().split('T')[0],
      });

      setActionSuccessMessage('Consolidated invoice persisted to Postgres.');
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err) {
      console.error('Failed to issue invoice:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePaymentStatus = async (invoiceId: string, newStatus: PaymentStatus) => {
    try {
      if (!user) {
        throw new Error('Authentication required: Please sign in to update invoices.');
      }
      await updateInvoice(invoiceId, { payment_status: newStatus });
      setActionSuccessMessage(`Invoice ${invoiceId} updated to ${newStatus.toUpperCase()}`);
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      setActionSuccessMessage(err instanceof Error ? err.message : 'Failed to update invoice.');
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-200">
      {/* Header Banner with polling status indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-3 w-3">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isLive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Consolidated Family Billing Engine & Sibling Discount Ledger
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> API Polling Active
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Single consolidated invoices for multi-child families with automatic 10% Sibling Discount calculation and custom payment installment schedules.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Invoices Count:</span>
            <span className="font-bold text-cyan-600 dark:text-cyan-400">{totalCount}</span>
          </div>
          <button
            onClick={refresh}
            className="p-2 min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
            title="Force Refresh Invoices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${invoicesLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {/* Permission Denied or RBAC Notice Banner */}
      {isPermissionDenied && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Role-Based Access Control / Billing Security Guard Active</span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-400">
            Invoice access is enforced by the authenticated Postgres API. Parents see only invoices owned by their account ({user?.email || 'unauthenticated'}).
          </p>
        </div>
      )}

      {invoicesError && !isPermissionDenied && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
          Unable to load invoices: {invoicesError}
        </div>
      )}

      {!invoicesLoading && !invoicesError && familyInvoices.length === 0 && (
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-sm">
          No invoices yet.
        </div>
      )}

      {/* Temporary Success Feedback Toast */}
      {actionSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Main Billing Calculator & Simulator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Family Calculator Form */}
        <div className="lg:col-span-1 p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <DollarSign className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Family Registration & Discount Engine
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Target Family Account:</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {user?.displayName || 'Robert Vance'} ({user?.email || 'robert.vance@gmail.com'})
              </span>
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
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500 min-h-[44px]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={newChildSport}
                  onChange={(e) => setNewChildSport(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-slate-200 min-h-[44px]"
                >
                  <option value="Track & Field">Track ($220)</option>
                  <option value="Cricket">Cricket ($280)</option>
                  <option value="Basketball">Basketball ($300)</option>
                  <option value="Swimming">Swimming ($260)</option>
                </select>
                <button
                  type="submit"
                  className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-lg text-xs py-1.5 transition-colors min-h-[44px]"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentSchedule('upfront')}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all min-h-[44px] ${
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
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all min-h-[44px] ${
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
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all min-h-[44px] ${
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
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm min-h-[44px] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Issue Consolidated Invoice to Family</span>
              )}
            </button>
          </div>
        </div>

        {/* Live Consolidated Invoice Preview & Active Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Preview Card */}
          <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
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
          <div className="p-4 md:p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span>Master Family Invoice Ledger</span>
              <span className="text-xs font-mono text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                10% Sibling Rule Active
              </span>
            </h3>

            {/* Mobile Card List View (<1024px) */}
            <div className="block lg:hidden flex flex-col gap-3">
              {familyInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs"
                >
                  {/* Header: Invoice ID, Parent & Children Count */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400">
                        {inv.id}
                      </div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white mt-0.5">
                        {inv.parentName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {inv.parentEmail}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {inv.children.length} {inv.children.length === 1 ? 'Child' : 'Children'}
                      </span>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">
                        {inv.children.map((c) => c.childName).join(', ')}
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown: Subtotal, Discount & Net Total */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Gross Subtotal:</span>
                      <span className="font-mono font-medium">${inv.subtotal}</span>
                    </div>
                    {inv.siblingDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Sibling Discount:</span>
                        <span className="font-mono">-${inv.siblingDiscountAmount}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Net Total ({inv.paymentSchedule}):
                      </span>
                      <span className="font-mono font-black text-amber-600 dark:text-amber-300 text-sm">
                        ${inv.netTotal}
                      </span>
                    </div>
                  </div>

                  {/* Status & Actions Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <div>
                      {isAdmin ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400">Status:</span>
                          <select
                            value={inv.payment_status}
                            onChange={(e) => handleUpdatePaymentStatus(inv.id, e.target.value as PaymentStatus)}
                            className={`text-[10px] font-mono font-bold px-2 py-1 rounded border min-h-[44px] bg-white dark:bg-slate-900 focus:outline-none ${
                              inv.payment_status === 'paid'
                                ? 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                : inv.payment_status === 'overdue'
                                ? 'text-rose-700 dark:text-rose-400 border-rose-500/30'
                                : 'text-amber-700 dark:text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <option value="pending">PENDING</option>
                            <option value="paid">PAID</option>
                            <option value="overdue">OVERDUE</option>
                          </select>
                        </div>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-bold uppercase border ${
                            inv.payment_status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : inv.payment_status === 'overdue'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {inv.payment_status}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedInvoiceModal(inv)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1.5 min-h-[44px]"
                    >
                      <FileText className="w-4 h-4 text-cyan-500" />
                      <span>View Invoice</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>=1024px) */}
            <div className="overflow-x-auto w-full hidden lg:block">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-mono uppercase text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">Invoice ID</th>
                    <th className="p-3">Family Parent</th>
                    <th className="p-3">Children</th>
                    <th className="p-3">Sibling Disc.</th>
                    <th className="p-3">Net Total</th>
                    <th className="p-3">Schedule</th>
                    <th className="p-3">Payment Status</th>
                    <th className="p-3">Action</th>
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
                        {isAdmin ? (
                          <select
                            value={inv.payment_status}
                            onChange={(e) => handleUpdatePaymentStatus(inv.id, e.target.value as PaymentStatus)}
                            className={`text-[10px] font-mono font-bold px-2 py-1 rounded border min-h-[36px] bg-white dark:bg-slate-900 focus:outline-none ${
                              inv.payment_status === 'paid'
                                ? 'text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                                : inv.payment_status === 'overdue'
                                ? 'text-rose-700 dark:text-rose-400 border-rose-500/30'
                                : 'text-amber-700 dark:text-amber-400 border-amber-500/30'
                            }`}
                          >
                            <option value="pending">PENDING</option>
                            <option value="paid">PAID</option>
                            <option value="overdue">OVERDUE</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                            inv.payment_status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                              : inv.payment_status === 'overdue'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                          }`}>
                            {inv.payment_status}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => setSelectedInvoiceModal(inv)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-all border border-slate-300 dark:border-slate-700 flex items-center gap-1 min-h-[44px]"
                        >
                          <FileText className="w-3 h-3 text-cyan-500" />
                          <span>View Invoice</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Official Printable Family Invoice Modal with Stripe Checkout */}
      {selectedInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl p-4 md:p-8 w-full max-w-screen-md shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="text-xl font-black tracking-tight text-slate-900">ACADEMYHUB ATHLETICS</div>
                <div className="text-xs text-slate-500">Official Family Billing Receipt & Invoice Statement</div>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-cyan-600 text-sm">{selectedInvoiceModal.id}</div>
                <div className="text-slate-500">Date: {selectedInvoiceModal.issuedDate}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="font-bold text-slate-500 uppercase font-mono text-[10px]">Billed Parent / Guardian</div>
                <div className="font-bold text-sm text-slate-900 mt-0.5">{selectedInvoiceModal.parentName}</div>
                <div className="text-slate-600 font-mono">{selectedInvoiceModal.parentEmail}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-500 uppercase font-mono text-[10px]">Payment Schedule</div>
                <div className="font-bold text-slate-900 mt-0.5 capitalize">{selectedInvoiceModal.paymentSchedule} Installments</div>
                <div className={`font-bold font-mono uppercase text-[11px] ${
                  selectedInvoiceModal.payment_status === 'paid'
                    ? 'text-emerald-600'
                    : selectedInvoiceModal.payment_status === 'overdue'
                    ? 'text-rose-600'
                    : 'text-amber-600'
                }`}>
                  Status: {selectedInvoiceModal.payment_status}
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="font-mono text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200 pb-1 flex justify-between">
                <span>Description / Enrolled Student</span>
                <span>Amount</span>
              </div>
              {selectedInvoiceModal.children.map((child, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1">
                  <span>{child.childName} — {child.sport} Monthly Tuition</span>
                  <span className="font-mono font-bold">${child.monthlyFee}.00</span>
                </div>
              ))}
              {selectedInvoiceModal.siblingDiscountAmount > 0 && (
                <div className="flex justify-between text-xs py-1 text-emerald-600 font-bold border-t border-slate-100">
                  <span>10% Sibling Discount ({selectedInvoiceModal.discountedChildName})</span>
                  <span className="font-mono">-${selectedInvoiceModal.siblingDiscountAmount}.00</span>
                </div>
              )}
            </div>

            {/* Total Summary */}
            <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-200">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Gross Subtotal:</span>
                <span className="font-mono">${selectedInvoiceModal.subtotal}.00</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2">
                <span>Net Total Payable:</span>
                <span className="font-mono text-cyan-600">${selectedInvoiceModal.netTotal}.00</span>
              </div>
            </div>

                        {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedInvoiceModal(null);
                  }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 min-h-[44px]"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow min-h-[44px]"
              >
                <span>🖨️ Print / Save Official PDF</span>
              </button>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono">
                Payment recording is enabled through the invoice lifecycle and billing workflow.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
