"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  Calendar,
  Layers,
  IndianRupee,
  Award,
  CalendarCheck,
  Receipt,
  FileText,
  Share2,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2,
  PlusCircle,
  MessageCircle,
  Clock,
  Filter,
  RefreshCw,
} from "lucide-react";
import {
  StudentProfile360,
  fetchStudentProfile,
  updateStudentNotes,
} from "@/lib/api";
import {
  generateWhatsAppFeeReminderLink,
  generateWhatsAppReceiptLink,
  generateWhatsAppScorecardLink,
  generateWhatsAppAbsentLink,
} from "@/lib/indiaFeatures";
import CollectFeeModal from "@/components/CollectFeeModal";

export default function StudentProfile360Page() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [profile, setProfile] = useState<StudentProfile360 | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: "overview" | "academics" | "attendance" | "fees"
  const [activeTab, setActiveTab] = useState<"overview" | "academics" | "attendance" | "fees">("overview");

  // Attendance sub-filter: "all" | "absent"
  const [attendanceFilter, setAttendanceFilter] = useState<"all" | "absent">("all");

  // Notes state
  const [notes, setNotes] = useState<string>("");
  const [savingNotes, setSavingNotes] = useState<boolean>(false);
  const [notesSavedMsg, setNotesSavedMsg] = useState<boolean>(false);

  // Collect Fee modal
  const [showCollectModal, setShowCollectModal] = useState<boolean>(false);

  const loadProfile = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudentProfile(studentId);
      setProfile(data);
      setNotes(data.student.notes || "");
    } catch (err: any) {
      console.error("Profile load error:", err);
      setError(err.message || "Failed to load student profile");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await updateStudentNotes(studentId, notes);
      setNotesSavedMsg(true);
      setTimeout(() => setNotesSavedMsg(false), 3000);
    } catch (err: any) {
      alert("Error saving notes: " + err.message);
    } finally {
      setSavingNotes(false);
    }
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

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 size={32} className="animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-sm font-medium">Loading student profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 sm:p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md mx-auto my-12 shadow-xs">
        <AlertCircle size={36} className="text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Unable to load profile</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">{error || "Student not found"}</p>
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={loadProfile}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => router.push("/students")}
            className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer"
          >
            Back to Students
          </button>
        </div>
      </div>
    );
  }

  const { student, batches, financials, attendance, academic_tests } = profile;
  const batchNames = batches.map((b) => b.name).join(", ") || "General";

  const waReminderUrl = generateWhatsAppFeeReminderLink({
    phone: student.primary_contact,
    parentName: student.parent_name,
    studentName: student.student_name,
    batchNames,
    pendingDue: financials.pending_due,
  });

  const attendanceRecords = attendance.all_records || [];
  const filteredAttendance = attendanceFilter === "absent"
    ? attendanceRecords.filter((r) => r.status === "ABSENT")
    : attendanceRecords;

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-16">
      {/* ----------------- TOP PROFILE HEADER CARD ----------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          {/* Avatar and Basic Details */}
          <div className="flex items-start gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => router.push("/students")}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              title="Back to Students list"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="size-12 sm:size-14 rounded-xl bg-indigo-600 text-white font-bold text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-xs">
              {student.student_name.slice(0, 2).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                  {student.student_name}
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {student.grade}
                </span>
                <span className="text-xs text-slate-500 font-medium truncate">
                  {student.school_or_board}
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex-wrap">
                <span>Parent: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{student.parent_name}</strong></span>
                <span>•</span>
                <a
                  href={`tel:${student.primary_contact}`}
                  className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                >
                  <Phone size={12} /> {student.primary_contact}
                </a>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:flex items-center gap-1">
                  <Calendar size={12} /> Joined {student.date_of_joining}
                </span>
              </div>
            </div>
          </div>

          {/* Dues & Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pending Dues</p>
              <p className={`text-lg sm:text-xl font-bold ${financials.pending_due > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₹{financials.pending_due.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {financials.pending_due > 0 && (
                <a
                  href={waReminderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1.5"
                  title="Send fee reminder on WhatsApp"
                >
                  <MessageCircle size={14} className="text-emerald-600" />
                  <span className="hidden sm:inline">WhatsApp Due</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => setShowCollectModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={14} />
                Collect Fee
              </button>
            </div>
          </div>
        </div>

        {/* ----------------- TAB NAVIGATION ----------------- */}
        <div className="flex items-center gap-1 sm:gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "overview"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <User size={13} />
            Overview & Notes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fees")}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "fees"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Receipt size={13} />
            Fees History ({financials.payments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "attendance"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <CalendarCheck size={13} />
            Attendance ({attendance.attendance_percentage}%)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("academics")}
            className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "academics"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Award size={13} />
            Test History ({academic_tests.length})
          </button>
        </div>
      </div>

      {/* ----------------- TAB 1: OVERVIEW & NOTES ----------------- */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Enrolled Batches Card */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
              <Layers size={16} className="text-indigo-600" />
              Enrolled Batches
            </div>

            {batches.length === 0 ? (
              <p className="text-xs text-slate-400">No active batches assigned.</p>
            ) : (
              <div className="space-y-2">
                {batches.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                        {b.name}
                      </p>
                      <p className="text-[11px] text-slate-400">Monthly Tuition</p>
                    </div>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">
                      ₹{b.monthly_fee.toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total Expected Fees:</span>
                <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                  ₹{financials.total_expected.toLocaleString("en-IN")}
                </strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Total Lifetime Paid:</span>
                <strong className="text-emerald-600 font-semibold">
                  ₹{financials.total_paid.toLocaleString("en-IN")}
                </strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Current Balance Due:</span>
                <strong className={`font-bold ${financials.pending_due > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  ₹{financials.pending_due.toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
          </div>

          {/* Coach Private Notes */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
                  <FileText size={16} className="text-indigo-600" />
                  Coach Confidential Notes
                </div>
                {notesSavedMsg && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 size={13} /> Notes saved!
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Track personal student progress, weak topics, exam targets, or parent consultation logs.
              </p>

              <textarea
                rows={7}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Write private notes about this student here..."
                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
              />
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {savingNotes ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: FEES HISTORY ----------------- */}
      {activeTab === "fees" && (
        <div className="space-y-4">
          {/* Monthly Breakdown Badges */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm mb-3">
              Monthly Dues Breakdown
            </h4>
            <div className="flex flex-wrap gap-2">
              {financials.monthly_breakdown.map((mb, idx) => (
                <div
                  key={idx}
                  className={`px-3 py-1.5 rounded-lg border text-xs flex flex-col items-center min-w-20 ${
                    mb.status === "PAID"
                      ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400"
                      : mb.status === "PARTIAL"
                      ? "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{mb.month_name}</span>
                  <span className="text-[10px] font-bold mt-0.5">{mb.status}</span>
                  {mb.due_amount > 0 && (
                    <span className="text-[11px] font-bold mt-0.5">₹{mb.due_amount} due</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment Receipts History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  Complete Tuition Fee Ledger
                </h4>
                <p className="text-[11px] text-slate-400">
                  Total collected: ₹{financials.total_paid.toLocaleString("en-IN")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle size={13} /> Collect Fee
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3.5 font-semibold">Receipt #</th>
                    <th className="py-2.5 px-3.5 font-semibold">Date</th>
                    <th className="py-2.5 px-3.5 font-semibold">Time</th>
                    <th className="py-2.5 px-3.5 font-semibold">Month / Purpose</th>
                    <th className="py-2.5 px-3.5 font-semibold">Mode & Ref</th>
                    <th className="py-2.5 px-3.5 font-semibold text-right">Amount</th>
                    <th className="py-2.5 px-3.5 font-semibold text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {financials.payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    financials.payments.map((p) => {
                      const waReceiptUrl = generateWhatsAppReceiptLink({
                        phone: student.primary_contact,
                        parentName: student.parent_name,
                        studentName: student.student_name,
                        amountPaid: p.amount_paid,
                        paymentMode: p.payment_mode,
                        referenceId: p.reference_id,
                        monthFor: p.month_for,
                        receiptId: p.id.slice(0, 8).toUpperCase(),
                      });

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3.5 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                            #{p.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {p.payment_date}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap">
                            {formatTxTime(p.created_at)}
                          </td>
                          <td className="py-2.5 px-3.5 font-medium text-slate-800 dark:text-slate-200">
                            {p.month_for || "Tuition Fee"}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {p.payment_mode}
                            </span>
                            {p.reference_id ? ` ${p.reference_id}` : ""}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            +₹{p.amount_paid.toLocaleString("en-IN")}
                          </td>
                          <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                            <a
                              href={waReceiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                            >
                              <MessageCircle size={12} className="text-emerald-600" />
                              Receipt
                            </a>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: ATTENDANCE HISTORY ----------------- */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          {/* Summary Stat Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
              <p className="text-xs text-slate-400 font-medium">Total Classes</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {attendance.total_sessions}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
              <p className="text-xs text-slate-400 font-medium">Present</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
                {attendance.present_count}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
              <p className="text-xs text-slate-400 font-medium">Absent</p>
              <p className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">
                {attendance.absent_count}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
              <p className="text-xs text-slate-400 font-medium">Attendance Rate</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 ${
                attendance.attendance_percentage >= 85 ? "text-emerald-600" : "text-amber-600"
              }`}>
                {attendance.attendance_percentage}%
              </p>
            </div>
          </div>

          {/* Full Attendance Session Logs */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  Attendance Session Register
                </h4>
                <p className="text-[11px] text-slate-400">
                  Showing {filteredAttendance.length} records
                </p>
              </div>

              {/* Attendance filter toggle */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAttendanceFilter("all")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    attendanceFilter === "all"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  All ({attendanceRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceFilter("absent")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    attendanceFilter === "absent"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  Absent ({attendance.absent_count})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Batch</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Remarks</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                        {attendanceFilter === "absent" ? "No absent days recorded! 🎉" : "No attendance recorded yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((rec, idx) => {
                      const isAbsent = rec.status === "ABSENT";
                      const absentNoticeUrl = isAbsent ? generateWhatsAppAbsentLink({
                        phone: student.primary_contact,
                        parentName: student.parent_name,
                        studentName: student.student_name,
                        batchName: rec.batch_name,
                        dateStr: rec.date,
                      }) : null;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {rec.date}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {rec.batch_name}
                          </td>
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                              rec.status === "PRESENT"
                                ? "bg-slate-100 dark:bg-slate-800 text-emerald-600 border border-slate-200 dark:border-slate-700"
                                : rec.status === "ABSENT"
                                ? "bg-slate-100 dark:bg-slate-800 text-rose-600 border border-slate-200 dark:border-slate-700"
                                : "bg-slate-100 dark:bg-slate-800 text-amber-600 border border-slate-200 dark:border-slate-700"
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 italic max-w-xs truncate">
                            {rec.notes || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {absentNoticeUrl ? (
                              <a
                                href={absentNoticeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700 transition-colors"
                              >
                                <MessageCircle size={12} className="text-emerald-600" />
                                Alert Parent
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
        </div>
      )}

      {/* ----------------- TAB 4: TEST HISTORY ----------------- */}
      {activeTab === "academics" && (
        <div className="space-y-4">
          {/* Performance Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
              <p className="text-xs text-slate-400 font-medium">Tests Evaluated</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {academic_tests.length}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
              <p className="text-xs text-slate-400 font-medium">Average Performance</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {academic_tests.length > 0
                  ? `${Math.round(
                      academic_tests.reduce((acc, t) => acc + (t.percentage || 0), 0) /
                        academic_tests.length
                    )}%`
                  : "N/A"}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-xs">
              <p className="text-xs text-slate-400 font-medium">Best Batch Rank</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                {(() => {
                  const ranks = academic_tests.map((t) => t.rank).filter((r): r is number => r !== null && r !== undefined);
                  return ranks.length > 0 ? `#${Math.min(...ranks)}` : "—";
                })()}
              </p>
            </div>
          </div>

          {/* Test Scores List */}
          {academic_tests.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <Award size={32} className="text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Test Scores Logged</h4>
              <p className="text-xs text-slate-400 mt-1">
                Create tests under &quot;Tests & Marks&quot; to track academic performance for this student.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {academic_tests.map((test) => {
                const scorecardUrl = generateWhatsAppScorecardLink({
                  phone: student.primary_contact,
                  parentName: student.parent_name,
                  studentName: student.student_name,
                  batchName: test.batch_name,
                  testTitle: test.test_title,
                  subject: test.subject,
                  marksObtained: test.marks_obtained,
                  maxMarks: test.max_marks,
                  rank: test.rank,
                  totalStudents: test.total_students,
                  highestScore: test.highest_in_class,
                  averageScore: test.average_in_class,
                  isAbsent: test.is_absent,
                  remarks: test.remarks,
                });

                return (
                  <div
                    key={test.test_id}
                    className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {test.batch_name}
                        </span>
                        <span className="text-xs text-slate-400">{test.exam_date}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base mt-1">
                        {test.test_title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Subject: <strong className="text-slate-700 dark:text-slate-300 font-medium">{test.subject}</strong> • Class Highest:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">{test.highest_in_class ?? "N/A"}</strong> • Class Avg:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">{test.average_in_class ?? "N/A"}</strong>
                      </p>
                      {test.remarks && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded inline-block">
                          Coach remark: &quot;{test.remarks}&quot;
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      <div className="text-right">
                        {test.is_absent ? (
                          <span className="text-xs font-bold text-rose-500">ABSENT</span>
                        ) : (
                          <>
                            <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                              {test.marks_obtained} / {test.max_marks}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {test.percentage}% {test.rank ? `• Rank #${test.rank}` : ""}
                            </p>
                          </>
                        )}
                      </div>

                      <a
                        href={scorecardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <MessageCircle size={13} className="text-emerald-600" />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ----------------- COLLECT FEE MODAL ----------------- */}
      <CollectFeeModal
        isOpen={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        initialStudent={student}
        onPaymentSuccess={loadProfile}
      />
    </div>
  );
}
