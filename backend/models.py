import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Float,
    Integer,
    Date,
    DateTime,
    ForeignKey,
    Text,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Student(Base):
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_name = Column(String(100), nullable=False, index=True)
    parent_name = Column(String(100), nullable=False)
    primary_contact = Column(String(15), nullable=False, index=True)
    grade = Column(String(20), nullable=False)
    school_or_board = Column(String(100), nullable=False)
    date_of_joining = Column(Date, default=date.today, nullable=False)
    is_active = Column(Boolean, default=True, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student_batches = relationship("StudentBatch", back_populates="student", cascade="all, delete-orphan", lazy="selectin")
    payments = relationship("FeePayment", back_populates="student", cascade="all, delete-orphan", lazy="selectin")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan", lazy="selectin")
    test_scores = relationship("TestScore", back_populates="student", cascade="all, delete-orphan", lazy="selectin")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    subject = Column(String(60), nullable=False)
    grade = Column(String(20), nullable=False)
    monthly_fee = Column(Float, nullable=False)
    billing_day_of_month = Column(Integer, default=1)
    whatsapp_group_link = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student_batches = relationship("StudentBatch", back_populates="batch", cascade="all, delete-orphan", lazy="selectin")
    attendance_records = relationship("Attendance", back_populates="batch", cascade="all, delete-orphan", lazy="selectin")
    tests = relationship("TestExam", back_populates="batch", cascade="all, delete-orphan", lazy="selectin")

class StudentBatch(Base):
    __tablename__ = "student_batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_at = Column(Date, default=date.today)
    custom_monthly_fee = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)

    student = relationship("Student", back_populates="student_batches")
    batch = relationship("Batch", back_populates="student_batches", lazy="joined")

class FeePayment(Base):
    __tablename__ = "fee_payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"), nullable=True)
    amount_paid = Column(Float, nullable=False)
    payment_date = Column(Date, default=date.today, nullable=False, index=True)
    payment_mode = Column(String(20), default="UPI", nullable=False)  # 'UPI', 'CASH', 'BANK_TRANSFER'
    reference_id = Column(String(100), nullable=True)
    month_for = Column(String(20), nullable=True) # e.g. "Oct 2026", "Nov 2026"
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="payments")
    batch = relationship("Batch", lazy="joined")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    attendance_date = Column(Date, default=date.today, nullable=False, index=True)
    status = Column(String(10), default="PRESENT", nullable=False) # 'PRESENT', 'ABSENT', 'LATE'
    notes = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("batch_id", "student_id", "attendance_date", name="uq_batch_student_date"),
    )

    student = relationship("Student", back_populates="attendance_records")
    batch = relationship("Batch", back_populates="attendance_records")


class TestExam(Base):
    __tablename__ = "test_exams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    subject = Column(String(60), nullable=False)
    max_marks = Column(Float, nullable=False)
    exam_date = Column(Date, default=date.today, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    batch = relationship("Batch", back_populates="tests", lazy="joined")
    scores = relationship("TestScore", back_populates="test", cascade="all, delete-orphan", lazy="selectin")


class TestScore(Base):
    __tablename__ = "test_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    test_id = Column(String(36), ForeignKey("test_exams.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    marks_obtained = Column(Float, nullable=False, default=0.0)
    is_absent = Column(Boolean, default=False, nullable=False)
    remarks = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("test_id", "student_id", name="uq_test_student"),
    )

    # Relationships
    test = relationship("TestExam", back_populates="scores")
    student = relationship("Student", back_populates="test_scores", lazy="joined")

