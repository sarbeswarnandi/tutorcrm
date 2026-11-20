"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
        <AlertTriangle size={28} />
      </div>

      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Something went wrong on this page
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
        {error.message || "An unexpected error occurred while rendering this section."}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <RotateCcw size={16} />
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold transition-colors"
        >
          Reload Page
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-8">
        Other sections (Dashboard, Students, Attendance) continue to operate normally via the sidebar.
      </p>
    </div>
  );
}
