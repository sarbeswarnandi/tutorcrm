"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  UserPlus, 
  Search, 
  MessageCircle, 
  CheckCircle2, 
  IndianRupee, 
  X, 
  Plus, 
  Pencil, 
  Layers, 
  Trash2, 
  ArrowUpDown,
  Settings2,
  AlertTriangle,
  Loader2,
  Edit,
  GraduationCap,
  Download,
  Zap,
  User,
  ExternalLink
} from "lucide-react";
import { 
  generateWhatsAppFeeReminderLink 
} from "@/lib/indiaFeatures";
import { 
  Student, 
  Batch, 
  createStudent, 
  updateStudent, 
  deleteStudent,
  createBatch, 
  updateBatch,
  deleteBatch,
  exportStudentsCsv 
} from "@/lib/api";
import CollectFeeModal from "@/components/CollectFeeModal";
import DefaultersQueueModal from "@/components/DefaultersQueueModal";

interface StudentManagementProps {
  students: Student[];
  batches: Batch[];
  onRefresh: () => void;
}

const INITIAL_STUDENT_FORM = {
  student_name: "",
  parent_name: "",
  primary_contact: "",
  grade: "",
  school_or_board: "",
  batch_ids: [] as string[],
};

export default function StudentManagementView({
  students,
  batches,
  onRefresh,
}: StudentManagementProps) {
  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"DUES_HIGH_TO_LOW" | "NAME_AZ" | "NAME_ZA" | "DUES_LOW_TO_HIGH">("DUES_HIGH_TO_LOW");

  // Unified Fee Collection Modal State (Common across the whole app)
  const [collectFeeStudent, setCollectFeeStudent] = useState<Student | null>(null);
  const [showCollectFeeModal, setShowCollectFeeModal] = useState(false);
  const [showDefaultersQueue, setShowDefaultersQueue] = useState(false);

  // Student Add & Edit Modal State
  const [studentModal, setStudentModal] = useState<{
    isOpen: boolean;
    isEdit: boolean;
    studentId?: string;
  }>({ isOpen: false, isEdit: false });
  const [studentForm, setStudentForm] = useState(INITIAL_STUDENT_FORM);
  const [submittingStudent, setSubmittingStudent] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [showConfirmDeleteStudent, setShowConfirmDeleteStudent] = useState(false);

  // New Batch Modal State
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [newBatch, setNewBatch] = useState({
    name: "",
    subject: "",
    grade: "10th",
    monthly_fee: 1500,
    billing_day_of_month: 1,
  });
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Manage / Edit / Delete Batches Modal State
  const [showManageBatchesModal, setShowManageBatchesModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editBatchForm, setEditBatchForm] = useState({
    name: "",
    subject: "",
    grade: "10th",
    monthly_fee: 1500,
    billing_day_of_month: 1,
  });
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState<Batch | null>(null);
  const [submittingBatchAction, setSubmittingBatchAction] = useState(false);

  // 1. Filter students by search and batch
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.primary_contact.includes(searchTerm) ||
      s.parent_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBatch =
      selectedBatchFilter === "ALL" ||
      s.batches.some((b) => b.id === selectedBatchFilter);
    return matchesSearch && matchesBatch;
  });

  // 2. Dynamically sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    const duesA = a.pending_due ?? 0;
    const duesB = b.pending_due ?? 0;

    switch (sortBy) {
      case "DUES_HIGH_TO_LOW":
        return duesB - duesA;
      case "DUES_LOW_TO_HIGH":
        return duesA - duesB;
      case "NAME_AZ":
        return a.student_name.localeCompare(b.student_name);
      case "NAME_ZA":
        return b.student_name.localeCompare(a.student_name);
      default:
        return 0;
    }
  });

  // Student Handlers
  const handleOpenAddStudent = () => {
    setStudentForm(INITIAL_STUDENT_FORM);
    setShowConfirmDeleteStudent(false);
    setStudentModal({ isOpen: true, isEdit: false });
  };

  const handleOpenEditStudent = (student: Student) => {
    setStudentForm({
      student_name: student.student_name,
      parent_name: student.parent_name,
      primary_contact: student.primary_contact,
      grade: student.grade || "",
      school_or_board: student.school_or_board || "",
      batch_ids: student.batches.map((b) => b.id),
    });
    setShowConfirmDeleteStudent(false);
    setStudentModal({ isOpen: true, isEdit: true, studentId: student.id });
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStudent(true);
    try {
      if (studentModal.isEdit && studentModal.studentId) {
        await updateStudent(studentModal.studentId, studentForm);
      } else {
        await createStudent(studentForm);
      }
      setStudentModal({ isOpen: false, isEdit: false });
      onRefresh();
    } catch (err) {
      alert(studentModal.isEdit ? "Error updating student." : "Error creating student.");
      console.error(err);
    } finally {
      setSubmittingStudent(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentModal.studentId) return;
    setDeletingStudent(true);
    try {
      await deleteStudent(studentModal.studentId);
      setStudentModal({ isOpen: false, isEdit: false });
      setShowConfirmDeleteStudent(false);
      onRefresh();
    } catch (err: any) {
      alert(`Error deleting student: ${err?.message || "Please check backend connection."}`);
      console.error("Delete student error:", err);
    } finally {
      setDeletingStudent(false);
    }
  };

  // Batch Handlers
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBatch(true);
    try {
      await createBatch({
        name: newBatch.name,
        subject: newBatch.subject,
        grade: newBatch.grade,
        monthly_fee: Number(newBatch.monthly_fee),
        billing_day_of_month: Number(newBatch.billing_day_of_month),
      });
      setShowAddBatchModal(false);
      setNewBatch({
        name: "",
        subject: "",
        grade: "10th",
        monthly_fee: 1500,
        billing_day_of_month: 1,
      });
      onRefresh();
    } catch (err) {
      alert("Error creating batch. Please check inputs and try again.");
      console.error(err);
    } finally {
      setSubmittingBatch(false);
    }
  };

  const handleStartEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setEditBatchForm({
      name: batch.name,
      subject: batch.subject,
      grade: batch.grade,
      monthly_fee: batch.monthly_fee,
      billing_day_of_month: 1,
    });
  };

  const handleSaveEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    setSubmittingBatchAction(true);
    try {
      await updateBatch(editingBatch.id, {
        name: editBatchForm.name,
        subject: editBatchForm.subject,
        grade: editBatchForm.grade,
        monthly_fee: Number(editBatchForm.monthly_fee),
        billing_day_of_month: Number(editBatchForm.billing_day_of_month),
      });
      setEditingBatch(null);
      onRefresh();
    } catch (err) {
      alert("Error updating batch.");
      console.error(err);
    } finally {
      setSubmittingBatchAction(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    setSubmittingBatchAction(true);
    try {
      await deleteBatch(batchId);
      setConfirmDeleteBatch(null);
      if (selectedBatchFilter === batchId) {
        setSelectedBatchFilter("ALL");
      }
      onRefresh();
    } catch (err: any) {
      alert(`Error deleting batch: ${err?.message || "Please check backend connection."}`);
      console.error("Delete batch error:", err);
    } finally {
      setSubmittingBatchAction(false);
    }
  };

  const isBatchView = selectedBatchFilter !== "ALL";

  return (
    <div className="space-y-4 pb-16">
      {/* ----------------- ACTION & FILTER BAR (Clean & No Duplicate Header) ----------------- */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAddStudent}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3.5 py-2 rounded-xl text-xs sm:text-sm shadow-sm transition-colors"
            >
              <UserPlus size={16} />
              Add Student
            </button>

            <button
              onClick={() => setShowAddBatchModal(true)}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
            >
              <Plus size={16} />
              New Batch
            </button>

            <button
              onClick={() => setShowManageBatchesModal(true)}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-xs"
              title="Edit or Delete Batches"
            >
              <Settings2 size={16} />
              Manage Batches
            </button>

            <button
              onClick={() => setShowDefaultersQueue(true)}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
              title="Launch Rapid Fee Reminders Queue"
            >
              <Zap size={16} className="text-amber-500" />
              Defaulter Queue
            </button>

            <button
              onClick={exportStudentsCsv}
              className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
              title="Download Students CSV Backup"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          {/* Quick Counter */}
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 self-end md:self-center">
            Showing <span className="font-bold text-gray-800 dark:text-gray-200">{sortedStudents.length}</span> students
          </div>
        </div>

        {/* Search, Batch Filter, and Dynamic Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
          {/* Search bar */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Search by student name, parent, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Batch Filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs sm:text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (₹{b.monthly_fee}/mo)
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Sort Option */}
          <div className="sm:col-span-3 relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="DUES_HIGH_TO_LOW">Dues: High to Low (Priority)</option>
              <option value="NAME_AZ">Alphabetical (A - Z)</option>
              <option value="NAME_ZA">Alphabetical (Z - A)</option>
              <option value="DUES_LOW_TO_HIGH">Dues: Low to High</option>
            </select>
          </div>
        </div>
      </div>

      {/* ----------------- COMPACT & OPTIMIZED STUDENT CARDS GRID ----------------- */}
      <div className={`grid gap-3.5 ${
        isBatchView 
          ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" 
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
      }`}>
        {sortedStudents.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No students match your filter or search query.</p>
          </div>
        ) : (
          sortedStudents.map((student) => {
            const batchNames = student.batches.map((b) => b.name).join(", ") || "No Batch";
            const pendingDue = student.pending_due ?? 0;
            const waLink = generateWhatsAppFeeReminderLink({
              phone: student.primary_contact,
              parentName: student.parent_name,
              studentName: student.student_name,
              batchNames,
              pendingDue,
            });

            // Filter ONLY unpaid months (DUE or PARTIAL). Do NOT show already PAID months!
            const unpaidMonths = (student.monthly_breakdown || []).filter(
              (mb) => mb.status === "DUE" || mb.status === "PARTIAL"
            );

            return (
              <div
                key={student.id}
                className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                  pendingDue > 0 ? "hover:border-rose-300 dark:hover:border-rose-800" : "hover:border-indigo-300"
                }`}
              >
                <div>
                  {/* Student Card Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/students/${student.id}`}
                          className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors truncate flex items-center gap-1 group"
                          title="View Student 360° Profile"
                        >
                          <span className="truncate">{student.student_name}</span>
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-indigo-500 shrink-0 transition-opacity" />
                        </Link>
                        {student.grade && (
                          <span className="text-[11px] px-1.5 py-0.2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded font-medium shrink-0">
                            {student.grade}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        Parent: <span className="text-gray-700 dark:text-gray-300 font-medium">{student.parent_name}</span> • 📞 {student.primary_contact}
                      </p>
                      {student.school_or_board && (
                        <p className="text-[11px] text-gray-400 truncate">
                          {student.school_or_board}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleOpenEditStudent(student)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shrink-0"
                      title="Edit student"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>

                  {/* Batch Badges */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {student.batches.length > 0 ? (
                      student.batches.map((b) => (
                        <span
                          key={b.id}
                          className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-medium"
                        >
                          {b.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">No batch assigned</span>
                    )}
                  </div>

                  {/* Month-by-Month Status: ONLY render UNPAID/PARTIAL months (NO PAID MONTHS) */}
                  {unpaidMonths.length > 0 ? (
                    <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider block mb-1">
                        Unpaid Due Months
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {unpaidMonths.map((mb, idx) => (
                          <span
                            key={idx}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              mb.status === "PARTIAL"
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                                : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                            }`}
                            title={`${mb.month_name}: Due ₹${mb.due_amount}`}
                          >
                            {mb.month_name} ({mb.status})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Pending Due row */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Pending Due:</span>
                    <span
                      className={`text-sm sm:text-base font-extrabold ${
                        pendingDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      ₹{pendingDue.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Card Actions: 360 Profile, WhatsApp Reminder & Collect Fee */}
                <div className="mt-3 grid grid-cols-3 gap-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                  <Link
                    href={`/students/${student.id}`}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-1 text-xs font-semibold rounded-xl text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="View Student 360° Profile"
                  >
                    <User size={13} />
                    Profile
                  </Link>

                  {pendingDue > 0 ? (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-1 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                      title="Send WhatsApp Fee Reminder"
                    >
                      <MessageCircle size={13} className="text-emerald-600" />
                      Due
                    </a>
                  ) : (
                    <div className="inline-flex items-center justify-center gap-1 py-1.5 px-1 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      <CheckCircle2 size={12} className="text-emerald-500" />
                      Paid
                    </div>
                  )}

                  {/* Common Collect Fee Button -> Opens CollectFeeModal */}
                  <button
                    onClick={() => {
                      setCollectFeeStudent(student);
                      setShowCollectFeeModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-1 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <IndianRupee size={12} />
                    Collect
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ----------------- UNIFIED COMMON COLLECT FEE MODAL ----------------- */}
      <CollectFeeModal
        isOpen={showCollectFeeModal}
        onClose={() => {
          setShowCollectFeeModal(false);
          setCollectFeeStudent(null);
        }}
        initialStudent={collectFeeStudent}
        onPaymentSuccess={onRefresh}
      />

      {/* ----------------- RAPID DEFAULTERS QUEUE MODAL ----------------- */}
      <DefaultersQueueModal
        isOpen={showDefaultersQueue}
        onClose={() => setShowDefaultersQueue(false)}
        students={students}
      />

      {/* ----------------- ADD / EDIT STUDENT MODAL ----------------- */}
      {studentModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setStudentModal({ isOpen: false, isEdit: false })}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {studentModal.isEdit ? "Edit Student Information" : "Enroll New Student"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              {studentModal.isEdit ? "Update profile details or remove student" : "Add details to initiate tracking & automated reminders"}
            </p>

            <form onSubmit={handleSaveStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.student_name}
                  onChange={(e) => setStudentForm({ ...studentForm, student_name: e.target.value })}
                  placeholder="e.g. Aarav Sharma"
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Parent Name *
                </label>
                <input
                  type="text"
                  required
                  value={studentForm.parent_name}
                  onChange={(e) => setStudentForm({ ...studentForm, parent_name: e.target.value })}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Primary Mobile / WhatsApp Number *
                </label>
                <input
                  type="tel"
                  required
                  value={studentForm.primary_contact}
                  onChange={(e) => setStudentForm({ ...studentForm, primary_contact: e.target.value })}
                  placeholder="10-digit mobile number"
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Grade / Class
                  </label>
                  <input
                    type="text"
                    value={studentForm.grade}
                    onChange={(e) => setStudentForm({ ...studentForm, grade: e.target.value })}
                    placeholder="e.g. 10th (Optional)"
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Board / School
                  </label>
                  <input
                    type="text"
                    value={studentForm.school_or_board}
                    onChange={(e) => setStudentForm({ ...studentForm, school_or_board: e.target.value })}
                    placeholder="e.g. CBSE / ICSE (Optional)"
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Batches Checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Assign Batches
                </label>
                {batches.length === 0 ? (
                  <p className="text-xs text-gray-400">No batches created yet.</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800">
                    {batches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={studentForm.batch_ids.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setStudentForm({ ...studentForm, batch_ids: [...studentForm.batch_ids, b.id] });
                            } else {
                              setStudentForm({ ...studentForm, batch_ids: studentForm.batch_ids.filter((id) => id !== b.id) });
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{b.name} <span className="text-gray-500 font-mono">(₹{b.monthly_fee}/m)</span></span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete Student Confirmation Box inside Edit Student */}
              {studentModal.isEdit && showConfirmDeleteStudent && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-2">
                  <div className="flex items-start gap-2 text-rose-800 dark:text-rose-200 font-bold">
                    <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                    <span>Confirm Student Deletion?</span>
                  </div>
                  <p className="text-rose-700 dark:text-rose-300">
                    Are you sure you want to delete <span className="font-bold">{studentForm.student_name}</span>? Their active enrollment will be archived.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={deletingStudent}
                      onClick={handleDeleteStudent}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 font-semibold rounded-lg transition-colors"
                    >
                      {deletingStudent ? "Deleting..." : "Yes, Delete Student"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDeleteStudent(false)}
                      className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2">
                {studentModal.isEdit ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDeleteStudent(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStudentModal({ isOpen: false, isEdit: false })}
                    className="px-3.5 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStudent}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition"
                  >
                    {submittingStudent ? "Saving..." : studentModal.isEdit ? "Update Student" : "Save Student"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- CREATE NEW BATCH MODAL ----------------- */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowAddBatchModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Create New Batch</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Define course name, grade, and monthly fee</p>

            <form onSubmit={handleCreateBatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Batch / Class Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 10 CBSE Maths"
                  value={newBatch.name}
                  onChange={(e) => setNewBatch({ ...newBatch, name: e.target.value })}
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maths"
                    value={newBatch.subject}
                    onChange={(e) => setNewBatch({ ...newBatch, subject: e.target.value })}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Grade *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10th"
                    value={newBatch.grade}
                    onChange={(e) => setNewBatch({ ...newBatch, grade: e.target.value })}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Monthly Fee (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newBatch.monthly_fee}
                    onChange={(e) => setNewBatch({ ...newBatch, monthly_fee: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Billing Day</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={newBatch.billing_day_of_month}
                    onChange={(e) => setNewBatch({ ...newBatch, billing_day_of_month: Number(e.target.value) })}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBatch}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {submittingBatch ? "Creating..." : "+ Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MANAGE BATCHES MODAL (EDIT & DELETE WITH CONFIRMATION) ----------------- */}
      {showManageBatchesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setShowManageBatchesModal(false);
                setEditingBatch(null);
                setConfirmDeleteBatch(null);
              }}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Layers className="text-purple-600" size={20} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Manage Batches
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Edit batch curriculum & fees, or delete inactive classes.
            </p>

            {/* If currently editing a batch */}
            {editingBatch ? (
              <form onSubmit={handleSaveEditBatch} className="space-y-3 bg-purple-50/50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-100 dark:border-purple-900/50 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-300">
                    Editing: {editingBatch.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingBatch(null)}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Batch Name *</label>
                  <input
                    type="text"
                    required
                    value={editBatchForm.name}
                    onChange={(e) => setEditBatchForm({ ...editBatchForm, name: e.target.value })}
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={editBatchForm.subject}
                      onChange={(e) => setEditBatchForm({ ...editBatchForm, subject: e.target.value })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                    <input
                      type="text"
                      required
                      value={editBatchForm.grade}
                      onChange={(e) => setEditBatchForm({ ...editBatchForm, grade: e.target.value })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Monthly Fee (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editBatchForm.monthly_fee}
                      onChange={(e) => setEditBatchForm({ ...editBatchForm, monthly_fee: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Billing Day</label>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={editBatchForm.billing_day_of_month}
                      onChange={(e) => setEditBatchForm({ ...editBatchForm, billing_day_of_month: Number(e.target.value) })}
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="pt-1 flex justify-end gap-2">
                  <button
                    type="submit"
                    disabled={submittingBatchAction}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors"
                  >
                    {submittingBatchAction ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : null}

            {/* Confirmation dialog for deleting a batch */}
            {confirmDeleteBatch && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl mb-4 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-200 font-bold">
                  <AlertTriangle size={16} className="text-rose-600" />
                  <span>Confirm Batch Deletion?</span>
                </div>
                <p className="text-rose-700 dark:text-rose-300">
                  Are you sure you want to delete batch <span className="font-bold">&quot;{confirmDeleteBatch.name}&quot;</span>? Students currently assigned to this batch will be unassigned.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={submittingBatchAction}
                    onClick={() => handleDeleteBatch(confirmDeleteBatch.id)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 font-semibold rounded-lg transition-colors"
                  >
                    {submittingBatchAction ? "Deleting..." : "Yes, Delete Batch"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteBatch(null)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* List of existing batches */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {batches.length === 0 ? (
                <p className="text-center py-6 text-gray-400 text-xs">No batches available.</p>
              ) : (
                batches.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 text-xs truncate">
                        {b.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {b.subject} • {b.grade} • <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{b.monthly_fee}/m</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStartEditBatch(b)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-white dark:hover:bg-gray-700 transition"
                        title="Edit Batch"
                      >
                        <Edit size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteBatch(b)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-white dark:hover:bg-gray-700 transition"
                        title="Delete Batch"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowManageBatchesModal(false);
                  setEditingBatch(null);
                  setConfirmDeleteBatch(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
