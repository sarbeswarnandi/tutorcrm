// API Client for Next.js

export interface Batch {
  id: string;
  name: string;
  subject: string;
  grade: string;
  monthly_fee: number;
  billing_day_of_month?: number;
  whatsapp_group_link?: string | null;
  is_active?: boolean;
  student_count?: number;
}

export interface MonthStatus {
  month_name: string;
  status: "PAID" | "PARTIAL" | "DUE";
  due_amount: number;
  paid_amount: number;
}

export interface Student {
  id: string;
  student_name: string;
  parent_name: string;
  primary_contact: string;
  grade: string;
  school_or_board: string;
  date_of_joining: string;
  pending_due: number;
  total_paid: number;
  notes?: string | null;
  monthly_breakdown?: MonthStatus[];
  batches: { id: string; name: string; monthly_fee: number }[];
}

export interface Transaction {
  id: string;
  student_id: string;
  student_name: string;
  parent_name?: string;
  primary_contact?: string;
  batch_name?: string | null;
  amount_paid: number;
  payment_date: string;
  payment_mode: "UPI" | "CASH" | "BANK_TRANSFER";
  reference_id: string | null;
  month_for?: string | null;
  remarks: string | null;
  created_at: string;
}

export interface AttendanceStudent {
  student_id: string;
  student_name: string;
  parent_name: string;
  primary_contact: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "UNMARKED";
  notes?: string | null;
}

export interface AttendanceBatchData {
  batch_id: string;
  batch_name: string;
  attendance_date: string;
  students: AttendanceStudent[];
}

export interface Stats {
  total_active_students: number;
  total_batches: number;
  total_collected_this_month: number;
  total_pending_dues: number;
  today_attendance_summary?: Record<string, number>;
}

const RAW_BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export const BASE_URL = RAW_BACKEND ? `${RAW_BACKEND}/api/v1` : "/api/v1";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("tutor_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    // Session expired or unauthorized: redirect to login
    localStorage.removeItem("tutor_token");
    localStorage.removeItem("tutor_user");
    document.cookie = "tutor_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  return res;
}

export function logoutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("tutor_token");
    localStorage.removeItem("tutor_user");
    document.cookie = "tutor_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/login";
  }
}

export async function loginUser(username: string, password: string) {
  return fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.trim() || "admin",
      password: password,
    }),
  });
}

export async function fetchDashboardStats(): Promise<Stats> {
  const res = await authFetch(`${BASE_URL}/dashboard/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

export async function fetchStudents(batchId?: string, search?: string): Promise<Student[]> {
  const params = new URLSearchParams();
  if (batchId && batchId !== "ALL") params.append("batch_id", batchId);
  if (search) params.append("search", search);
  const res = await authFetch(`${BASE_URL}/students?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch students");
  return res.json();
}

export async function fetchBatches(): Promise<Batch[]> {
  const res = await authFetch(`${BASE_URL}/batches`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch batches");
  return res.json();
}

export async function fetchTransactions(
  limit: number = 50,
  studentId?: string,
  targetDate?: string
): Promise<Transaction[]> {
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (studentId) params.append("student_id", studentId);
  if (targetDate) params.append("target_date", targetDate);
  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await authFetch(`${BASE_URL}/fees/ledger${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function recordFeePayment(data: {
  student_id: string;
  batch_id?: string;
  amount_paid: number;
  payment_mode: string;
  reference_id?: string;
  month_for?: string;
  remarks?: string;
}) {
  const res = await authFetch(`${BASE_URL}/fees/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to record fee");
  return res.json();
}

export async function createStudent(data: any) {
  const res = await authFetch(`${BASE_URL}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create student");
  return res.json();
}

export async function updateStudent(id: string, data: any) {
  const res = await authFetch(`${BASE_URL}/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update student");
  return res.json();
}

export async function deleteStudent(id: string) {
  const res = await authFetch(`${BASE_URL}/students/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete student");
  return res.json();
}

export async function createBatch(data: any) {
  const res = await authFetch(`${BASE_URL}/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create batch");
  return res.json();
}

export async function updateBatch(id: string, data: any) {
  const res = await authFetch(`${BASE_URL}/batches/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update batch");
  return res.json();
}

export async function deleteBatch(id: string) {
  const res = await authFetch(`${BASE_URL}/batches/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete batch");
  return res.json();
}

export async function updateBatchWhatsAppLink(id: string, whatsapp_group_link: string | null) {
  const res = await authFetch(`${BASE_URL}/batches/${id}/whatsapp-link`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ whatsapp_group_link }),
  });
  if (!res.ok) throw new Error("Failed to update WhatsApp link");
  return res.json();
}

export async function fetchBatchAttendance(batchId: string, dateStr?: string): Promise<AttendanceBatchData> {
  const query = dateStr ? `?att_date=${dateStr}` : "";
  const res = await authFetch(`${BASE_URL}/attendance/${batchId}${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch batch attendance");
  return res.json();
}

export async function saveBatchAttendance(payload: {
  batch_id: string;
  attendance_date: string;
  records: { student_id: string; status: string; notes?: string | null }[];
}) {
  const res = await authFetch(`${BASE_URL}/attendance/bulk-save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save attendance");
  return res.json();
}

// ----------------- CSV DATA EXPORT HELPERS -----------------
export async function downloadCsv(endpoint: string, fallbackFileName: string) {
  const res = await authFetch(`${BASE_URL}/${endpoint}`);
  if (!res.ok) throw new Error("Failed to export data");

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function exportStudentsCsv() {
  const today = new Date().toISOString().split("T")[0];
  return downloadCsv("export/students", `students_backup_${today}.csv`);
}

export async function exportFeesCsv() {
  const today = new Date().toISOString().split("T")[0];
  return downloadCsv("export/fees", `fee_ledger_backup_${today}.csv`);
}

// ----------------- ACADEMIC ENGINE: TESTS & MARKS -----------------
export interface TestExam {
  id: string;
  batch_id: string;
  batch_name?: string;
  title: string;
  subject: string;
  max_marks: number;
  exam_date: string;
  created_at: string;
  highest_score?: number | null;
  average_score?: number | null;
  total_students_tested: number;
  total_enrolled: number;
}

export interface StudentTestScore {
  student_id: string;
  student_name: string;
  parent_name: string;
  primary_contact: string;
  marks_obtained: number;
  is_absent: boolean;
  remarks?: string | null;
  rank?: number | null;
  percentage?: number | null;
}

export interface TestExamDetail {
  exam: TestExam;
  scores: StudentTestScore[];
}

export async function fetchTests(batchId?: string): Promise<TestExam[]> {
  const query = batchId && batchId !== "ALL" ? `?batch_id=${batchId}` : "";
  const res = await authFetch(`${BASE_URL}/tests${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tests");
  return res.json();
}

export async function createTest(data: {
  batch_id: string;
  title: string;
  subject: string;
  max_marks: number;
  exam_date?: string;
}): Promise<TestExam> {
  const res = await authFetch(`${BASE_URL}/tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create test");
  return res.json();
}

export async function fetchTestScores(testId: string): Promise<TestExamDetail> {
  const res = await authFetch(`${BASE_URL}/tests/${testId}/scores`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch test scores");
  return res.json();
}

export async function saveTestScores(
  testId: string,
  scores: { student_id: string; marks_obtained: number; is_absent: boolean; remarks?: string | null }[]
): Promise<TestExamDetail> {
  const res = await authFetch(`${BASE_URL}/tests/${testId}/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scores }),
  });
  if (!res.ok) throw new Error("Failed to save test scores");
  return res.json();
}

export async function deleteTest(testId: string) {
  const res = await authFetch(`${BASE_URL}/tests/${testId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete test");
  return res.json();
}

// ----------------- STUDENT 360 PROFILE -----------------
export interface StudentAcademicTestItem {
  test_id: string;
  test_title: string;
  subject: string;
  batch_name: string;
  exam_date: string;
  max_marks: number;
  marks_obtained: number;
  percentage: number;
  rank?: number | null;
  is_absent: boolean;
  highest_in_class?: number | null;
  average_in_class?: number | null;
  total_students: number;
  remarks?: string | null;
}

export interface StudentProfile360 {
  student: Student;
  batches: { id: string; name: string; monthly_fee: number }[];
  financials: {
    total_expected: number;
    total_paid: number;
    pending_due: number;
    monthly_breakdown: MonthStatus[];
    payments: Transaction[];
  };
  attendance: {
    total_sessions: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    attendance_percentage: number;
    recent_absent_dates: { date: string; batch_name: string; notes: string }[];
    all_records?: { date: string; batch_name: string; status: string; notes: string }[];
  };
  academic_tests: StudentAcademicTestItem[];
}

export async function fetchStudentProfile(studentId: string): Promise<StudentProfile360> {
  const res = await authFetch(`${BASE_URL}/students/${studentId}/profile`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch student profile");
  return res.json();
}

export async function updateStudentNotes(studentId: string, notes: string | null) {
  const res = await authFetch(`${BASE_URL}/students/${studentId}/notes`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error("Failed to update student notes");
  return res.json();
}

// ----------------- ATTENDANCE ANALYTICS -----------------
export interface AttendanceStudentSummaryItem {
  student_id: string;
  student_name: string;
  parent_name: string;
  primary_contact: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  attendance_percentage: number;
}

export interface MonthlyAttendanceSummary {
  batch_id: string;
  batch_name: string;
  month: string;
  total_batch_sessions: number;
  students: AttendanceStudentSummaryItem[];
}

export async function fetchMonthlyAttendanceSummary(batchId: string, month?: string): Promise<MonthlyAttendanceSummary> {
  const query = month ? `?batch_id=${batchId}&month=${month}` : `?batch_id=${batchId}`;
  const res = await authFetch(`${BASE_URL}/attendance/summary${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch monthly attendance summary");
  return res.json();
}

