"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, 
  Layers, 
  IndianRupee, 
  AlertCircle, 
  ArrowUpRight, 
  Clock,
  Share2,
  CalendarCheck,
  PlusCircle,
  Search,
  Receipt,
  Download,
  Calendar as CalendarIcon,
  RefreshCw,
  Wallet,
  CheckCircle2,
  ListFilter,
  MessageCircle
} from "lucide-react";
import { 
  Stats, 
  Transaction, 
  Student, 
  fetchStudents, 
  fetchTransactions, 
  exportFeesCsv 
} from "@/lib/api";
import { generateWhatsAppReceiptLink } from "@/lib/indiaFeatures";
import CollectFeeModal from "@/components/CollectFeeModal";
import DefaultersQueueModal from "@/components/DefaultersQueueModal";

interface DashboardViewProps {
  stats: Stats;
  recentTransactions: Transaction[];
  onNavigateToStudents: () => void;
  onRefresh?: () => void;
}

export default function DashboardView({
  stats,
  recentTransactions,
  onNavigateToStudents,
  onRefresh,
}: DashboardViewProps) {
  const router = useRouter();

  // Modals state
  const [showCollectFeeModal, setShowCollectFeeModal] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");
  const [showDefaultersQueue, setShowDefaultersQueue] = useState(false);
  const [queueStudents, setQueueStudents] = useState<Student[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Date filtering for Fee Transaction Ledger
  const getTodayDateStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayDateStr();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [ledgerTransactions, setLedgerTransactions] = useState<Transaction[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Load ledger transactions based on selected date
  const loadLedger = useCallback(async (dateFilter: string) => {
    setLoadingLedger(true);
    try {
      const data = await fetchTransactions(
        50,
        undefined,
        dateFilter ? dateFilter : undefined
      );
      setLedgerTransactions(data);
    } catch (err) {
      console.error("Failed to load fee ledger:", err);
      // Fallback to recentTransactions if fetch fails
      if (dateFilter) {
        setLedgerTransactions(recentTransactions.filter(t => t.payment_date === dateFilter));
      } else {
        setLedgerTransactions(recentTransactions);
      }
    } finally {
      setLoadingLedger(false);
    }
  }, [recentTransactions]);

  // Initial load and whenever selectedDate changes
  useEffect(() => {
    loadLedger(selectedDate);
  }, [selectedDate, loadLedger]);

  const handleOpenQueue = async () => {
    setLoadingQueue(true);
    try {
      const data = await fetchStudents();
      setQueueStudents(data);
      setShowDefaultersQueue(true);
    } catch (err: any) {
      alert("Error loading students for defaulter queue: " + err.message);
    } finally {
      setLoadingQueue(false);
    }
  };

  const att = stats.today_attendance_summary || {};
  const presentToday = att["PRESENT"] || 0;
  const absentToday = att["ABSENT"] || 0;

  const handleOpenSearchWithQuery = (e: React.FormEvent) => {
    e.preventDefault();
    setShowCollectFeeModal(true);
  };

  const formatTxTime = (createdAtStr?: string) => {
    if (!createdAtStr) return "--:--";
    try {
      const d = new Date(createdAtStr);
      return isNaN(d.getTime())
        ? "--:--"
        : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    } catch {
      return "--:--";
    }
  };

  const formatTxDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime())
        ? dateStr
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* ----------------- COMPACT PROFESSIONAL COLLECT FEE ACTION BAR ----------------- */}
      <div className="bg-slate-900 dark:bg-slate-900 text-slate-100 rounded-xl p-3.5 sm:p-4 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left Title & Info */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-800 text-indigo-400 border border-slate-700/60 shrink-0">
              <Wallet size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Collect Tuition Fees
                </h2>
                <span className="hidden sm:inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Instant UPI & WhatsApp Receipts
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Search enrolled student by name or mobile number to record payment and auto-send receipts.
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {/* Quick search input */}
            <form onSubmit={handleOpenSearchWithQuery} className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Student name or phone..."
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                onFocus={() => setShowCollectFeeModal(true)}
                className="w-full sm:w-56 pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-800/90 text-white placeholder-slate-400 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-normal shadow-xs"
              />
            </form>

            {/* Defaulter Queue Button (Secondary Slate) */}
            <button
              type="button"
              onClick={handleOpenQueue}
              disabled={loadingQueue}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <ListFilter size={14} className="text-slate-400" />
              {loadingQueue ? "Loading..." : "Defaulter Queue"}
            </button>

            {/* Collect Fee Button (Primary Indigo) */}
            <button
              type="button"
              onClick={() => {
                setQuickSearchQuery("");
                setShowCollectFeeModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle size={15} />
              Collect Fee
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- 4 KEY METRIC CARDS (INTERACTIVE & REDIRECTING) ----------------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Students Card -> Redirects to /students */}
        <div 
          onClick={() => router.push("/students")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && router.push("/students")}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Students
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/60 dark:group-hover:text-indigo-400 transition-colors">
              <Users size={17} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.total_active_students}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-400">Active Enrolled</span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Open <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* 2. Batches Card -> Redirects to /batches */}
        <div 
          onClick={() => router.push("/batches")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && router.push("/batches")}
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer group select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Batches
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-950/60 dark:group-hover:text-indigo-400 transition-colors">
              <Layers size={17} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {stats.total_batches}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-400">Active Classes</span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              Manage <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        {/* 3. This Month Revenue */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              This Month
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              <IndianRupee size={17} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            ₹{stats.total_collected_this_month.toLocaleString("en-IN")}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" /> Fees Received
          </span>
        </div>

        {/* 4. Pending Dues */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Dues
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-rose-600 dark:text-rose-400">
              <AlertCircle size={17} />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            ₹{stats.total_pending_dues.toLocaleString("en-IN")}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button 
              type="button"
              onClick={handleOpenQueue}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Defaulter Queue →
            </button>
          </div>
        </div>
      </div>

      {/* Today's Attendance Glance Banner */}
      {(presentToday > 0 || absentToday > 0) && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-indigo-600 dark:text-indigo-400 shadow-xs border border-slate-200 dark:border-slate-700">
              <CalendarCheck size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Today&apos;s Class Attendance</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {presentToday} Present • <span className="text-rose-600 dark:text-rose-400 font-semibold">{absentToday} Absent</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/attendance")}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Open Register <ArrowUpRight size={13} />
          </button>
        </div>
      )}

      {/* ----------------- FEE TRANSACTION LEDGER SECTION ----------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {/* Ledger Header with Date Controls & Export */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                Fee Transaction Ledger
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {selectedDate ? (
                  <span>Showing transactions for: <strong className="text-slate-700 dark:text-slate-300">{selectedDate === todayStr ? `Today (${formatTxDate(selectedDate)})` : formatTxDate(selectedDate)}</strong></span>
                ) : (
                  <span>Showing all recent transactions</span>
                )}
              </p>
            </div>
          </div>

          {/* Date Picker & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Calendar Date Input */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
              <CalendarIcon size={14} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 outline-none text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                title="Select date to filter transactions"
              />
            </div>

            {/* Today Button (Secondary Slate) */}
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors cursor-pointer ${
                selectedDate === todayStr
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              Today
            </button>

            {/* All Recent Button (Secondary Slate) */}
            <button
              type="button"
              onClick={() => setSelectedDate("")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors cursor-pointer ${
                selectedDate === ""
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              All Recent
            </button>

            {/* Export CSV Button (Secondary Slate) */}
            <button
              type="button"
              onClick={exportFeesCsv}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer"
              title="Download Fee Ledger CSV"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Student & Batch</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Month / Ref</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingLedger ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-400">
                    <RefreshCw className="animate-spin inline-block mr-2" size={14} />
                    Loading fee transactions...
                  </td>
                </tr>
              ) : ledgerTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-xs text-slate-400">
                    <p className="font-medium text-slate-600 dark:text-slate-400">
                      {selectedDate 
                        ? `No transactions recorded for ${selectedDate === todayStr ? "today" : formatTxDate(selectedDate)}`
                        : "No transactions recorded yet"}
                    </p>
                    {selectedDate && (
                      <button
                        type="button"
                        onClick={() => setSelectedDate("")}
                        className="mt-2 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-xs cursor-pointer"
                      >
                        Show All Recent Transactions →
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                ledgerTransactions.map((tx) => {
                  const receiptWaLink = tx.primary_contact ? generateWhatsAppReceiptLink({
                    phone: tx.primary_contact,
                    parentName: tx.parent_name || "Parent",
                    studentName: tx.student_name,
                    amountPaid: tx.amount_paid,
                    paymentMode: tx.payment_mode,
                    referenceId: tx.reference_id,
                    monthFor: tx.month_for,
                    receiptId: tx.id.slice(0, 8).toUpperCase(),
                  }) : null;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Date Column */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {formatTxDate(tx.payment_date)}
                      </td>

                      {/* Time Column */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {formatTxTime(tx.created_at)}
                      </td>

                      {/* Student & Batch Column */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                          {tx.student_name}
                        </div>
                        <div className="mt-0.5">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {tx.batch_name || "General"}
                          </span>
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {tx.payment_mode}
                        </span>
                      </td>

                      {/* Month / Ref */}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {tx.month_for || "Tuition Fee"}
                        </span>
                        {tx.reference_id ? ` • Ref: ${tx.reference_id}` : ""}
                      </td>

                      {/* Amount Paid */}
                      <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                        +₹{tx.amount_paid.toLocaleString("en-IN")}
                      </td>

                      {/* WhatsApp Receipt Action (Secondary Slate Button with WhatsApp Icon) */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {receiptWaLink ? (
                          <a
                            href={receiptWaLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                            title="Send WhatsApp Receipt"
                          >
                            <MessageCircle size={12} className="text-emerald-600" />
                            Receipt
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- COLLECT FEE MODAL ----------------- */}
      <CollectFeeModal
        isOpen={showCollectFeeModal}
        onClose={() => {
          setShowCollectFeeModal(false);
          setQuickSearchQuery("");
        }}
        initialSearchQuery={quickSearchQuery}
        onPaymentSuccess={() => {
          loadLedger(selectedDate);
          if (onRefresh) onRefresh();
        }}
      />

      {/* ----------------- DEFAULTERS QUEUE MODAL ----------------- */}
      <DefaultersQueueModal
        isOpen={showDefaultersQueue}
        onClose={() => setShowDefaultersQueue(false)}
        students={queueStudents}
      />
    </div>
  );
}
