"use client";

import React, { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  Search, 
  X, 
  IndianRupee, 
  CheckCircle2, 
  MessageCircle, 
  Receipt, 
  User, 
  Phone, 
  Layers, 
  Loader2, 
  ArrowRight,
  Sparkles,
  QrCode,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Student, fetchStudents, recordFeePayment } from "@/lib/api";
import { TEACHER_CONFIG, generateUpiUri, generateWhatsAppReceiptLink } from "@/lib/indiaFeatures";

interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
  initialSearchQuery?: string;
  initialStudent?: Student | null;
}

export default function CollectFeeModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  initialSearchQuery = "",
  initialStudent = null,
}: CollectFeeModalProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected student
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(initialStudent);

  // Payment form state
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<"UPI" | "CASH" | "BANK_TRANSFER">("UPI");
  const [referenceId, setReferenceId] = useState("");
  const [monthFor, setMonthFor] = useState<string>("");
  const [remarks, setRemarks] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Success Receipt Modal State
  const [receiptData, setReceiptData] = useState<{
    phone: string;
    parentName: string;
    studentName: string;
    amountPaid: number;
    paymentMode: string;
    referenceId?: string | null;
    monthFor?: string | null;
    receiptId: string;
  } | null>(null);

  // Default current month string e.g. "Nov 2026"
  const defaultCurrentMonth = `${new Date().toLocaleString("en-US", { month: "short" })} ${new Date().getFullYear()}`;

  // When student changes, calculate unpaid months sorted chronologically (earliest first)
  const unpaidMonths = (selectedStudent?.monthly_breakdown || []).filter(
    (m) => m.status === "DUE" || m.status === "PARTIAL"
  );

  // Select student & auto-draw details prioritizing earliest unpaid month
  const selectStudent = (student: Student) => {
    setSelectedStudent(student);
    const pending = student.pending_due ?? 0;
    const defaultBatch = student.batches && student.batches.length > 0 ? student.batches[0] : null;

    setSelectedBatchId(defaultBatch ? defaultBatch.id : "");

    // Find unpaid months (chronological: earliest first)
    const dueMonths = (student.monthly_breakdown || []).filter(
      (m) => m.status === "DUE" || m.status === "PARTIAL"
    );

    if (dueMonths.length > 0) {
      // Prioritize the EARLIEST unpaid month
      const earliest = dueMonths[0];
      setMonthFor(earliest.month_name);
      setAmountPaid(earliest.due_amount > 0 ? earliest.due_amount : (defaultBatch?.monthly_fee || 1000));
    } else {
      // All clear or advance payment
      setMonthFor(defaultCurrentMonth);
      setAmountPaid(pending > 0 ? pending : (defaultBatch ? defaultBatch.monthly_fee : 1000));
    }

    setRemarks(`Fee received for ${student.student_name}`);
  };

  // Reset or initialize when modal opens or initial student changes
  useEffect(() => {
    if (isOpen) {
      if (initialStudent) {
        selectStudent(initialStudent);
      } else {
        setSelectedStudent(null);
        setSearchQuery(initialSearchQuery);
        loadStudentsList(initialSearchQuery);
      }
    } else {
      setSelectedStudent(null);
      setSearchQuery("");
      setSearchResults([]);
      setReceiptData(null);
    }
  }, [isOpen, initialStudent, initialSearchQuery]);

  // Search API call
  const loadStudentsList = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const data = await fetchStudents(undefined, query.trim() || undefined);
      setSearchResults(data);
    } catch (err) {
      console.error("Error searching students:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (!isOpen || selectedStudent) return;
    const timer = setTimeout(() => {
      loadStudentsList(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, selectedStudent, loadStudentsList]);

  const handleResetStudentSelection = () => {
    setSelectedStudent(null);
    setSearchQuery("");
    loadStudentsList("");
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (amountPaid <= 0) {
      alert("Please enter a valid fee amount greater than 0.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await recordFeePayment({
        student_id: selectedStudent.id,
        batch_id: selectedBatchId || undefined,
        amount_paid: Number(amountPaid),
        payment_mode: paymentMode,
        reference_id: referenceId.trim() || undefined,
        month_for: monthFor.trim() || defaultCurrentMonth,
        remarks: remarks.trim() || `Tuition fee for ${selectedStudent.student_name}`,
      });

      const savedStudent = selectedStudent;
      setSelectedStudent(null);
      setReferenceId("");
      setRemarks("");

      // Prepare instant receipt data
      if (res.receipt) {
        setReceiptData({
          phone: res.receipt.phone || res.receipt.primary_contact || savedStudent.primary_contact,
          parentName: res.receipt.parentName || res.receipt.parent_name || savedStudent.parent_name,
          studentName: res.receipt.studentName || res.receipt.student_name || savedStudent.student_name,
          amountPaid: Number(res.receipt.amountPaid ?? res.receipt.amount_paid ?? amountPaid ?? 0),
          paymentMode: res.receipt.paymentMode || res.receipt.payment_mode || paymentMode,
          referenceId: res.receipt.referenceId ?? res.receipt.reference_id ?? referenceId,
          monthFor: res.receipt.monthFor ?? res.receipt.month_for ?? (monthFor || defaultCurrentMonth),
          receiptId: res.receipt.receiptId || res.receipt.receipt_id || Math.floor(100000 + Math.random() * 900000).toString(),
        });
      } else {
        setReceiptData({
          phone: savedStudent.primary_contact,
          parentName: savedStudent.parent_name,
          studentName: savedStudent.student_name,
          amountPaid: Number(amountPaid),
          paymentMode: paymentMode,
          referenceId: referenceId || null,
          monthFor: monthFor || defaultCurrentMonth,
          receiptId: Math.floor(100000 + Math.random() * 900000).toString(),
        });
      }

      // Notify parent to refresh dashboard ledger and stats
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    } catch (err: any) {
      console.error("Payment recording failed:", err);
      alert("Failed to record fee payment. Please ensure the backend is connected and try again.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-800 relative my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm">
                <IndianRupee size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Collect Tuition Fee
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedStudent ? `Recording for ${selectedStudent.student_name}` : "Search student by name or phone number"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 max-h-[82vh] overflow-y-auto">
            {/* STEP 1: Search and Select Student (if not selected) */}
            {!selectedStudent ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Search Student
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 text-gray-400" size={17} />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type student name (e.g. Aarav) or phone (e.g. 9876543210)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none transition"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Results dropdown/list */}
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                    <span>
                      {searchQuery ? "Search Results" : "All Enrolled Students"}
                    </span>
                    {searching && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Loader2 size={13} className="animate-spin" /> Searching...
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {searchResults.length === 0 && !searching ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No students found matching "{searchQuery}"
                      </div>
                    ) : (
                      searchResults.map((st) => {
                        const pendingDue = st.pending_due ?? 0;
                        const batchNames = st.batches?.map((b) => b.name).join(", ") || "No batch";

                        return (
                          <div
                            key={st.id}
                            onClick={() => selectStudent(st)}
                            className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer transition flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                {st.student_name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                    {st.student_name}
                                  </h4>
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                    {st.grade}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  Parent: {st.parent_name} • 📞 {st.primary_contact}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                  {batchNames}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0 ml-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                                  pendingDue > 0
                                    ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                                    : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                                }`}
                              >
                                {pendingDue > 0 ? `₹${pendingDue.toLocaleString("en-IN")} Due` : "No Dues"}
                              </span>
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                Select <ArrowRight size={12} />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* STEP 2: Auto-Drawn Student Information & Fee Form */
              <form onSubmit={handleSubmitPayment} className="space-y-4">
                {/* Selected Student Card with Auto-Drawn Data */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-50/80 via-emerald-50/50 to-white dark:from-gray-800 dark:to-gray-850 border border-indigo-100 dark:border-gray-700 relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        {selectedStudent.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                            {selectedStudent.student_name}
                          </h3>
                          <span className="text-[11px] px-2 py-0.2 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded font-medium">
                            {selectedStudent.grade}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          Parent: <span className="font-medium text-gray-800 dark:text-gray-200">{selectedStudent.parent_name}</span> • 📞 <span className="font-mono">{selectedStudent.primary_contact}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetStudentSelection}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  {/* Financial Status Chips */}
                  <div className="mt-2.5 pt-2.5 border-t border-indigo-100 dark:border-gray-700 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-gray-500">Total Pending Due:</span>
                      <span
                        className={`font-bold ${
                          (selectedStudent.pending_due ?? 0) > 0
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        ₹{(selectedStudent.pending_due ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    {selectedStudent.batches && selectedStudent.batches.length > 0 && (
                      <span className="text-[11px] text-gray-500 bg-white/80 dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 truncate max-w-[200px]">
                        {selectedStudent.batches[0].name}
                      </span>
                    )}
                  </div>
                </div>

                {/* ----------------- CHRONOLOGICAL MONTH SELECTION (EARLIER MONTHS FIRST) ----------------- */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Payment For Month (Earliest Unpaid First) *
                    </label>
                    {unpaidMonths.length > 1 && (
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        {unpaidMonths.length} months pending
                      </span>
                    )}
                  </div>

                  {/* If student has unpaid months, render chronological chips */}
                  {unpaidMonths.length > 0 ? (
                    <div className="space-y-2 mb-2">
                      <div className="flex flex-wrap gap-1.5">
                        {unpaidMonths.map((m, index) => {
                          const isEarliest = index === 0;
                          const isSelected = monthFor === m.month_name;
                          return (
                            <button
                              key={m.month_name}
                              type="button"
                              onClick={() => {
                                setMonthFor(m.month_name);
                                setAmountPaid(m.due_amount > 0 ? m.due_amount : (selectedStudent.batches?.[0]?.monthly_fee || 1000));
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                  : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-500"
                              }`}
                            >
                              <span>{m.month_name}</span>
                              <span
                                className={`text-[10px] px-1 py-0.2 rounded font-bold ${
                                  isSelected ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                }`}
                              >
                                ₹{m.due_amount.toLocaleString("en-IN")}
                              </span>
                              {isEarliest && (
                                <span className={`text-[9px] uppercase tracking-wider font-extrabold ${isSelected ? "text-amber-200" : "text-amber-600 dark:text-amber-400"}`}>
                                  (Oldest)
                                </span>
                              )}
                            </button>
                          );
                        })}

                        {/* Quick Option to Pay ALL Pending Months Together */}
                        {unpaidMonths.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const rangeStr = `${unpaidMonths[0].month_name} - ${unpaidMonths[unpaidMonths.length - 1].month_name}`;
                              setMonthFor(rangeStr);
                              setAmountPaid(selectedStudent.pending_due ?? 0);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                              monthFor.includes("-")
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                            }`}
                          >
                            All {unpaidMonths.length} Months (₹{(selectedStudent.pending_due ?? 0).toLocaleString("en-IN")})
                          </button>
                        )}
                      </div>

                      {/* Helper hint for earlier month priority */}
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 size={12} />
                        Recommended: Clearing earliest due first ({unpaidMonths[0].month_name})
                      </p>
                    </div>
                  ) : null}

                  {/* Editable text input for custom/advance month */}
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nov 2026 or Dec 2026"
                    value={monthFor}
                    onChange={(e) => setMonthFor(e.target.value)}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Amount and Batch Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Amount Received (₹) *
                    </label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-2.5 text-gray-400" size={16} />
                      <input
                        type="number"
                        required
                        min="1"
                        value={amountPaid || ""}
                        onChange={(e) => setAmountPaid(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Batch (Optional)
                    </label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">General / First Active Batch</option>
                      {selectedStudent.batches?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} (₹{b.monthly_fee}/m)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "UPI", label: "UPI / QR" },
                      { id: "CASH", label: "Cash" },
                      { id: "BANK_TRANSFER", label: "Bank / NEFT" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPaymentMode(mode.id as any)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition ${
                          paymentMode === mode.id
                            ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic UPI QR Code (if UPI mode selected) */}
                {paymentMode === "UPI" && (
                  <div className="bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm shrink-0">
                      <QRCodeSVG
                        value={generateUpiUri({
                          payeeUpi: TEACHER_CONFIG.upiId,
                          payeeName: TEACHER_CONFIG.name,
                          amount: amountPaid || 0,
                          transactionNote: `Tuition ${selectedStudent.student_name.slice(0, 15)} ${monthFor.slice(0, 8)}`,
                        })}
                        size={84}
                        level="M"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
                        <QrCode size={14} className="text-emerald-600" />
                        <span>Instant UPI Scan & Pay</span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Scan with GPay, PhonePe, Paytm or BHIM
                      </p>
                      <p className="text-xs font-mono font-medium text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                        {TEACHER_CONFIG.upiId}
                      </p>
                    </div>
                  </div>
                )}

                {/* Optional Reference ID */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Reference / UTR ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref / Cheque / Bank Transfer ID"
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submittingPayment ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Record Fee & Get WhatsApp Receipt
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- DIGITAL WHATSAPP RECEIPT MODAL ----------------- */}
      {receiptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Receipt size={24} />
            </div>

            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Fee Payment Recorded!</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
              Receipt #{receiptData.receiptId} saved in ledger.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-left text-xs space-y-2 mb-5 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Student:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{receiptData.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Parent:</span>
                <span className="text-gray-800 dark:text-gray-200">{receiptData.parentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Amount:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{(receiptData.amountPaid ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Mode:</span>
                <span className="text-gray-800 dark:text-gray-200">{receiptData.paymentMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Month:</span>
                <span className="text-gray-800 dark:text-gray-200">{receiptData.monthFor || "Tuition Fee"}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <a
                href={generateWhatsAppReceiptLink({
                  phone: receiptData.phone,
                  parentName: receiptData.parentName,
                  studentName: receiptData.studentName,
                  amountPaid: receiptData.amountPaid ?? 0,
                  paymentMode: receiptData.paymentMode,
                  referenceId: receiptData.referenceId,
                  monthFor: receiptData.monthFor,
                  receiptId: receiptData.receiptId,
                })}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setReceiptData(null);
                  onClose();
                }}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-xs transition-colors"
              >
                <MessageCircle size={17} />
                Send Receipt via WhatsApp
              </a>

              <button
                onClick={() => {
                  setReceiptData(null);
                  onClose();
                }}
                className="w-full py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
