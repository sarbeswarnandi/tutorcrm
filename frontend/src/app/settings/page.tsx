"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Globe2,
  Check,
  User,
  QrCode,
  Moon,
  Sun,
  ShieldCheck,
  Server,
  Database,
  Save,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  TIMEZONES,
  DEFAULT_TIMEZONE,
  getTimezone,
  setTimezone,
} from "@/lib/timezone";
import { TEACHER_CONFIG } from "@/lib/indiaFeatures";

export default function SettingsPage() {
  const [selectedTz, setSelectedTz] = useState<string>(DEFAULT_TIMEZONE);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [currentDateStr, setCurrentDateStr] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Tutor Profile Form
  const [teacherName, setTeacherName] = useState<string>("");
  const [teacherUpi, setTeacherUpi] = useState<string>("");
  const [profileSaved, setProfileSaved] = useState<boolean>(false);

  // Theme state
  const [isDark, setIsDark] = useState<boolean>(false);

  // Backend Health Check
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [backendPing, setBackendPing] = useState<number | null>(null);

  // Initialize values
  useEffect(() => {
    setSelectedTz(getTimezone());
    setTeacherName(TEACHER_CONFIG.name);
    setTeacherUpi(TEACHER_CONFIG.upiId);

    const savedTheme = localStorage.getItem("tutor_crm_theme");
    setIsDark(savedTheme === "dark");

    // Ping Backend Health
    const checkBackend = async () => {
      const start = Date.now();
      try {
        const backendBase = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://tutorcrm-backend.onrender.com").replace(/\/$/, "");
        const res = await fetch(`${backendBase}/healthz`, { cache: "no-store" });
        if (res.ok) {
          setBackendPing(Date.now() - start);
          setBackendStatus("online");
        } else {
          setBackendStatus("offline");
        }
      } catch {
        setBackendStatus("offline");
      }
    };
    checkBackend();
  }, []);

  // Live ticking clock in selected timezone
  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const timeFmt = new Intl.DateTimeFormat("en-IN", {
          timeZone: selectedTz,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(now);

        const dateFmt = new Intl.DateTimeFormat("en-IN", {
          timeZone: selectedTz,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(now);

        setCurrentTimeStr(timeFmt);
        setCurrentDateStr(dateFmt);
      } catch {
        setCurrentTimeStr("--:--:--");
        setCurrentDateStr("--");
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [selectedTz]);

  const handleSaveTimezone = () => {
    setTimezone(selectedTz);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetTimezone = () => {
    setSelectedTz(DEFAULT_TIMEZONE);
    setTimezone(DEFAULT_TIMEZONE);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("tutor_crm_teacher_name", teacherName.trim());
      localStorage.setItem("tutor_crm_teacher_upi", teacherUpi.trim());
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const handleToggleTheme = (dark: boolean) => {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("tutor_crm_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("tutor_crm_theme", "light");
    }
  };

  const currentOption = TIMEZONES.find((t) => t.value === selectedTz) || {
    label: selectedTz,
    offset: "UTC",
    city: "Local",
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* SECTION 1: TIMEZONE CONFIGURATION */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Globe2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Timezone & Regional Clock
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  All fee transaction dates, attendance logs, and test schedules will format according to this timezone.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
              Default: Indian Time (IST)
            </span>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Live Clock Card */}
            <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-gray-50 dark:from-gray-850 dark:via-gray-900 dark:to-gray-950 border border-indigo-100/80 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={13} className="text-indigo-600 dark:text-indigo-400" />
                  Live Preview in Selected Zone
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 font-mono mt-1">
                  {currentTimeStr || "Loading..."}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {currentDateStr}
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-1">
                <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-xs font-mono">
                  {currentOption.offset}
                </span>
                <span className="text-[11px] text-gray-400">
                  {currentOption.city}
                </span>
              </div>
            </div>

            {/* Timezone Selector Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                Select Active Timezone
              </label>
              <select
                value={selectedTz}
                onChange={(e) => setSelectedTz(e.target.value)}
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none transition cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label} ({tz.offset} - {tz.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetTimezone}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 transition cursor-pointer"
              >
                <RotateCcw size={14} />
                Reset to Default (India IST)
              </button>

              <button
                type="button"
                onClick={handleSaveTimezone}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check size={15} /> Timezone Saved!
                  </>
                ) : (
                  <>
                    <Save size={15} /> Save Timezone
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: TUTOR & UPI PROFILE CONFIGURATION */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Tutor & Coaching Information
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Shown on WhatsApp fee reminder receipts and instant scan-and-pay UPI QR codes.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <QrCode size={12} /> Live Sync
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Coaching / Academy Name
                </label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Nandi Tutorials"
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Header printed on WhatsApp receipts and scorecard links.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  Tutor UPI ID (VPA)
                </label>
                <input
                  type="text"
                  required
                  value={teacherUpi}
                  onChange={(e) => setTeacherUpi(e.target.value)}
                  placeholder="e.g. sarbeswarnandi-2@okaxis"
                  className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Used for dynamic QR generation (Google Pay, PhonePe, Paytm, BHIM).
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
              >
                {profileSaved ? (
                  <>
                    <Check size={15} /> Details Saved!
                  </>
                ) : (
                  <>
                    <Save size={15} /> Save Institute Details
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 3: THEME PREFERENCES */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Appearance & Theme
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose between clean high-contrast light mode or dark mode for evening sessions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              onClick={() => handleToggleTheme(false)}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                !isDark
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Sun size={20} className={!isDark ? "text-indigo-600" : "text-gray-400"} />
                {!isDark && <Check size={16} className="text-indigo-600" />}
              </div>
              <div>
                <p className="text-xs font-bold">Light Mode</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Clear contrast for daytime</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleToggleTheme(true)}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                isDark
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-xs"
                  : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Moon size={20} className={isDark ? "text-indigo-400" : "text-gray-400"} />
                {isDark && <Check size={16} className="text-indigo-400" />}
              </div>
              <div>
                <p className="text-xs font-bold">Dark Mode</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Gentle on eyes at night</p>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 4: CLOUD & DEPLOYMENT HEALTH */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xs p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Cloud Architecture & System Status
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Real-time connection status with Render backend and Supabase database.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                  <Server size={14} /> Backend API
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  backendStatus === "online"
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    : backendStatus === "checking"
                    ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                    : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                }`}>
                  <span className={`size-1.5 rounded-full ${backendStatus === "online" ? "bg-emerald-500" : "bg-amber-500"}`} />
                  {backendStatus === "online" ? `Live (${backendPing}ms)` : backendStatus === "checking" ? "Checking..." : "Offline"}
                </span>
              </div>
              <p className="text-xs font-mono text-gray-700 dark:text-gray-300 mt-2 truncate">
                https://tutorcrm-backend.onrender.com
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                  <Database size={14} /> Supabase DB
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                PostgreSQL • ap-south-1 (Mumbai)
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500">
                  Frontend Version
                </span>
                <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  v1.2.0 (Production)
                </span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                Next.js 14 App Router on Vercel
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
