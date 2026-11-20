"use client";

import React, { useState, useEffect, useCallback } from "react";
import StudentManagementView from "@/components/StudentManagementView";
import { fetchStudents, fetchBatches, Student, Batch } from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";

export default function StudentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [stData, bData] = await Promise.all([
        fetchStudents(),
        fetchBatches(),
      ]);
      setStudents(stData);
      setBatches(bData);
    } catch (err: any) {
      console.error("Students fetch error:", err);
      setError(
        "Could not load students and batches. Ensure the backend is running on http://127.0.0.1:8000."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
        <p className="text-sm font-medium">Loading Student records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-200 text-sm flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle className="size-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Backend Unreachable (Students Directory)</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{error}</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <StudentManagementView
      students={students}
      batches={batches}
      onRefresh={loadData}
    />
  );
}
