-- Supabase PostgreSQL Schema for TutorCRM (Production-Hardened)
-- Run this in Supabase -> SQL Editor if needed (FastAPI also auto-manages tables)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Batches
CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    subject VARCHAR(60) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    monthly_fee NUMERIC(10, 2) NOT NULL,
    billing_day_of_month INT DEFAULT 1,
    whatsapp_group_link VARCHAR(255) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(36) PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    parent_name VARCHAR(100) NOT NULL,
    primary_contact VARCHAR(15) NOT NULL,
    grade VARCHAR(20) NOT NULL,
    school_or_board VARCHAR(100) NOT NULL,
    date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student-Batch Junction
CREATE TABLE IF NOT EXISTS student_batches (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    batch_id VARCHAR(36) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
    custom_monthly_fee NUMERIC(10, 2) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(student_id, batch_id)
);

-- Payments / Transaction Ledger
CREATE TABLE IF NOT EXISTS fee_payments (
    id VARCHAR(36) PRIMARY KEY,
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    batch_id VARCHAR(36) REFERENCES batches(id) ON DELETE SET NULL,
    amount_paid NUMERIC(10, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'UPI', -- 'UPI', 'CASH', 'BANK_TRANSFER'
    reference_id VARCHAR(100),
    month_for VARCHAR(20), -- e.g. 'Nov 2026'
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(10) NOT NULL DEFAULT 'PRESENT', -- 'PRESENT', 'ABSENT', 'LATE'
    notes VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_batch_student_date UNIQUE(batch_id, student_id, attendance_date)
);

-- Academic Engine: Test Exams
CREATE TABLE IF NOT EXISTS test_exams (
    id VARCHAR(36) PRIMARY KEY,
    batch_id VARCHAR(36) NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    subject VARCHAR(60) NOT NULL,
    max_marks NUMERIC(6, 2) NOT NULL CHECK (max_marks > 0),
    exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic Engine: Test Scores
CREATE TABLE IF NOT EXISTS test_scores (
    id VARCHAR(36) PRIMARY KEY,
    test_id VARCHAR(36) NOT NULL REFERENCES test_exams(id) ON DELETE CASCADE,
    student_id VARCHAR(36) NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(6, 2) NOT NULL DEFAULT 0.0 CHECK (marks_obtained >= 0),
    is_absent BOOLEAN NOT NULL DEFAULT FALSE,
    remarks VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_test_student UNIQUE(test_id, student_id)
);

-- Indexes for 100+ High Scale Performance
CREATE INDEX IF NOT EXISTS idx_students_contact ON students(primary_contact);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_fee_payments_date ON fee_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_batch_date ON attendance(batch_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_test_exams_batch ON test_exams(batch_id, exam_date DESC);
CREATE INDEX IF NOT EXISTS idx_test_scores_test ON test_scores(test_id);
CREATE INDEX IF NOT EXISTS idx_test_scores_student ON test_scores(student_id);
