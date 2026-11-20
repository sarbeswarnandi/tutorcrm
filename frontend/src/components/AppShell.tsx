"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
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
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
  }, []);

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

        {/* Main Content Container */}
        <div className="flex-1 flex flex-col min-w-0 h-[100dvh] md:h-screen overflow-y-auto overflow-x-hidden">
          {/* Header */}
          <header className="sticky top-0 z-20 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="md:hidden size-8 grid place-content-center rounded-lg bg-indigo-600 text-white shadow-xs shrink-0">
                <GraduationCap size={18} />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {currentHeader.title}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 hidden sm:block">
                  {currentHeader.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                {isDark ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* Teacher Profile Pill */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-800">
                <div className="size-7 sm:size-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                  <User size={15} />
                </div>
                <div className="hidden md:block text-left">
                  <span className="block text-xs font-semibold text-gray-800 dark:text-gray-200 leading-tight">
                    {TEACHER_CONFIG.name}
                  </span>
                  <span className="block text-[10px] text-gray-400 font-mono">
                    {TEACHER_CONFIG.upiId}
                  </span>
                </div>
              </div>

              {/* Secure Logout Button */}
              <button
                onClick={logoutUser}
                title="Log out from TutorCRM"
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          </header>

          {/* Page View Body */}
          <main className="flex-1 p-3.5 sm:p-6 pb-28 md:pb-6 max-w-7xl w-full mx-auto">
            {children}
          </main>

          {/* Mobile Bottom Navigation Bar (App-like touch experience) */}
          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-800 md:hidden flex justify-around items-center py-2 px-1 shadow-lg pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
            {sidebarItems.map((item) => {
              const isActive = selectedId === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] transition-colors cursor-pointer ${
                    isActive
                      ? "text-indigo-600 dark:text-indigo-400 font-bold"
                      : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"} />
                  <span className="mt-0.5">{item.title}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
