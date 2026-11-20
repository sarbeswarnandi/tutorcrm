from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum

class PaymentMode(str, Enum):
    CASH = "CASH"
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"

# ----------------- AUTH SCHEMAS -----------------
class LoginRequest(BaseModel):
    username: Optional[str] = "admin" # Accepts username, 10-digit mobile, or email
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[str] = "admin"
    message: str = "Login successful"

# ----------------- BATCH SCHEMAS -----------------
class BatchBase(BaseModel):
    name: str
    subject: str
    grade: str
    monthly_fee: float = Field(..., gt=0)
    billing_day_of_month: int = Field(default=1, ge=1, le=28)
    whatsapp_group_link: Optional[str] = None

class BatchCreate(BatchBase):
    pass

class BatchUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    grade: Optional[str] = None
    monthly_fee: Optional[float] = Field(None, gt=0)
    billing_day_of_month: Optional[int] = Field(None, ge=1, le=28)
    whatsapp_group_link: Optional[str] = None

class BatchWhatsAppLinkIn(BaseModel):
    whatsapp_group_link: Optional[str] = None

class BatchOut(BatchBase):
    id: str
    is_active: bool = True
    student_count: int = 0
    created_at: datetime
    model_config = {"from_attributes": True}

class BatchSimpleOut(BaseModel):
    id: str
    name: str
    monthly_fee: float
    whatsapp_group_link: Optional[str] = None
    model_config = {"from_attributes": True}

# ----------------- STUDENT SCHEMAS -----------------
class MonthStatus(BaseModel):
    month_name: str # e.g. "Nov 2026"
    status: str     # "PAID", "PARTIAL", "DUE"
    due_amount: float
    paid_amount: float

class StudentBase(BaseModel):
    student_name: str
    parent_name: str
    primary_contact: str = Field(..., description="10-digit mobile number")
    grade: str
    school_or_board: str
    date_of_joining: date = Field(default_factory=date.today)
    is_active: bool = True
    notes: Optional[str] = None

class StudentCreate(StudentBase):
    batch_ids: List[str] = Field(default_factory=list)

class StudentUpdate(BaseModel):
    student_name: Optional[str] = None
    parent_name: Optional[str] = None
    primary_contact: Optional[str] = None
    grade: Optional[str] = None
    school_or_board: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    batch_ids: Optional[List[str]] = None

class StudentOut(StudentBase):
    id: str
    batches: List[BatchSimpleOut] = []
    pending_due: float = 0.0
    total_paid: float = 0.0
    monthly_breakdown: List[MonthStatus] = []
    created_at: datetime
    model_config = {"from_attributes": True}

# ----------------- FEE SCHEMAS -----------------
class FeePaymentCreate(BaseModel):
    student_id: str
    batch_id: Optional[str] = None
    amount_paid: float = Field(..., gt=0)
    payment_date: date = Field(default_factory=date.today)
    payment_mode: PaymentMode = PaymentMode.UPI
    reference_id: Optional[str] = None
    month_for: Optional[str] = None
    remarks: Optional[str] = None

class FeePaymentOut(BaseModel):
    id: str
    student_id: str
    student_name: str
    parent_name: Optional[str] = None
    primary_contact: Optional[str] = None
    batch_name: Optional[str] = None
    amount_paid: float
    payment_date: date
    payment_mode: str
    reference_id: Optional[str] = None
    month_for: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}

# ----------------- ATTENDANCE SCHEMAS -----------------
class AttendanceRecordIn(BaseModel):
    student_id: str
    status: str = "PRESENT" # PRESENT, ABSENT, LATE
    notes: Optional[str] = None

class BatchAttendanceBulkSave(BaseModel):
    batch_id: str
    attendance_date: date
    records: List[AttendanceRecordIn]

class AttendanceStudentOut(BaseModel):
    student_id: str
    student_name: str
    parent_name: str
    primary_contact: str
    status: str # "PRESENT", "ABSENT", "LATE", or "UNMARKED"
    notes: Optional[str] = None

class AttendanceBatchViewOut(BaseModel):
    batch_id: str
    batch_name: str
    attendance_date: date
    students: List[AttendanceStudentOut]

# ----------------- DASHBOARD STATS -----------------
class DashboardStats(BaseModel):
    total_active_students: int
    total_batches: int
    total_collected_this_month: float
    total_pending_dues: float
    today_attendance_summary: Optional[dict] = None

# ----------------- TEST & EXAM SCHEMAS -----------------
class TestExamBase(BaseModel):
    title: str
    subject: str
    max_marks: float = Field(..., gt=0)
    exam_date: date = Field(default_factory=date.today)

class TestExamCreate(TestExamBase):
    batch_id: str

class TestExamOut(TestExamBase):
    id: str
    batch_id: str
    batch_name: Optional[str] = None
    created_at: datetime
    highest_score: Optional[float] = None
    average_score: Optional[float] = None
    total_students_tested: int = 0
    total_enrolled: int = 0
    model_config = {"from_attributes": True}

class StudentTestScoreOut(BaseModel):
    student_id: str
    student_name: str
    parent_name: str
    primary_contact: str
    marks_obtained: float
    is_absent: bool = False
    remarks: Optional[str] = None
    rank: Optional[int] = None
    percentage: Optional[float] = None
    model_config = {"from_attributes": True}

class TestExamDetailOut(BaseModel):
    exam: TestExamOut
    scores: List[StudentTestScoreOut]

class BulkScoreItem(BaseModel):
    student_id: str
    marks_obtained: float = Field(default=0.0, ge=0)
    is_absent: bool = False
    remarks: Optional[str] = None

class BulkScoreSaveRequest(BaseModel):
    scores: List[BulkScoreItem]

# ----------------- STUDENT 360 PROFILE SCHEMAS -----------------
class StudentNoteUpdate(BaseModel):
    notes: Optional[str] = None

class StudentTestHistoryItem(BaseModel):
    test_id: str
    test_title: str
    subject: str
    batch_name: str
    exam_date: date
    max_marks: float
    marks_obtained: float
    percentage: float
    rank: Optional[int] = None
    is_absent: bool = False
    highest_in_class: Optional[float] = None
    average_in_class: Optional[float] = None
    total_students: int = 0
    remarks: Optional[str] = None

class StudentAttendanceStats(BaseModel):
    total_sessions: int = 0
    present_count: int = 0
    absent_count: int = 0
    late_count: int = 0
    attendance_percentage: float = 0.0
    recent_absent_dates: List[dict] = []
    all_records: List[dict] = []

class StudentFinancialStats(BaseModel):
    total_expected: float = 0.0
    total_paid: float = 0.0
    pending_due: float = 0.0
    monthly_breakdown: List[MonthStatus] = []
    payments: List[FeePaymentOut] = []

class StudentProfile360Out(BaseModel):
    student: StudentOut
    batches: List[BatchSimpleOut] = []
    financials: StudentFinancialStats
    attendance: StudentAttendanceStats
    academic_tests: List[StudentTestHistoryItem] = []

# ----------------- MONTHLY ATTENDANCE SUMMARY -----------------
class AttendanceStudentSummaryItem(BaseModel):
    student_id: str
    student_name: str
    parent_name: str
    primary_contact: str
    total_days: int = 0
    present_days: int = 0
    absent_days: int = 0
    late_days: int = 0
    attendance_percentage: float = 0.0

class MonthlyAttendanceSummaryOut(BaseModel):
    batch_id: str
    batch_name: str
    month: str # e.g. "2026-11"
    total_batch_sessions: int = 0
    students: List[AttendanceStudentSummaryItem] = []

