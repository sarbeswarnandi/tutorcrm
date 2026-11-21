"use client";

import React, { useState, useEffect } from "react";
import {
  Award,
  PlusCircle,
  Search,
  Calendar,
  Layers,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  Share2,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Loader2,
  Trophy,
} from "lucide-react";
import {
  Batch,
  TestExam,
  TestExamDetail,
  StudentTestScore,
  fetchBatches,
  fetchTests,
  createTest,
  fetchTestScores,
  saveTestScores,
  deleteTest,
} from "@/lib/api";
import { generateWhatsAppScorecardLink } from "@/lib/indiaFeatures";
import { getTodayDateString } from "@/lib/timezone";

export default function TestsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("ALL");
  const [tests, setTests] = useState<TestExam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Active test being scored
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [activeTestDetail, setActiveTestDetail] = useState<TestExamDetail | null>(null);
  const [scoresDraft, setScoresDraft] = useState<StudentTestScore[]>([]);
  const [savingScores, setSavingScores] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState<string>("");

  // Create Test Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newSubject, setNewSubject] = useState<string>("");
  const [newBatchId, setNewBatchId] = useState<string>("");
  const [newMaxMarks, setNewMaxMarks] = useState<string>("50");
  const [newExamDate, setNewExamDate] = useState<string>(getTodayDateString());
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Load batches and tests
  useEffect(() => {
    loadData();
  }, [selectedBatchId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [bList, tList] = await Promise.all([
        fetchBatches(),
        fetchTests(selectedBatchId),
      ]);
      setBatches(bList);
      setTests(tList);
      if (bList.length > 0 && !newBatchId) {
        setNewBatchId(bList[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  }

  // Load scores for a specific test
  async function handleOpenTestScoring(testId: string) {
    setActiveTestId(testId);
    setLoading(true);
    setError(null);
    setSaveSuccessMsg(null);
    try {
      const detail = await fetchTestScores(testId);
      setActiveTestDetail(detail);
      setScoresDraft(detail.scores);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setError(err.message || "Failed to load test details");
    } finally {
      setLoading(false);
    }
  }

  // Handle score change in the grid
  function handleScoreChange(studentId: string, value: string) {
    const num = parseFloat(value);
    const max = activeTestDetail?.exam.max_marks || 100;
    const clamped = isNaN(num) ? 0 : Math.min(Math.max(0, num), max);

    setScoresDraft((prev) =>
      prev.map((s) => {
        if (s.student_id === studentId) {
          const pct = max > 0 ? (clamped / max) * 100 : 0;
          return {
            ...s,
            marks_obtained: clamped,
            is_absent: false,
            percentage: Math.round(pct * 10) / 10,
          };
        }
        return s;
      })
    );
    setHasUnsavedChanges(true);
  }

  // Toggle absent status
  function handleToggleAbsent(studentId: string) {
    setScoresDraft((prev) =>
      prev.map((s) => {
        if (s.student_id === studentId) {
          const newAbsent = !s.is_absent;
          return {
            ...s,
            is_absent: newAbsent,
            marks_obtained: newAbsent ? 0 : s.marks_obtained,
            rank: newAbsent ? null : s.rank,
          };
        }
        return s;
      })
    );
    setHasUnsavedChanges(true);
  }

  // Update remarks
  function handleRemarksChange(studentId: string, remarks: string) {
    setScoresDraft((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, remarks } : s))
    );
    setHasUnsavedChanges(true);
  }

  // Save all marks to backend
  async function handleSaveScores() {
    if (!activeTestId) return;
    setSavingScores(true);
    setSaveSuccessMsg(null);
    try {
      const payload = scoresDraft.map((s) => ({
        student_id: s.student_id,
        marks_obtained: s.marks_obtained,
        is_absent: s.is_absent,
        remarks: s.remarks,
      }));
      const updated = await saveTestScores(activeTestId, payload);
      setActiveTestDetail(updated);
      setScoresDraft(updated.scores);
      setHasUnsavedChanges(false);
      setSaveSuccessMsg("All marks saved and ranks updated successfully!");
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      alert("Error saving marks: " + err.message);
    } finally {
      setSavingScores(false);
    }
  }

  // Create new test
  async function handleCreateTest(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newSubject.trim() || !newBatchId) {
      setCreateError("Please complete all required fields");
      return;
    }
    const maxM = parseFloat(newMaxMarks);
    if (isNaN(maxM) || maxM <= 0) {
      setCreateError("Maximum marks must be greater than 0");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await createTest({
        batch_id: newBatchId,
        title: newTitle.trim(),
        subject: newSubject.trim(),
        max_marks: maxM,
        exam_date: newExamDate,
      });
      setShowCreateModal(false);
      setNewTitle("");
      setNewSubject("");
      // Refresh list and directly open the new test for mark entry!
      await loadData();
      handleOpenTestScoring(created.id);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create test");
    } finally {
      setCreating(false);
    }
  }

  // Delete test
  async function handleDeleteTest(testId: string, testTitle: string) {
    if (
      !confirm(
        `Are you sure you want to delete test "${testTitle}"? All recorded marks will be permanently removed.`
      )
    ) {
      return;
    }
    try {
      await deleteTest(testId);
      if (activeTestId === testId) {
        setActiveTestId(null);
        setActiveTestDetail(null);
      }
      loadData();
    } catch (err: any) {
      alert("Error deleting test: " + err.message);
    }
  }

  // Filter scored students in active test
  const filteredScores = scoresDraft.filter(
    (s) =>
      s.student_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.primary_contact.includes(studentSearch)
  );

  return (
    <div className="space-y-6">
      {/* ----------------- IF ACTIVE TEST IS OPEN: SCORE ENTRY GRID ----------------- */}
      {activeTestId && activeTestDetail ? (
        <div className="space-y-6">
          {/* Top Bar / Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (
                    hasUnsavedChanges &&
                    !confirm("You have unsaved marks. Are you sure you want to go back?")
                  ) {
                    return;
                  }
                  setActiveTestId(null);
                  setActiveTestDetail(null);
                  loadData();
                }}
                className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="Back to all tests"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                    {activeTestDetail.exam.batch_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {activeTestDetail.exam.exam_date}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight mt-1">
                  {activeTestDetail.exam.title}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Subject: <span className="font-semibold">{activeTestDetail.exam.subject}</span> • Maximum Marks:{" "}
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {activeTestDetail.exam.max_marks}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {hasUnsavedChanges && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 animate-pulse">
                  <AlertCircle size={14} /> Unsaved changes
                </span>
              )}
              <button
                onClick={handleSaveScores}
                disabled={savingScores}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                {savingScores ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save All Marks
              </button>
            </div>
          </div>

          {/* Success Notification */}
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Batch Analytics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm">
              <p className="text-xs font-medium text-gray-400">Highest Score</p>
              <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {activeTestDetail.exam.highest_score !== null && activeTestDetail.exam.highest_score !== undefined
                  ? `${activeTestDetail.exam.highest_score} / ${activeTestDetail.exam.max_marks}`
                  : "N/A"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm">
              <p className="text-xs font-medium text-gray-400">Class Average</p>
              <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {activeTestDetail.exam.average_score !== null && activeTestDetail.exam.average_score !== undefined
                  ? `${activeTestDetail.exam.average_score} / ${activeTestDetail.exam.max_marks}`
                  : "N/A"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm">
              <p className="text-xs font-medium text-gray-400">Students Evaluated</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {activeTestDetail.exam.total_students_tested} / {activeTestDetail.exam.total_enrolled}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 rounded-2xl shadow-sm">
              <p className="text-xs font-medium text-gray-400">Batch Pass Rate</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 mt-1">
                {activeTestDetail.exam.max_marks > 0 && activeTestDetail.exam.average_score !== null && activeTestDetail.exam.average_score !== undefined
                  ? `${Math.round(((activeTestDetail.exam.average_score || 0) / activeTestDetail.exam.max_marks) * 100)}%`
                  : "N/A"}
              </p>
            </div>
          </div>

          {/* Search bar inside test scoring */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search student or phone in this test..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>

          {/* Marks Entry Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">Rank</th>
                    <th className="py-3 px-4 font-bold">Student Name</th>
                    <th className="py-3 px-4 font-bold text-center">Marks (Max: {activeTestDetail.exam.max_marks})</th>
                    <th className="py-3 px-4 font-bold text-center">Percentage</th>
                    <th className="py-3 px-4 font-bold">Coach Remarks</th>
                    <th className="py-3 px-4 font-bold text-center">Status</th>
                    <th className="py-3 px-4 font-bold text-right">Share Scorecard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredScores.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No students enrolled in this batch yet.
                      </td>
                    </tr>
                  ) : (
                    filteredScores.map((student) => {
                      const waScorecardUrl = generateWhatsAppScorecardLink({
                        phone: student.primary_contact,
                        parentName: student.parent_name,
                        studentName: student.student_name,
                        batchName: activeTestDetail.exam.batch_name || "Tuition Batch",
                        testTitle: activeTestDetail.exam.title,
                        subject: activeTestDetail.exam.subject,
                        marksObtained: student.marks_obtained,
                        maxMarks: activeTestDetail.exam.max_marks,
                        rank: student.rank,
                        totalStudents: activeTestDetail.exam.total_enrolled,
                        highestScore: activeTestDetail.exam.highest_score,
                        averageScore: activeTestDetail.exam.average_score,
                        isAbsent: student.is_absent,
                        remarks: student.remarks,
                      });

                      return (
                        <tr
                          key={student.student_id}
                          className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors ${
                            student.is_absent ? "opacity-60 bg-gray-50/30 dark:bg-gray-900/30" : ""
                          }`}
                        >
                          {/* Rank Badge */}
                          <td className="py-3 px-4 font-bold">
                            {student.is_absent ? (
                              <span className="text-gray-400 text-xs">-</span>
                            ) : student.rank === 1 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                                <Trophy size={12} className="text-amber-500" /> #1
                              </span>
                            ) : student.rank === 2 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-300 dark:border-slate-700">
                                #2
                              </span>
                            ) : student.rank === 3 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 dark:text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                                #3
                              </span>
                            ) : student.rank ? (
                              <span className="text-gray-500 dark:text-gray-400 font-medium text-xs px-2">
                                #{student.rank}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs px-2">-</span>
                            )}
                          </td>

                          {/* Student Details */}
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900 dark:text-gray-100">
                              {student.student_name}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Parent: {student.parent_name} • {student.primary_contact}
                            </p>
                          </td>

                          {/* Marks Input */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center justify-center">
                              <input
                                type="number"
                                min={0}
                                max={activeTestDetail.exam.max_marks}
                                step="0.5"
                                disabled={student.is_absent}
                                value={student.is_absent ? "" : student.marks_obtained}
                                onChange={(e) =>
                                  handleScoreChange(student.student_id, e.target.value)
                                }
                                placeholder="0"
                                className="w-20 text-center font-bold text-sm py-1.5 px-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-40 transition"
                              />
                            </div>
                          </td>

                          {/* Percentage */}
                          <td className="py-3 px-4 text-center font-semibold">
                            {student.is_absent ? (
                              <span className="text-rose-500 text-xs font-bold">ABSENT</span>
                            ) : (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                  (student.percentage || 0) >= 75
                                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50"
                                    : (student.percentage || 0) >= 50
                                    ? "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50"
                                    : "text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50"
                                }`}
                              >
                                {student.percentage}%
                              </span>
                            )}
                          </td>

                          {/* Remarks */}
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={student.remarks || ""}
                              onChange={(e) =>
                                handleRemarksChange(student.student_id, e.target.value)
                              }
                              placeholder="e.g. Good concept clarity"
                              className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </td>

                          {/* Absent Toggle Button */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleAbsent(student.student_id)}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition ${
                                student.is_absent
                                  ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-rose-600 border-gray-200 dark:border-gray-700"
                              }`}
                            >
                              {student.is_absent ? "Absent ❌" : "Present ✅"}
                            </button>
                          </td>

                          {/* WhatsApp Scorecard Share */}
                          <td className="py-3 px-4 text-right">
                            <a
                              href={waScorecardUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition shadow-xs"
                              title="Send scorecard directly to parent on WhatsApp"
                            >
                              <Share2 size={13} className="text-emerald-600" />
                              WhatsApp
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
      ) : (
        /* ----------------- TESTS DASHBOARD / LIST VIEW ----------------- */
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Award size={22} />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                  Academic Tests & Marks Engine
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Track batch exams, automate student ranks, and share instant WhatsApp scorecards.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Batch Filter Dropdown */}
              <div className="flex items-center gap-1.5 text-xs">
                <Layers size={14} className="text-gray-400" />
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="ALL">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.grade})
                    </option>
                  ))}
                </select>
              </div>

              {/* New Test Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <PlusCircle size={15} />
                New Test
              </button>
            </div>
          </div>

          {/* Test Cards List */}
          {loading ? (
            <div className="py-20 text-center text-gray-400">
              <Loader2 size={28} className="animate-spin mx-auto text-indigo-600 mb-2" />
              Loading tests...
            </div>
          ) : tests.length === 0 ? (
            <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Award size={24} />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                No Tests Recorded Yet
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                Create your first test to enter marks, compute class ranks, and send formatted WhatsApp scorecards to parents.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md transition"
              >
                <PlusCircle size={15} /> Create Test
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                        {test.batch_name || "Batch"}
                      </span>
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Calendar size={12} /> {test.exam_date}
                      </span>
                    </div>

                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base tracking-tight">
                      {test.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Subject: <span className="font-semibold text-gray-700 dark:text-gray-300">{test.subject}</span> • Max Marks:{" "}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{test.max_marks}</span>
                    </p>

                    {/* Stats Pill Row */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-center">
                      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Highest</p>
                        <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">
                          {test.highest_score !== null && test.highest_score !== undefined ? `${test.highest_score}` : "—"}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Average</p>
                        <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                          {test.average_score !== null && test.average_score !== undefined ? `${test.average_score}` : "—"}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-2">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Tested</p>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {test.total_students_tested} / {test.total_enrolled}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleDeleteTest(test.id, test.title)}
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                      title="Delete test"
                    >
                      <Trash2 size={15} />
                    </button>

                    <button
                      onClick={() => handleOpenTestScoring(test.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      Enter / View Marks <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- CREATE TEST MODAL ----------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                  Create New Test / Exam
                </h3>
                <p className="text-xs text-gray-500">Record a batch evaluation for marks tracking</p>
              </div>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-500" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTest} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Target Batch *
                </label>
                <select
                  required
                  value={newBatchId}
                  onChange={(e) => setNewBatchId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Test Title / Topic *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Quadratic Equations Test"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                    Maximum Marks *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 50"
                    value={newMaxMarks}
                    onChange={(e) => setNewMaxMarks(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                  Exam Date *
                </label>
                <input
                  type="date"
                  required
                  value={newExamDate}
                  onChange={(e) => setNewExamDate(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {creating ? <Loader2 size={15} className="animate-spin" /> : <PlusCircle size={15} />}
                  Create & Enter Marks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
