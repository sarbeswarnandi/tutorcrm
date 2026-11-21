"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CollapsibleSidebar,
  SidebarItem,
} from "@/components/ui/dashboard-with-collapsible-sidebar";
import { TEACHER_CONFIG } from "@/lib/indiaFeatures";
import { logoutUser } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  Layers,
  CalendarCheck,
  Award,
  Sun,
  Moon,
  GraduationCap,
  User,
  LogOut,
  Settings,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const accountMenuRef = useRef<HTMLDivElement>(null);

  // Initialize theme and screen-aware sidebar state
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    }

    const savedTheme = localStorage.getItem("tutor_crm_theme");
    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    } else if (savedTheme === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    }

    // Prefetch all application routes for instant sub-50ms transitions
    try {
      router.prefetch("/");
      router.prefetch("/students");
      router.prefetch("/batches");
      router.prefetch("/attendance");
      router.prefetch("/tests");
      router.prefetch("/settings");
      router.prefetch("/help");
    } catch {
      // Ignore prefetch errors in unsupported environments
    }

    // Close account dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
    setAccountMenuOpen(false);
  }, [pathname]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("tutor_crm_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("tutor_crm_theme", "light");
      }
      return next;
    });
  };

  // Determine active item from URL pathname
  let selectedId = "/";
  if (pathname.startsWith("/student")) {
    selectedId = "/students";
  } else if (pathname.startsWith("/batch")) {
    selectedId = "/batches";
  } else if (pathname.startsWith("/attend")) {
    selectedId = "/attendance";
  } else if (pathname.startsWith("/test")) {
    selectedId = "/tests";
  } else if (pathname.startsWith("/settings")) {
    selectedId = "/settings";
  } else if (pathname.startsWith("/help")) {
    selectedId = "/help";
  } else if (pathname === "/" || pathname.startsWith("/dashboard")) {
    selectedId = "/";
  }

  const handleSelect = (id: string) => {
    router.push(id);
  };

  const sidebarItems: SidebarItem[] = [
    {
      id: "/",
      title: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "/students",
      title: "Students",
      icon: Users,
    },
    {
      id: "/batches",
      title: "Batches",
      icon: Layers,
    },
    {
      id: "/attendance",
      title: "Attendance",
      icon: CalendarCheck,
    },
    {
      id: "/tests",
      title: "Tests & Marks",
      icon: Award,
    },
  ];

  // Mobile bottom dock items including Settings
  const mobileDockItems: SidebarItem[] = [
    ...sidebarItems,
    {
      id: "/settings",
      title: "Settings",
      icon: Settings,
    },
  ];

  const brandIcon = (
    <div className="grid size-10 shrink-0 place-content-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm text-white">
      <GraduationCap size={22} />
    </div>
  );

  // Headers for current page
  const pageHeaders: Record<string, { title: string; subtitle: string }> = {
    "/": {
      title: "Dashboard",
      subtitle: "Tuition performance overview, financial metrics & recent fee transactions.",
    },
    "/students": {
      title: "Students Directory",
      subtitle: "Manage student profiles, batches, dues, and 1-click WhatsApp receipts.",
    },
    "/batches": {
      title: "Batches Management",
      subtitle: "Organize coaching classes, timings, monthly fee rates, and student enrollments.",
    },
    "/attendance": {
      title: "Attendance Register",
      subtitle: "Mark daily batch attendance and view student attendance logs.",
    },
    "/tests": {
      title: "Tests & Academic Marks",
      subtitle: "Track exam scores, batch statistics, auto-ranks, and 1-click WhatsApp scorecards.",
    },
    "/settings": {
      title: "System Settings",
      subtitle: "Configure timezone, tutor profile, UPI handle & application theme.",
    },
    "/help": {
      title: "Help & Support",
      subtitle: "Frequently asked questions, guides, and instant WhatsApp support.",
    },
  };

  let currentHeader = pageHeaders[selectedId];
  if (!currentHeader) {
    if (pathname.startsWith("/students/")) {
      currentHeader = {
        title: "Student 360° Profile",
        subtitle: "Academic performance, attendance records, financial ledger, and private notes.",
      };
    } else {
      currentHeader = {
        title: "TutorCRM",
        subtitle: "Zero-Budget Tuition & Student Manager",
      };
    }
  }

  // If viewing the login page, render without the main AppShell
  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  return (
    <div className={`flex min-h-screen w-full ${isDark ? "dark" : ""}`}>
      <div className="flex w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors relative">
        {/* Persistent Collapsible Sidebar - Desktop & Tablet Only (Hidden on Mobile) */}
        <div className="hidden md:flex shrink-0">
          <CollapsibleSidebar
            open={sidebarOpen}
            setOpen={setSidebarOpen}
            selected={selectedId}
            setSelected={handleSelect}
            items={sidebarItems}
            brandTitle="TutorCRM"
            brandSubtitle="Zero-Budget Manager"
            brandIcon={brandIcon}
          />
        </div>

        {/* Mobile Slide-Out Drawer Navigation (Phone Only) */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Slide-in Drawer Container */}
            <div className="relative w-72 max-w-[80vw] bg-white dark:bg-gray-900 h-full p-4 flex flex-col justify-between shadow-2xl z-10 border-r border-gray-200 dark:border-gray-800">
              <div className="space-y-4">
                {/* Drawer Header with Close Button */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 grid place-content-center rounded-xl bg-indigo-600 text-white shadow-xs">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                        TutorCRM
                      </h2>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        Zero-Budget Manager
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Main Nav Items */}
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Menu
                  </div>
                  {sidebarItems.map((item) => {
                    const isActive = selectedId === item.id;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.id}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                      >
                        <Icon size={18} />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Account Section in Drawer (Settings & Help & Support) */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
                  <div className="px-2 py-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Account
                  </div>

                  <Link
                    href="/settings"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedId === "/settings"
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Settings size={18} />
                    <span>Settings</span>
                  </Link>

                  <Link
                    href="/help"
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      selectedId === "/help"
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <HelpCircle size={18} />
                    <span>Help & Support</span>
                  </Link>
                </div>
              </div>

              {/* Drawer Footer with Tutor Info & Logout */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
                <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                      {TEACHER_CONFIG.name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">
                      {TEACHER_CONFIG.upiId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    className="flex-1 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isDark ? <Sun size={15} /> : <Moon size={15} />}
                    <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
                  </button>

                  <button
                    onClick={logoutUser}
                    className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <LogOut size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] md:h-screen overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Mobile Drawer Toggle (Hamburger on Phone) */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                title="Open Navigation Menu"
                className="md:hidden size-9 grid place-content-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-100 transition cursor-pointer shrink-0"
              >
                <Menu size={19} />
              </button>

              <div>
                <h1 className="text-sm sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {currentHeader.title}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
                  {currentHeader.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Teacher Profile Pill with Interactive Account Dropdown (Works on Both Phone & PC) */}
              <div className="relative" ref={accountMenuRef}>
                <button
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                  title="Account Menu (Settings & Support)"
                >
                  <div className="size-7 sm:size-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                    <User size={15} />
                  </div>
                  <div className="hidden sm:block text-left">
                    <span className="block text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                      {TEACHER_CONFIG.name}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-mono">
                      {TEACHER_CONFIG.upiId}
                    </span>
                  </div>
                  <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
                </button>

                {/* Account Menu Dropdown */}
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                        {TEACHER_CONFIG.name}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono truncate mt-0.5">
                        {TEACHER_CONFIG.upiId}
                      </p>
                      <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                        Administrator
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/settings"
                        onClick={() => setAccountMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                      >
                        <Settings size={15} className="text-gray-500" />
                        <span>Settings</span>
                      </Link>

                      <Link
                        href="/help"
                        onClick={() => setAccountMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
                      >
                        <HelpCircle size={15} className="text-gray-500" />
                        <span>Help & Support</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={logoutUser}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                      >
                        <LogOut size={15} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Secure Logout Button */}
              <button
                onClick={logoutUser}
                title="Log out from TutorCRM"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          {/* Page View Body */}
          <main className="flex-1 p-3.5 sm:p-6 pb-28 md:pb-6 max-w-7xl w-full mx-auto">
            {children}
          </main>

          {/* Mobile Bottom Navigation Bar (App-like touch experience with Settings included) */}
          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 md:hidden flex justify-around items-center py-1.5 px-1 shadow-lg pb-[calc(0.4rem+env(safe-area-inset-bottom,0px))]">
            {mobileDockItems.map((item) => {
              const isActive = selectedId === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.id}
                  className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg text-[10px] transition-colors cursor-pointer ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                  }`}
                >
                  <Icon size={17} className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"} />
                  <span className="mt-0.5 tracking-tight">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
