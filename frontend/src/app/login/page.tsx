"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Lock,
  GraduationCap,
  ArrowRight,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { loginUser } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fillQuickCredentials = (userVal: string) => {
    setUsername(userVal);
    setPassword("Coach1234");
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await loginUser(username, password);

      // Safely parse JSON or text error without crashing on HTML
      let responseData: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          responseData = await res.json();
        } catch {
          responseData = {};
        }
      } else {
        const text = await res.text().catch(() => "");
        if (!res.ok) {
          if (res.status === 500) {
            throw new Error(
              "Cannot connect to backend server. Please verify backend is running."
            );
          }
          throw new Error(
            res.status === 404
              ? "Backend API endpoint not found. Ensure FastAPI is running on port 8000."
              : `Server error (${res.status}): ${text.slice(0, 100)}`
          );
        }
      }

      if (!res.ok) {
        throw new Error(responseData.detail || "Invalid credentials or password.");
      }

      if (!responseData.access_token) {
        throw new Error("No access token returned from backend.");
      }

      // 1. Store in localStorage for client-side API requests
      localStorage.setItem("tutor_token", responseData.access_token);
      localStorage.setItem("tutor_user", responseData.user || username || "admin");

      // 2. Store in cookie for Next.js middleware and direct downloads (valid 60 days)
      const maxAge = 60 * 24 * 60 * 60;
      const secureFlag = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `tutor_token=${responseData.access_token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;

      // 3. Redirect to dashboard or previous destination
      router.push(from);
      router.refresh();
    } catch (err: any) {
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setError("Unable to connect to backend. Please ensure the backend server is running on port 8000 (run start_both.bat).");
      } else {
        setError(err.message || "Failed to log in. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
          <GraduationCap size={26} />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">
          <ShieldCheck size={13} />
          <span>Tutor Access</span>
        </div>
      </div>

      <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
        Sign In to TutorCRM
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
        Manage students, batches, fee collection & attendance across mobile & desktop.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        {/* Username / Mobile / Email Field */}
        <div>
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
            Username, Mobile Number, or Email
          </label>
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or 9876543210"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <span className="text-[11px] text-slate-400">Default: Coach1234</span>
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Quick Fill Suggestions */}
        <div className="pt-1">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles size={12} className="text-indigo-500" />
            Quick Sign-In options:
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fillQuickCredentials("admin")}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5"
            >
              <User size={12} />
              Username: <span className="font-semibold">admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials("9876543210")}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5"
            >
              <Phone size={12} />
              Mobile: <span className="font-semibold">9876543210</span>
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials("teacher@tutorcrm.com")}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5"
            >
              <Mail size={12} />
              Email: <span className="font-semibold">teacher@tutorcrm.com</span>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 mt-4 cursor-pointer"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              Sign In to Dashboard <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-8">
      <Suspense fallback={<div className="text-slate-400 text-sm">Loading login...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
