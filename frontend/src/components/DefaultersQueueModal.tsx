"use client";

import React, { useState } from "react";
import {
  X,
  Share2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  IndianRupee,
  Phone,
  User,
  Layers,
  AlertCircle,
  SkipForward,
  RotateCcw,
  Zap,
} from "lucide-react";
import { Student } from "@/lib/api";
import { generateWhatsAppFeeReminderLink } from "@/lib/indiaFeatures";

interface DefaultersQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
}

export default function DefaultersQueueModal({
  isOpen,
  onClose,
  students,
}: DefaultersQueueModalProps) {
  if (!isOpen) return null;

  // Filter students with pending dues > 0 and sort highest to lowest
  const defaulters = students
    .filter((s) => (s.pending_due || 0) > 0)
    .sort((a, b) => (b.pending_due || 0) - (a.pending_due || 0));

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);

  const total = defaulters.length;
  const isFinished = total === 0 || currentIndex >= total;
  const current = !isFinished ? defaulters[currentIndex] : null;

  const currentBatchNames = current?.batches.map((b) => b.name).join(", ") || "General";
  const currentWaUrl = current
    ? generateWhatsAppFeeReminderLink({
        phone: current.primary_contact,
        parentName: current.parent_name,
        studentName: current.student_name,
        batchNames: currentBatchNames,
        pendingDue: current.pending_due,
      })
    : "";

  function handleSendAndNext() {
    if (!current) return;
    // Open WhatsApp in new tab
    window.open(currentWaUrl, "_blank", "noopener,noreferrer");
    setCompletedCount((prev) => prev + 1);
    setCurrentIndex((prev) => prev + 1);
  }

  function handleSkip() {
    setCurrentIndex((prev) => prev + 1);
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function handleReset() {
    setCurrentIndex(0);
    setCompletedCount(0);
  }

  const unpaidMonths = current
    ? (current.monthly_breakdown || []).filter(
        (mb) => mb.status === "DUE" || mb.status === "PARTIAL"
      )
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition"
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Zap size={24} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] uppercase font-bold tracking-wider mb-1">
              <Sparkles size={11} /> High-Scale Communication Queue
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
              Rapid Fee Reminders Queue
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Process 30+ pending dues in seconds with pre-formatted 1-click WhatsApp links.
            </p>
          </div>
        </div>

        {/* FINISHED / CELEBRATION SCREEN */}
        {isFinished ? (
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
                {total === 0 ? "No Pending Dues!" : "All Done!"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
                {total === 0
                  ? "Every student is fully paid up. Great job managing the tuition ledger!"
                  : `You processed ${completedCount} of ${total} pending fee reminders.`}
              </p>
            </div>

            <div className="pt-4 flex items-center justify-center gap-3">
              {total > 0 && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-1.5"
                >
                  <RotateCcw size={14} /> Restart Queue
                </button>
              )}
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition"
              >
                Close Queue
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE QUEUE CARD */
          <div className="space-y-5">
            {/* Progress Counter & Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1.5">
                <span>
                  Processing Defaulter <strong className="text-indigo-600 dark:text-indigo-400">#{currentIndex + 1}</strong> of {total}
                </span>
                <span>{Math.round(((currentIndex) / total) * 100)}% Complete</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-indigo-600 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Current Student Card */}
            {current && (
              <div className="p-5 rounded-3xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">
                        {current.student_name}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 font-bold border border-gray-200 dark:border-gray-700">
                        {current.grade}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Parent: <strong className="text-gray-800 dark:text-gray-200">{current.parent_name}</strong> • 📞 {current.primary_contact}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Batch: {currentBatchNames}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Total Due</p>
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      ₹{current.pending_due.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Months Due Badges */}
                {unpaidMonths.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Months Pending
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {unpaidMonths.map((mb, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        >
                          {mb.month_name} ({mb.status}): ₹{mb.due_amount}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft size={14} /> Prev
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <SkipForward size={14} /> Skip
                </button>

                <button
                  type="button"
                  onClick={handleSendAndNext}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <Share2 size={15} />
                  Send WhatsApp & Next <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
