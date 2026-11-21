"use client";

import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  MessageCircle, 
  Save, 
  Users, 
  CheckCheck,
  BarChart2,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  Share2,
  Loader2,
} from "lucide-react";
import {
  Batch,
  AttendanceBatchData,
  MonthlyAttendanceSummary,
  fetchBatchAttendance,
  saveBatchAttendance,
  fetchMonthlyAttendanceSummary,
} from "@/lib/api";
import { generateWhatsAppAbsentAlert } from "@/lib/indiaFeatures";
import { getTodayDateString } from "@/lib/timezone";

interface AttendanceViewProps {
  batches: Batch[];
}

export default function AttendanceView({ batches }: AttendanceViewProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "monthly">("daily");
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batches[0]?.id || "");
  const [attendanceDate, setAttendanceDate] = useState<string>(getTodayDateString());
  const [attendanceData, setAttendanceData] = useState<AttendanceBatchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Monthly summary state
  const [selectedMonth, setSelectedMonth] = useState<string>(getTodayDateString().slice(0, 7));
  const [monthlyData, setMonthlyData] = useState<MonthlyAttendanceSummary | null>(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Load daily attendance
  useEffect(() => {
    if (!selectedBatchId || activeTab !== "daily") return;
    let isMounted = true;
    async function loadAttendance() {
      setLoading(true);
      setSaveSuccess(false);
      try {
        const data = await fetchBatchAttendance(selectedBatchId, attendanceDate);
        if (isMounted) setAttendanceData(data);
      } catch (err) {
        console.error("Failed to load attendance", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAttendance();
    return () => { isMounted = false; };
  }, [selectedBatchId, attendanceDate, activeTab]);

  // Load monthly summary
  useEffect(() => {
    if (!selectedBatchId || activeTab !== "monthly") return;
    let isMounted = true;
    async function loadMonthly() {
      setLoadingMonthly(true);
      try {
        const data = await fetchMonthlyAttendanceSummary(selectedBatchId, selectedMonth);
        if (isMounted) setMonthlyData(data);
      } catch (err) {
        console.error("Failed to load monthly attendance summary", err);
      } finally {
        if (isMounted) setLoadingMonthly(false);
      }
    }
    loadMonthly();
    return () => { isMounted = false; };
  }, [selectedBatchId, selectedMonth, activeTab]);

  // Update a single student's status locally
  const setStudentStatus = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    if (!attendanceData) return;
    setAttendanceData({
      ...attendanceData,
      students: attendanceData.students.map((st) =>
        st.student_id === studentId ? { ...st, status } : st
      ),
    });
  };

  // Mark all present shortcut
  const markAll = (status: "PRESENT" | "ABSENT") => {
    if (!attendanceData) return;
    setAttendanceData({
      ...attendanceData,
      students: attendanceData.students.map((st) => ({ ...st, status })),
    });
  };

  // Save attendance to backend
  const handleSave = async () => {
    if (!attendanceData) return;
    setSaving(true);
    try {
      await saveBatchAttendance({
        batch_id: attendanceData.batch_id,
        attendance_date: attendanceDate,
        records: attendanceData.students.map((s) => ({
          student_id: s.student_id,
          status: s.status === "UNMARKED" ? "PRESENT" : s.status,
          notes: s.notes,
        })),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save attendance.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = attendanceData?.students.filter((s) => s.status === "PRESENT").length || 0;
  const absentCount = attendanceData?.students.filter((s) => s.status === "ABSENT").length || 0;
  const totalCount = attendanceData?.students.length || 0;

  return (
    <div className="space-y-6 pb-20">
      {/* ----------------- HEADER & CONTROLS ----------------- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <CalendarCheck className="text-indigo-600 dark:text-indigo-400" size={22} />
              Attendance Management
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Track daily class presence, view monthly aggregates, and trigger 1-click WhatsApp alerts.
          </p>
        </div>

        {/* Batch & Tab Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Sub-tabs */}
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("daily")}
              className={`py-1.5 px-3 rounded-lg transition ${
                activeTab === "daily"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Daily Register
            </button>
            <button
              onClick={() => setActiveTab("monthly")}
              className={`py-1.5 px-3 rounded-lg transition ${
                activeTab === "monthly"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              Monthly Summary %
            </button>
          </div>

          {/* Batch Selector */}
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.grade})
              </option>
            ))}
          </select>

          {/* Date / Month Picker */}
          {activeTab === "daily" ? (
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          ) : (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          )}
        </div>
      </div>

      {/* ----------------- VIEW 1: DAILY REGISTER ----------------- */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          {/* Summary KPI Pills & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="text-gray-600 dark:text-gray-300">Total Enrolled: {totalCount}</span>
              <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full">
                Present: {presentCount}
              </span>
              <span className="text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/70 px-2.5 py-0.5 rounded-full">
                Absent: {absentCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => markAll("PRESENT")}
                className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <CheckCheck size={14} className="text-indigo-600" /> Mark All Present
              </button>
              <button
                onClick={handleSave}
                disabled={saving || totalCount === 0}
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <Save size={14} />
                {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Attendance"}
              </button>
            </div>
          </div>

          {/* Student Attendance List */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                <Loader2 size={24} className="animate-spin mx-auto text-indigo-600 mb-2" />
                Loading batch students...
              </div>
            ) : !attendanceData || attendanceData.students.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400 text-sm">
                No students enrolled in this batch yet. Assign students from the Students tab!
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {attendanceData.students.map((st) => {
                  const isPresent = st.status === "PRESENT";
                  const isAbsent = st.status === "ABSENT";
                  const isLate = st.status === "LATE";

                  const absentLink = generateWhatsAppAbsentAlert({
                    phone: st.primary_contact,
                    parentName: st.parent_name,
                    studentName: st.student_name,
                    batchName: attendanceData.batch_name,
                    dateStr: attendanceDate,
                  });

                  return (
                    <div
                      key={st.student_id}
                      className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isAbsent ? "bg-rose-50/30 dark:bg-rose-950/20" : ""
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{st.student_name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Parent: {st.parent_name} • 📞 {st.primary_contact}
                        </p>
                      </div>

                      {/* Present / Absent / Late Toggles + Absent WhatsApp */}
                      <div className="flex items-center gap-2">
                        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5">
                          <button
                            onClick={() => setStudentStatus(st.student_id, "PRESENT")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                              isPresent
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-emerald-600"
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => setStudentStatus(st.student_id, "ABSENT")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                              isAbsent
                                ? "bg-rose-600 text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-rose-600"
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => setStudentStatus(st.student_id, "LATE")}
                            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                              isLate
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-gray-600 dark:text-gray-400 hover:text-amber-600"
                            }`}
                          >
                            Late
                          </button>
                        </div>

                        {/* Absent Alert WhatsApp Button */}
                        {isAbsent && (
                          <a
                            href={absentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors"
                            title="Send WhatsApp Absent Notice to Parent"
                          >
                            <MessageCircle size={14} className="text-emerald-600" />
                            Alert Parent
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------- VIEW 2: MONTHLY SUMMARY ANALYTICS ----------------- */}
      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                  Monthly Aggregate Attendance ({selectedMonth})
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total batch teaching sessions held this month:{" "}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {monthlyData?.total_batch_sessions || 0}
                  </strong>
                </p>
              </div>
            </div>

            {loadingMonthly ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                <Loader2 size={24} className="animate-spin mx-auto text-indigo-600 mb-2" />
                Calculating monthly attendance stats...
              </div>
            ) : !monthlyData || monthlyData.students.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                No attendance logs found for this batch in {selectedMonth}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                    <tr>
                      <th className="py-3 px-4 font-bold">Student Name</th>
                      <th className="py-3 px-4 font-bold text-center">Sessions Logged</th>
                      <th className="py-3 px-4 font-bold text-center">Present</th>
                      <th className="py-3 px-4 font-bold text-center">Absent</th>
                      <th className="py-3 px-4 font-bold text-center">Late</th>
                      <th className="py-3 px-4 font-bold text-right">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {monthlyData.students.map((st) => (
                      <tr key={st.student_id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900 dark:text-gray-100">{st.student_name}</p>
                          <p className="text-[11px] text-gray-400">
                            {st.parent_name} • {st.primary_contact}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-600 dark:text-gray-300 font-semibold">
                          {st.total_days}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-emerald-600">
                          {st.present_days}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-rose-600">
                          {st.absent_days}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-600">
                          {st.late_days}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                              st.attendance_percentage >= 85
                                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                : st.attendance_percentage >= 75
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {st.attendance_percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
