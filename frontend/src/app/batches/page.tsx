"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Layers, 
  PlusCircle, 
  Search, 
  Users, 
  IndianRupee, 
  Calendar, 
  Edit3, 
  Trash2, 
  CalendarCheck, 
  Loader2, 
  AlertCircle,
  X,
  BookOpen,
  ArrowRight,
  MessageCircle,
  ExternalLink,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { 
  Batch, 
  Student, 
  fetchBatches, 
  fetchStudents, 
  createBatch, 
  updateBatch, 
  deleteBatch,
  updateBatchWhatsAppLink,
} from "@/lib/api";

export default function BatchesPage() {
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Batch Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchSubject, setNewBatchSubject] = useState("");
  const [newBatchGrade, setNewBatchGrade] = useState("");
  const [newBatchFee, setNewBatchFee] = useState("1200");
  const [newBatchBillingDay, setNewBatchBillingDay] = useState("1");
  const [newBatchWaLink, setNewBatchWaLink] = useState("");

  // Edit Batch Modal State
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editGrade, setEditGrade] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editBillingDay, setEditBillingDay] = useState("1");
  const [editWaLink, setEditWaLink] = useState("");

  // WhatsApp Group Link Modal State
  const [waModalBatch, setWaModalBatch] = useState<Batch | null>(null);
  const [waLinkInput, setWaLinkInput] = useState("");
  const [submittingWaLink, setSubmittingWaLink] = useState(false);

  // Delete Batch Modal State
  const [deletingBatch, setDeletingBatch] = useState<Batch | null>(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // View Enrolled Students Modal State
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchBatches();
      // Hydrate with local storage fallback if needed
      const hydrated = data.map((b) => {
        if (!b.whatsapp_group_link && typeof window !== "undefined") {
          const localLink = localStorage.getItem(`tutor_batch_wa_${b.id}`);
          if (localLink) {
            return { ...b, whatsapp_group_link: localLink };
          }
        }
        return b;
      });
      setBatches(hydrated);
    } catch (err: any) {
      console.error("Failed to load batches:", err);
      setError("Could not load batches from backend. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim() || !newBatchSubject.trim() || !newBatchGrade.trim()) {
      alert("Please fill in Batch Name, Subject, and Grade.");
      return;
    }

    try {
      setSubmittingCreate(true);
      const created = await createBatch({
        name: newBatchName.trim(),
        subject: newBatchSubject.trim(),
        grade: newBatchGrade.trim(),
        monthly_fee: parseFloat(newBatchFee) || 0,
        billing_day_of_month: parseInt(newBatchBillingDay, 10) || 1,
        whatsapp_group_link: newBatchWaLink.trim() || null,
      });

      if (created?.id && newBatchWaLink.trim()) {
        localStorage.setItem(`tutor_batch_wa_${created.id}`, newBatchWaLink.trim());
      }

      setShowCreateModal(false);
      setNewBatchName("");
      setNewBatchSubject("");
      setNewBatchGrade("");
      setNewBatchFee("1200");
      setNewBatchBillingDay("1");
      setNewBatchWaLink("");
      await loadData();
    } catch (err: any) {
      alert("Error creating batch: " + err.message);
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (batch: Batch) => {
    setEditingBatch(batch);
    setEditName(batch.name);
    setEditSubject(batch.subject);
    setEditGrade(batch.grade);
    setEditFee(String(batch.monthly_fee));
    setEditBillingDay(String(batch.billing_day_of_month || 1));
    setEditWaLink(batch.whatsapp_group_link || "");
  };

  // Handle Update Batch
  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    try {
      setSubmittingEdit(true);
      const trimmedWa = editWaLink.trim() || null;
      await updateBatch(editingBatch.id, {
        name: editName.trim(),
        subject: editSubject.trim(),
        grade: editGrade.trim(),
        monthly_fee: parseFloat(editFee) || 0,
        billing_day_of_month: parseInt(editBillingDay, 10) || 1,
        whatsapp_group_link: trimmedWa,
      });

      if (typeof window !== "undefined") {
        if (trimmedWa) {
          localStorage.setItem(`tutor_batch_wa_${editingBatch.id}`, trimmedWa);
        } else {
          localStorage.removeItem(`tutor_batch_wa_${editingBatch.id}`);
        }
      }

      setEditingBatch(null);
      await loadData();
    } catch (err: any) {
      alert("Error updating batch: " + err.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open WhatsApp Link Modal
  const openWhatsAppModal = (batch: Batch) => {
    setWaModalBatch(batch);
    setWaLinkInput(batch.whatsapp_group_link || "");
  };

  // Handle Save WhatsApp Link
  const handleSaveWhatsAppLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waModalBatch) return;

    const trimmed = waLinkInput.trim() || null;
    try {
      setSubmittingWaLink(true);
      await updateBatchWhatsAppLink(waModalBatch.id, trimmed);
      if (typeof window !== "undefined") {
        if (trimmed) {
          localStorage.setItem(`tutor_batch_wa_${waModalBatch.id}`, trimmed);
        } else {
          localStorage.removeItem(`tutor_batch_wa_${waModalBatch.id}`);
        }
      }
      setWaModalBatch(null);
      await loadData();
    } catch (err: any) {
      alert("Error updating WhatsApp group link: " + err.message);
    } finally {
      setSubmittingWaLink(false);
    }
  };

  // Handle Delete Batch
  const handleDeleteBatch = async () => {
    if (!deletingBatch) return;
    try {
      setSubmittingDelete(true);
      await deleteBatch(deletingBatch.id);
      setDeletingBatch(null);
      await loadData();
    } catch (err: any) {
      alert("Error deleting batch: " + err.message);
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Handle View Enrolled Students
  const handleViewStudents = async (batch: Batch) => {
    setViewingBatch(batch);
    setLoadingStudents(true);
    try {
      const students = await fetchStudents(batch.id);
      setBatchStudents(students);
    } catch (err) {
      console.error("Failed to load students for batch:", err);
      setBatchStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Filtered Batches
  const filteredBatches = batches.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.subject.toLowerCase().includes(q) ||
      b.grade.toLowerCase().includes(q)
    );
  });

  const totalEnrollments = batches.reduce((acc, b) => acc + (b.student_count || 0), 0);
  const avgMonthlyFee = batches.length > 0 
    ? Math.round(batches.reduce((acc, b) => acc + b.monthly_fee, 0) / batches.length)
    : 0;

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm font-medium">Loading batches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-sm flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Unable to Load Batches</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      {/* ----------------- TOP CONTROLS & HEADER ----------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Batches Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organize classes, WhatsApp student groups, and tuition rates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <PlusCircle size={15} />
          + New Batch
        </button>
      </div>

      {/* ----------------- BATCH METRICS ----------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Batches
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5">
            {batches.length}
          </p>
          <span className="text-xs text-slate-400 mt-0.5 block">Active tuition groups</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Enrolled Students
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5">
            {totalEnrollments}
          </p>
          <span className="text-xs text-slate-400 mt-0.5 block">Total batch assignments</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg. Monthly Fee
            </span>
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              <IndianRupee size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5">
            ₹{avgMonthlyFee.toLocaleString("en-IN")}
          </p>
          <span className="text-xs text-slate-400 mt-0.5 block">Per student / month rate</span>
        </div>
      </div>

      {/* ----------------- SEARCH & FILTER BAR ----------------- */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by batch name, subject, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
          Showing <strong>{filteredBatches.length}</strong> {filteredBatches.length === 1 ? "batch" : "batches"}
        </span>
      </div>

      {/* ----------------- BATCH CARDS GRID ----------------- */}
      {filteredBatches.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-400">
          <Layers size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">No batches found</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery ? "Try a different search query." : "Get started by creating your first coaching batch."}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              + Create Batch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-600/50 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      {batch.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {batch.subject}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {batch.grade}
                      </span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                    <BookOpen size={16} />
                  </div>
                </div>

                {/* Details Row */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Monthly Tuition:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      ₹{batch.monthly_fee.toLocaleString("en-IN")}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Enrolled Students:</span>
                    <button
                      type="button"
                      onClick={() => handleViewStudents(batch)}
                      className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Users size={12} /> {batch.student_count || 0} Students
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Billing Cycle:</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      Day {batch.billing_day_of_month || 1} of month
                    </span>
                  </div>
                </div>

                {/* WHATSAPP GROUP LINK SECTION */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MessageCircle size={13} className="text-emerald-600 shrink-0" /> WhatsApp Group:
                  </span>
                  {batch.whatsapp_group_link ? (
                    <div className="flex items-center gap-1">
                      <a
                        href={batch.whatsapp_group_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shadow-xs"
                        title="Open batch WhatsApp group"
                      >
                        <MessageCircle size={12} className="text-emerald-600" />
                        Open Group
                        <ExternalLink size={10} className="text-slate-400" />
                      </a>
                      <button
                        type="button"
                        onClick={() => openWhatsAppModal(batch)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Change WhatsApp group link"
                      >
                        <Link2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openWhatsAppModal(batch)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer"
                      title="Add a WhatsApp group link for this batch"
                    >
                      <PlusCircle size={11} className="text-slate-400" /> Add Link
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons (Strictly 2 colors: Primary Indigo & Secondary Slate) */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/attendance?batch_id=${batch.id}`)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                  title="Take Attendance for this batch"
                >
                  <CalendarCheck size={13} className="text-slate-500" />
                  Attendance
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(batch)}
                    className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Edit Batch"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingBatch(batch)}
                    className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-xs transition-colors cursor-pointer hover:text-rose-600"
                    title="Delete Batch"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ----------------- WHATSAPP GROUP LINK MODAL ----------------- */}
      {waModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-emerald-600">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                    WhatsApp Group Link
                  </h3>
                  <p className="text-[11px] text-slate-400">{waModalBatch.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWaModalBatch(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWhatsAppLink} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Group Invite Link
                </label>
                <input
                  type="url"
                  placeholder="https://chat.whatsapp.com/..."
                  value={waLinkInput}
                  onChange={(e) => setWaLinkInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Paste the invite link from your batch WhatsApp group. Tapping the group button will immediately open this group.
                </p>
              </div>

              {/* 2-Color Button Rule */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                {waModalBatch.whatsapp_group_link ? (
                  <button
                    type="button"
                    onClick={() => {
                      setWaLinkInput("");
                    }}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
                  >
                    Clear Link
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWaModalBatch(null)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingWaLink}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {submittingWaLink && <Loader2 size={13} className="animate-spin" />}
                    Save Group Link
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- CREATE BATCH MODAL ----------------- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                  <Layers size={18} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Create New Batch
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Class 10 - Mathematics Batch A"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mathematics"
                    value={newBatchSubject}
                    onChange={(e) => setNewBatchSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Grade / Class *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Class 10"
                    value={newBatchGrade}
                    onChange={(e) => setNewBatchGrade(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={newBatchFee}
                    onChange={(e) => setNewBatchFee(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Day (1-28)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={newBatchBillingDay}
                    onChange={(e) => setNewBatchBillingDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Group Invite Link (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://chat.whatsapp.com/..."
                  value={newBatchWaLink}
                  onChange={(e) => setNewBatchWaLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* 2 Button Colors: Primary Indigo & Secondary Slate */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingCreate && <Loader2 size={13} className="animate-spin" />}
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- EDIT BATCH MODAL ----------------- */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                  <Edit3 size={18} />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Edit Batch Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateBatch} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Grade / Class *
                  </label>
                  <input
                    type="text"
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Fee (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editFee}
                    onChange={(e) => setEditFee(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Billing Day (1-28)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={editBillingDay}
                    onChange={(e) => setEditBillingDay(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Group Invite Link
                </label>
                <input
                  type="url"
                  placeholder="https://chat.whatsapp.com/..."
                  value={editWaLink}
                  onChange={(e) => setEditWaLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* 2 Button Colors: Primary Indigo & Secondary Slate */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingEdit && <Loader2 size={13} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- DELETE BATCH CONFIRMATION MODAL ----------------- */}
      {deletingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-rose-600">
                <Trash2 size={22} />
              </div>
              <h3 className="mt-3 text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Deactivate Batch?
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete <strong>{deletingBatch.name}</strong>? Students enrolled in this batch will be detached.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingBatch(null)}
                className="w-1/2 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBatch}
                disabled={submittingDelete}
                className="w-1/2 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {submittingDelete && <Loader2 size={13} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- VIEW ENROLLED STUDENTS MODAL ----------------- */}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                  Enrolled Students
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {viewingBatch.name} ({batchStudents.length} students)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-3.5 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {loadingStudents ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 size={18} className="animate-spin inline-block mr-2 text-indigo-600" />
                  Loading enrolled students...
                </div>
              ) : batchStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No students currently assigned to this batch.
                </div>
              ) : (
                batchStudents.map((st) => (
                  <div key={st.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {st.student_name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Parent: {st.parent_name} • {st.primary_contact}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-semibold ${
                        st.pending_due > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
                      }`}>
                        {st.pending_due > 0 ? `Due: ₹${st.pending_due}` : "No dues"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingBatch(null);
                          router.push(`/students/${st.id}`);
                        }}
                        className="px-2 py-1 text-[11px] font-medium rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Profile →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingBatch(null)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
