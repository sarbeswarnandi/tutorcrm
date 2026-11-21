// TutorCRM Timezone System
// Default: Indian Standard Time (IST - Asia/Kolkata)
// Fully configurable via Settings page and persisted across devices/sessions

export interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  city: string;
}

export const TIMEZONES: TimezoneOption[] = [
  { value: "Asia/Kolkata", label: "India Standard Time (IST)", offset: "UTC+05:30", city: "New Delhi / Mumbai / Kolkata" },
  { value: "Asia/Dubai", label: "Gulf Standard Time (GST)", offset: "UTC+04:00", city: "Dubai / Abu Dhabi" },
  { value: "Asia/Singapore", label: "Singapore / Malaysia (SGT)", offset: "UTC+08:00", city: "Singapore / Kuala Lumpur" },
  { value: "Asia/Dhaka", label: "Bangladesh Time (BST)", offset: "UTC+06:00", city: "Dhaka" },
  { value: "Asia/Kathmandu", label: "Nepal Time (NPT)", offset: "UTC+05:45", city: "Kathmandu" },
  { value: "Asia/Riyadh", label: "Arabia Standard Time (AST)", offset: "UTC+03:00", city: "Riyadh / Doha" },
  { value: "Europe/London", label: "UK / London (GMT/BST)", offset: "UTC+00:00", city: "London" },
  { value: "Europe/Paris", label: "Central Europe (CET)", offset: "UTC+01:00", city: "Paris / Berlin" },
  { value: "America/New_York", label: "US Eastern Time (EST/EDT)", offset: "UTC-05:00", city: "New York / Toronto" },
  { value: "America/Chicago", label: "US Central Time (CST/CDT)", offset: "UTC-06:00", city: "Chicago" },
  { value: "America/Los_Angeles", label: "US Pacific Time (PST/PDT)", offset: "UTC-08:00", city: "San Francisco / LA" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (AEST)", offset: "UTC+10:00", city: "Sydney / Melbourne" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)", offset: "UTC+00:00", city: "Universal" },
];

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const STORAGE_KEY = "tutor_crm_timezone";

/**
 * Returns the currently active timezone identifier (defaults to Asia/Kolkata).
 */
export function getTimezone(): string {
  if (typeof window === "undefined") {
    return DEFAULT_TIMEZONE;
  }
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_TIMEZONE;
}

/**
 * Sets and persists a new timezone identifier, broadcasting the change to all listeners.
 */
export function setTimezone(tz: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, tz);
  window.dispatchEvent(new CustomEvent("tutor_timezone_changed", { detail: tz }));
}

/**
 * Safely parses any date string from backend (ensuring naive UTC strings from databases are correctly recognized as UTC).
 */
export function parseDate(val: string | Date | undefined | null): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;

  let s = String(val).trim();
  // If it looks like an ISO date-time without timezone (e.g. 2026-11-21T09:45:00), append 'Z' so it is parsed as UTC
  if (s.includes("T") && !s.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(s)) {
    s += "Z";
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formats a timestamp into a 12-hour time string (e.g. "03:45 PM") in the selected timezone.
 */
export function formatTime(val: string | Date | undefined | null, timezone?: string): string {
  if (!val) return "--:--";
  try {
    const d = parseDate(val);
    const tz = timezone || getTimezone();
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return String(val);
  }
}

/**
 * Formats a date into a clean date string (e.g. "21 Nov 2026") in the selected timezone.
 */
export function formatDate(val: string | Date | undefined | null, timezone?: string): string {
  if (!val) return "--";
  try {
    const tz = timezone || getTimezone();
    // If it's a pure YYYY-MM-DD date string without time, handle without timezone offset shift
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: tz,
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(dateObj);
    }

    const d = parseDate(val);
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return String(val);
  }
}

/**
 * Formats both date and time into a readable string (e.g. "21 Nov 2026, 03:45 PM") in the selected timezone.
 */
export function formatDateTime(val: string | Date | undefined | null, timezone?: string): string {
  if (!val) return "--";
  try {
    const d = parseDate(val);
    const tz = timezone || getTimezone();
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return String(val);
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the specified timezone (prevents midnight UTC rollovers).
 */
export function getTodayDateString(timezone?: string): string {
  const tz = timezone || getTimezone();
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }
}

/**
 * Returns current month and year string formatted e.g. "Nov 2026" in the specified timezone.
 */
export function getCurrentMonthString(timezone?: string): string {
  const tz = timezone || getTimezone();
  try {
    const d = new Date();
    const month = new Intl.DateTimeFormat("en-IN", { timeZone: tz, month: "short" }).format(d);
    const year = new Intl.DateTimeFormat("en-IN", { timeZone: tz, year: "numeric" }).format(d);
    return `${month} ${year}`;
  } catch {
    return "Nov 2026";
  }
}
