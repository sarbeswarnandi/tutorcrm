import os
from contextlib import asynccontextmanager
from datetime import date, datetime
from typing import List, Optional
import csv
import io

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, delete, update
from sqlalchemy.orm import selectinload, joinedload

from database import engine, Base, get_db, AsyncSessionLocal
import models
import schemas
import auth

def calculate_student_financials(student: models.Student) -> tuple[float, float, list]:
    """
    Computes (pending_due, total_paid, monthly_breakdown) accurately.
    Calculates expected fees per batch duration based on batch assignment date,
    preventing retroactive overcharging.
    Generates a rolling breakdown for the past 4 months.
    """
    today = date.today()
    doj = student.date_of_joining or today

    # Collect active batch enrollments with respective start date and fee
    active_batches = []
    for sb in student.student_batches:
        if sb.is_active and sb.batch and sb.batch.is_active:
            fee = sb.custom_monthly_fee if sb.custom_monthly_fee is not None else sb.batch.monthly_fee
            start_d = sb.assigned_at or doj
            active_batches.append({
                "start_year": start_d.year,
                "start_month": start_d.month,
                "monthly_fee": fee
            })

    # Total expected fee: sum of months elapsed per batch
    total_expected = 0.0
    for b in active_batches:
        months = max(1, (today.year - b["start_year"]) * 12 + (today.month - b["start_month"]) + 1)
        total_expected += months * b["monthly_fee"]

    total_paid = sum(p.amount_paid for p in student.payments)
    pending_due = max(0.0, total_expected - total_paid)

    # Generate rolling list of past up to 4 months: [(year, month)]
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    months_to_check = 4
    check_list = []
    for i in range(months_to_check - 1, -1, -1):
        total_m = (today.year * 12 + today.month - 1) - i
        y, m = divmod(total_m, 12)
        check_list.append((y, m + 1))

    # Calculate expected fee per month specifically for those 4 months
    monthly_fees = []
    for (y, m) in check_list:
        m_fee = sum(
            b["monthly_fee"] for b in active_batches
            if (b["start_year"] < y) or (b["start_year"] == y and b["start_month"] <= m)
        )
        monthly_fees.append(m_fee)

    # Allocate payments chronologically
    earlier_expected = max(0.0, total_expected - sum(monthly_fees))
    remaining_paid_pool = max(0.0, total_paid - earlier_expected)

    monthly_breakdown = []
    for idx, (y, m) in enumerate(check_list):
        m_label = f"{month_names[m - 1]} {y}"
        fee_for_month = monthly_fees[idx]
        if fee_for_month <= 0:
            monthly_breakdown.append({
                "month_name": m_label,
                "status": "PAID",
                "due_amount": 0.0,
                "paid_amount": 0.0
            })
            continue

        if remaining_paid_pool >= fee_for_month:
            monthly_breakdown.append({
                "month_name": m_label,
                "status": "PAID",
                "due_amount": 0.0,
                "paid_amount": fee_for_month
            })
            remaining_paid_pool -= fee_for_month
        elif remaining_paid_pool > 0:
            monthly_breakdown.append({
                "month_name": m_label,
                "status": "PARTIAL",
                "due_amount": fee_for_month - remaining_paid_pool,
                "paid_amount": remaining_paid_pool
            })
            remaining_paid_pool = 0.0
        else:
            monthly_breakdown.append({
                "month_name": m_label,
                "status": "DUE",
                "due_amount": fee_for_month,
                "paid_amount": 0.0
            })

    return pending_due, total_paid, monthly_breakdown

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables automatically on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Ensure schema migrations for existing local sqlite files
        def sync_sqlite_columns(connection):
            from sqlalchemy import inspect, text
            inspector = inspect(connection)
            if "students" in inspector.get_table_names():
                cols = [c["name"] for c in inspector.get_columns("students")]
                if "notes" not in cols:
                    connection.execute(text("ALTER TABLE students ADD COLUMN notes TEXT"))
            if "batches" in inspector.get_table_names():
                b_cols = [c["name"] for c in inspector.get_columns("batches")]
                if "whatsapp_group_link" not in b_cols:
                    connection.execute(text("ALTER TABLE batches ADD COLUMN whatsapp_group_link VARCHAR(255)"))
        await conn.run_sync(sync_sqlite_columns)
        
    # Seed initial sample data if completely empty
    async with AsyncSessionLocal() as session:
        check_batches = await session.execute(select(func.count(models.Batch.id)))
        if check_batches.scalar() == 0:
            b1 = models.Batch(name="Class 10 CBSE Maths", subject="Mathematics", grade="10th", monthly_fee=1500.0)
            b2 = models.Batch(name="Class 12 Physics Weekend", subject="Physics", grade="12th", monthly_fee=2200.0)
            session.add_all([b1, b2])
            await session.flush()

            s1 = models.Student(
                student_name="Aarav Sharma",
                parent_name="Rajesh Sharma",
                primary_contact="9876543210",
                grade="10th",
                school_or_board="DPS R.K. Puram / CBSE",
                date_of_joining=date(2026, 9, 1),
            )
            session.add(s1)
            await session.flush()

            sb1 = models.StudentBatch(student_id=s1.id, batch_id=b1.id)
            session.add(sb1)

            p1 = models.FeePayment(
                student_id=s1.id,
                batch_id=b1.id,
                amount_paid=1500.0,
                payment_date=date(2026, 9, 5),
                payment_mode="UPI",
                reference_id="UPI9283719283",
                month_for="Sep 2026",
                remarks="Paid for Sept 2026"
            )
            session.add(p1)
            await session.commit()
    yield

app = FastAPI(
    title="TutorCRM API",
    description="Zero-budget Tuition Management API for Independent Educators",
    version="1.1.0",
    lifespan=lifespan
)

# CORS setup (supports localhost, 127.0.0.1, LAN Wi-Fi, custom domain, Vercel, and Render)
frontend_env_url = os.getenv("FRONTEND_URL", "").strip()
allowed_origins_list = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
if frontend_env_url:
    allowed_origins_list.append(frontend_env_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.[0-9]+\.[0-9]+|.*\.vercel\.app|.*\.onrender\.com)(:[0-9]+)?$",
    allow_origins=allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz", status_code=200)
async def health_check():
    """Lightweight endpoint for Render keep-alive and Antigravity checks"""
    return {"status": "ok", "service": "tutor-crm-backend", "time": datetime.utcnow().isoformat()}

# ----------------- AUTH ENDPOINTS -----------------
@app.post("/api/v1/auth/login", response_model=schemas.LoginResponse)
async def login(payload: schemas.LoginRequest):
    identifier = (payload.username or "admin").strip()
    if not auth.verify_credentials(identifier, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username, mobile number, or password."
        )
    token = auth.create_access_token(data={"sub": identifier, "role": "teacher"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": identifier,
        "message": "Welcome back! Login successful"
    }

@app.get("/api/v1/auth/verify")
async def verify_auth_token(user: dict = Depends(auth.verify_token)):
    return {"status": "authenticated", "user": user.get("sub", "admin"), "role": user.get("role", "teacher")}

# ----------------- DASHBOARD ENDPOINTS -----------------
@app.get("/api/v1/dashboard/stats", response_model=schemas.DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    students_res = await db.execute(
        select(models.Student).options(
            selectinload(models.Student.student_batches).joinedload(models.StudentBatch.batch),
            selectinload(models.Student.payments)
        ).where(models.Student.is_active == True)
    )
    students = students_res.scalars().all()
    total_students = len(students)

    batches_cnt = await db.execute(
        select(func.count(models.Batch.id)).where(models.Batch.is_active == True)
    )
    total_batches = batches_cnt.scalar() or 0

    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    month_payments = await db.execute(
        select(func.coalesce(func.sum(models.FeePayment.amount_paid), 0.0))
        .where(models.FeePayment.payment_date >= start_of_month)
    )
    collected_month = float(month_payments.scalar() or 0.0)

    total_dues = 0.0
    for s in students:
        due, _, _ = calculate_student_financials(s)
        total_dues += due

    # Today's attendance summary
    att_res = await db.execute(
        select(models.Attendance.status, func.count(models.Attendance.id))
        .where(models.Attendance.attendance_date == today)
        .group_by(models.Attendance.status)
    )
    att_dict = {row[0]: row[1] for row in att_res.fetchall()}

    return {
        "total_active_students": total_students,
        "total_batches": total_batches,
        "total_collected_this_month": collected_month,
        "total_pending_dues": total_dues,
        "today_attendance_summary": att_dict
    }

# ----------------- STUDENT ENDPOINTS -----------------
@app.get("/api/v1/students")
async def list_students(
    batch_id: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    stmt = (
        select(models.Student)
        .options(
            selectinload(models.Student.student_batches).joinedload(models.StudentBatch.batch),
            selectinload(models.Student.payments),
        )
        .where(models.Student.is_active == True)
    )
    if batch_id and batch_id != "ALL":
        stmt = stmt.where(
            models.Student.student_batches.any(
                and_(models.StudentBatch.batch_id == batch_id, models.StudentBatch.is_active == True)
            )
        )
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                models.Student.student_name.ilike(search_pattern),
                models.Student.primary_contact.ilike(search_pattern),
                models.Student.parent_name.ilike(search_pattern),
            )
        )
    stmt = stmt.order_by(models.Student.student_name.asc())
    result = await db.execute(stmt)
    students = result.scalars().all()

    output = []
    for s in students:
        active_sb_list = [sb for sb in s.student_batches if sb.is_active and sb.batch and sb.batch.is_active]
        pending_due, total_paid, monthly_breakdown = calculate_student_financials(s)
        
        output.append({
            "id": s.id,
            "student_name": s.student_name,
            "parent_name": s.parent_name,
            "primary_contact": s.primary_contact,
            "grade": s.grade,
            "school_or_board": s.school_or_board,
            "date_of_joining": s.date_of_joining,
            "is_active": s.is_active,
            "created_at": s.created_at,
            "pending_due": pending_due,
            "total_paid": total_paid,
            "monthly_breakdown": monthly_breakdown,
            "batches": [
                {
                    "id": sb.batch.id,
                    "name": sb.batch.name,
                    "monthly_fee": sb.custom_monthly_fee if sb.custom_monthly_fee is not None else sb.batch.monthly_fee
                }
                for sb in active_sb_list
            ]
        })
    return output

@app.post("/api/v1/students", status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: schemas.StudentCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    student = models.Student(
        student_name=payload.student_name,
        parent_name=payload.parent_name,
        primary_contact=payload.primary_contact,
        grade=payload.grade,
        school_or_board=payload.school_or_board,
        date_of_joining=payload.date_of_joining,
        is_active=payload.is_active
    )
    db.add(student)
    await db.flush()

    if payload.batch_ids:
        for b_id in payload.batch_ids:
            sb = models.StudentBatch(student_id=student.id, batch_id=b_id)
            db.add(sb)

    await db.commit()
    await db.refresh(student)
    return {"id": student.id, "message": "Student record created successfully"}

@app.put("/api/v1/students/{student_id}")
async def update_student(
    student_id: str,
    payload: schemas.StudentUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    res = await db.execute(select(models.Student).where(models.Student.id == student_id))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for field, val in payload.model_dump(exclude_unset=True).items():
        if field != "batch_ids":
            setattr(student, field, val)

    if payload.batch_ids is not None:
        await db.execute(delete(models.StudentBatch).where(models.StudentBatch.student_id == student_id))
        for b_id in payload.batch_ids:
            db.add(models.StudentBatch(student_id=student_id, batch_id=b_id))

    await db.commit()
    return {"message": "Student updated successfully"}

@app.delete("/api/v1/students/{student_id}")
async def delete_student(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    res = await db.execute(select(models.Student).where(models.Student.id == student_id))
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    student.is_active = False  # Soft delete
    await db.execute(
        update(models.StudentBatch)
        .where(models.StudentBatch.student_id == student_id)
        .values(is_active=False)
    )
    await db.commit()
    return {"message": "Student marked inactive"}

# ----------------- BATCH ENDPOINTS -----------------
@app.get("/api/v1/batches")
async def list_batches(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    res = await db.execute(
        select(models.Batch)
        .options(
            selectinload(models.Batch.student_batches).joinedload(models.StudentBatch.student)
        )
        .where(models.Batch.is_active == True)
        .order_by(models.Batch.name.asc())
    )
    batches = res.scalars().all()
    output = []
    for b in batches:
        cnt = sum(1 for sb in b.student_batches if sb.is_active and sb.student and sb.student.is_active)
        output.append({
            "id": b.id,
            "name": b.name,
            "subject": b.subject,
            "grade": b.grade,
            "monthly_fee": b.monthly_fee,
            "billing_day_of_month": b.billing_day_of_month,
            "whatsapp_group_link": b.whatsapp_group_link,
            "is_active": b.is_active,
            "student_count": cnt,
            "created_at": b.created_at
        })
    return output

@app.post("/api/v1/batches", status_code=status.HTTP_201_CREATED)
async def create_batch(
    payload: schemas.BatchCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    batch = models.Batch(**payload.model_dump())
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    return {"id": batch.id, "message": "Batch created successfully"}

@app.put("/api/v1/batches/{batch_id}")
async def update_batch(
    batch_id: str,
    payload: schemas.BatchUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    res = await db.execute(select(models.Batch).where(models.Batch.id == batch_id))
    batch = res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(batch, field, val)

    await db.commit()
    await db.refresh(batch)
    return {"id": batch.id, "message": "Batch updated successfully"}

@app.patch("/api/v1/batches/{batch_id}/whatsapp-link")
async def update_batch_whatsapp_link(
    batch_id: str,
    payload: schemas.BatchWhatsAppLinkIn,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    res = await db.execute(select(models.Batch).where(models.Batch.id == batch_id))
    batch = res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    link = payload.whatsapp_group_link.strip() if payload.whatsapp_group_link else None
    batch.whatsapp_group_link = link
    await db.commit()
    await db.refresh(batch)
    return {"id": batch.id, "whatsapp_group_link": batch.whatsapp_group_link, "message": "WhatsApp group link updated"}

@app.delete("/api/v1/batches/{batch_id}")
async def delete_batch(
    batch_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    res = await db.execute(select(models.Batch).where(models.Batch.id == batch_id))
    batch = res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    batch.is_active = False
    await db.execute(
        update(models.StudentBatch)
        .where(models.StudentBatch.batch_id == batch_id)
        .values(is_active=False)
    )
    await db.commit()
    return {"message": "Batch deleted successfully"}

# ----------------- ATTENDANCE ENDPOINTS -----------------
@app.get("/api/v1/attendance/{batch_id}")
async def get_batch_attendance(
    batch_id: str,
    att_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    target_date = att_date or date.today()
    batch_res = await db.execute(select(models.Batch).where(models.Batch.id == batch_id))
    batch = batch_res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Get active enrolled students
    sb_res = await db.execute(
        select(models.StudentBatch)
        .options(joinedload(models.StudentBatch.student))
        .where(models.StudentBatch.batch_id == batch_id, models.StudentBatch.is_active == True)
    )
    s_batches = sb_res.scalars().all()
    active_students = [sb.student for sb in s_batches if sb.student and sb.student.is_active]

    # Get existing attendance for target_date
    att_res = await db.execute(
        select(models.Attendance)
        .where(models.Attendance.batch_id == batch_id, models.Attendance.attendance_date == target_date)
    )
    existing_records = {att.student_id: att for att in att_res.scalars().all()}

    student_list = []
    for s in active_students:
        rec = existing_records.get(s.id)
        student_list.append({
            "student_id": s.id,
            "student_name": s.student_name,
            "parent_name": s.parent_name,
            "primary_contact": s.primary_contact,
            "status": rec.status if rec else "UNMARKED",
            "notes": rec.notes if rec else None
        })

    return {
        "batch_id": batch.id,
        "batch_name": batch.name,
        "attendance_date": target_date,
        "students": student_list
    }

@app.post("/api/v1/attendance/bulk-save")
async def save_batch_attendance(
    payload: schemas.BatchAttendanceBulkSave,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    # Fetch all existing attendance records for this batch and date in a single query
    att_res = await db.execute(
        select(models.Attendance).where(
            models.Attendance.batch_id == payload.batch_id,
            models.Attendance.attendance_date == payload.attendance_date
        )
    )
    existing_map = {att.student_id: att for att in att_res.scalars().all()}

    for r in payload.records:
        record = existing_map.get(r.student_id)
        if record:
            record.status = r.status
            record.notes = r.notes
        else:
            db.add(models.Attendance(
                batch_id=payload.batch_id,
                student_id=r.student_id,
                attendance_date=payload.attendance_date,
                status=r.status,
                notes=r.notes
            ))

    await db.commit()
    return {"message": "Attendance saved successfully"}

# ----------------- FEE TRANSACTION LEDGER -----------------
@app.post("/api/v1/fees/record", status_code=status.HTTP_201_CREATED)
async def record_payment(
    payment: schemas.FeePaymentCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    # Auto-link batch_id if not explicitly provided
    resolved_batch_id = payment.batch_id
    if not resolved_batch_id:
        sb_res = await db.execute(
            select(models.StudentBatch)
            .where(models.StudentBatch.student_id == payment.student_id, models.StudentBatch.is_active == True)
        )
        sb_first = sb_res.scalars().first()
        if sb_first:
            resolved_batch_id = sb_first.batch_id

    rec = models.FeePayment(
        student_id=payment.student_id,
        batch_id=resolved_batch_id,
        amount_paid=payment.amount_paid,
        payment_date=payment.payment_date,
        payment_mode=payment.payment_mode.value,
        reference_id=payment.reference_id,
        month_for=payment.month_for,
        remarks=payment.remarks
    )
    db.add(rec)
    await db.commit()
    await db.refresh(rec)
    
    # Return student details for immediate receipt generation
    student_res = await db.execute(select(models.Student).where(models.Student.id == payment.student_id))
    st = student_res.scalar_one_or_none()

    return {
        "id": rec.id,
        "message": "Fee recorded in ledger",
        "receipt": {
            "receipt_id": rec.id[:8].upper(),
            "student_name": st.student_name if st else "Student",
            "parent_name": st.parent_name if st else "Parent",
            "primary_contact": st.primary_contact if st else "",
            "amount_paid": rec.amount_paid,
            "payment_date": rec.payment_date.isoformat(),
            "payment_mode": rec.payment_mode,
            "reference_id": rec.reference_id,
            "month_for": rec.month_for or "Tuition Fee",
            "amountPaid": rec.amount_paid,
            "studentName": st.student_name if st else "Student",
            "parentName": st.parent_name if st else "Parent",
            "phone": st.primary_contact if st else "",
            "receiptId": rec.id[:8].upper(),
            "paymentMode": rec.payment_mode,
            "monthFor": rec.month_for or "Tuition Fee"
        }
    }

@app.get("/api/v1/fees/ledger", response_model=List[schemas.FeePaymentOut])
async def get_fee_ledger(
    limit: int = 50,
    student_id: Optional[str] = None,
    target_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    stmt = (
        select(models.FeePayment)
        .options(
            joinedload(models.FeePayment.student).selectinload(models.Student.student_batches).joinedload(models.StudentBatch.batch),
            joinedload(models.FeePayment.batch)
        )
        .order_by(models.FeePayment.payment_date.desc(), models.FeePayment.created_at.desc())
    )
    if student_id:
        stmt = stmt.where(models.FeePayment.student_id == student_id)
    if target_date:
        stmt = stmt.where(models.FeePayment.payment_date == target_date)
    else:
        stmt = stmt.limit(limit)

    res = await db.execute(stmt)
    records = res.scalars().unique().all()
    output = []
    for r in records:
        # Determine batch name
        batch_name = None
        if r.batch:
            batch_name = r.batch.name
        elif r.student and r.student.student_batches:
            active_b = [sb.batch.name for sb in r.student.student_batches if sb.batch and sb.is_active]
            if active_b:
                batch_name = ", ".join(active_b)
        if not batch_name:
            batch_name = "General"

        output.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": r.student.student_name if r.student else "Unknown",
            "parent_name": r.student.parent_name if r.student else None,
            "primary_contact": r.student.primary_contact if r.student else None,
            "batch_name": batch_name,
            "amount_paid": r.amount_paid,
            "payment_date": r.payment_date,
            "payment_mode": r.payment_mode,
            "reference_id": r.reference_id,
            "month_for": r.month_for,
            "remarks": r.remarks,
            "created_at": r.created_at
        })
    return output

# ----------------- CSV DATA EXPORT / BACKUP ENDPOINTS -----------------
@app.get("/api/v1/export/students")
async def export_students_csv(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    """Exports all student records, batches, and pending fee status as a CSV spreadsheet."""
    stmt = (
        select(models.Student)
        .options(
            selectinload(models.Student.student_batches).joinedload(models.StudentBatch.batch),
            selectinload(models.Student.payments),
        )
        .where(models.Student.is_active == True)
        .order_by(models.Student.student_name.asc())
    )
    result = await db.execute(stmt)
    students = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Student Name", "Parent Name", "Primary Contact",
        "Grade", "School / Board", "Date of Joining", "Batches Enrolled",
        "Total Paid (INR)", "Pending Dues (INR)"
    ])

    for s in students:
        due, paid, _ = calculate_student_financials(s)
        batch_names = ", ".join(
            sb.batch.name for sb in s.student_batches if sb.is_active and sb.batch and sb.batch.is_active
        )
        writer.writerow([
            s.id,
            s.student_name,
            s.parent_name,
            s.primary_contact,
            s.grade,
            s.school_or_board,
            s.date_of_joining.isoformat() if s.date_of_joining else "",
            batch_names,
            paid,
            due
        ])

    output.seek(0)
    today_str = date.today().isoformat()
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=students_backup_{today_str}.csv"}
    )

@app.get("/api/v1/export/fees")
async def export_fees_csv(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    """Exports entire tuition payment ledger history as a CSV spreadsheet."""
    stmt = (
        select(models.FeePayment)
        .options(joinedload(models.FeePayment.student), joinedload(models.FeePayment.batch))
        .order_by(models.FeePayment.payment_date.desc(), models.FeePayment.created_at.desc())
    )
    res = await db.execute(stmt)
    records = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Receipt ID", "Payment Date", "Student Name", "Parent Name",
        "Contact", "Batch", "Month / Purpose", "Amount Paid (INR)",
        "Payment Mode", "Reference ID", "Remarks"
    ])

    for r in records:
        writer.writerow([
            r.id[:8].upper(),
            r.payment_date.isoformat() if r.payment_date else "",
            r.student.student_name if r.student else "Unknown",
            r.student.parent_name if r.student else "",
            r.student.primary_contact if r.student else "",
            r.batch.name if r.batch else "General",
            r.month_for or "Tuition Fee",
            r.amount_paid,
            r.payment_mode,
            r.reference_id or "",
            r.remarks or ""
        ])

    output.seek(0)
    today_str = date.today().isoformat()
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=fee_ledger_backup_{today_str}.csv"}
    )

# ----------------- ACADEMIC ENGINE: TESTS & MARKS -----------------
@app.get("/api/v1/tests", response_model=List[schemas.TestExamOut])
async def list_tests(
    batch_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    stmt = (
        select(models.TestExam)
        .options(
            joinedload(models.TestExam.batch),
            selectinload(models.TestExam.scores)
        )
        .order_by(models.TestExam.exam_date.desc(), models.TestExam.created_at.desc())
    )
    if batch_id and batch_id != "ALL":
        stmt = stmt.where(models.TestExam.batch_id == batch_id)

    res = await db.execute(stmt)
    exams = res.scalars().all()

    # Pre-fetch enrolled student counts per batch
    batch_ids = list(set(e.batch_id for e in exams))
    enrolled_counts = {}
    if batch_ids:
        cnt_stmt = (
            select(models.StudentBatch.batch_id, func.count(models.StudentBatch.id))
            .join(models.Student, models.Student.id == models.StudentBatch.student_id)
            .where(
                models.StudentBatch.batch_id.in_(batch_ids),
                models.StudentBatch.is_active == True,
                models.Student.is_active == True
            )
            .group_by(models.StudentBatch.batch_id)
        )
        cnt_res = await db.execute(cnt_stmt)
        enrolled_counts = dict(cnt_res.all())

    output = []
    for e in exams:
        active_scores = [s.marks_obtained for s in e.scores if not s.is_absent]
        highest = max(active_scores) if active_scores else None
        avg = round(sum(active_scores) / len(active_scores), 1) if active_scores else None
        output.append({
            "id": e.id,
            "batch_id": e.batch_id,
            "batch_name": e.batch.name if e.batch else "Unknown",
            "title": e.title,
            "subject": e.subject,
            "max_marks": e.max_marks,
            "exam_date": e.exam_date,
            "created_at": e.created_at,
            "highest_score": highest,
            "average_score": avg,
            "total_students_tested": len(e.scores),
            "total_enrolled": enrolled_counts.get(e.batch_id, 0)
        })
    return output

@app.post("/api/v1/tests", response_model=schemas.TestExamOut, status_code=status.HTTP_201_CREATED)
async def create_test(
    payload: schemas.TestExamCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    batch_res = await db.execute(select(models.Batch).where(models.Batch.id == payload.batch_id))
    batch = batch_res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    exam = models.TestExam(
        batch_id=payload.batch_id,
        title=payload.title.strip(),
        subject=payload.subject.strip(),
        max_marks=payload.max_marks,
        exam_date=payload.exam_date or date.today()
    )
    db.add(exam)
    await db.commit()
    await db.refresh(exam)

    # Get enrolled student count
    cnt_res = await db.execute(
        select(func.count(models.StudentBatch.id))
        .join(models.Student, models.Student.id == models.StudentBatch.student_id)
        .where(
            models.StudentBatch.batch_id == exam.batch_id,
            models.StudentBatch.is_active == True,
            models.Student.is_active == True
        )
    )
    enrolled = cnt_res.scalar() or 0

    return {
        "id": exam.id,
        "batch_id": exam.batch_id,
        "batch_name": batch.name,
        "title": exam.title,
        "subject": exam.subject,
        "max_marks": exam.max_marks,
        "exam_date": exam.exam_date,
        "created_at": exam.created_at,
        "highest_score": None,
        "average_score": None,
        "total_students_tested": 0,
        "total_enrolled": enrolled
    }

@app.get("/api/v1/tests/{test_id}/scores", response_model=schemas.TestExamDetailOut)
async def get_test_scores(
    test_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    exam_res = await db.execute(
        select(models.TestExam)
        .options(joinedload(models.TestExam.batch), selectinload(models.TestExam.scores))
        .where(models.TestExam.id == test_id)
    )
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Test exam not found")

    # Enrolled active students in the batch
    sb_res = await db.execute(
        select(models.StudentBatch)
        .options(joinedload(models.StudentBatch.student))
        .where(models.StudentBatch.batch_id == exam.batch_id, models.StudentBatch.is_active == True)
        .order_by(models.StudentBatch.assigned_at.asc())
    )
    active_students = [sb.student for sb in sb_res.scalars().all() if sb.student and sb.student.is_active]

    # Map existing scores
    score_map = {s.student_id: s for s in exam.scores}

    scored_items = []
    for s in active_students:
        rec = score_map.get(s.id)
        marks = rec.marks_obtained if rec else 0.0
        absent = rec.is_absent if rec else False
        remarks = rec.remarks if rec else None
        scored_items.append({
            "student_id": s.id,
            "student_name": s.student_name,
            "parent_name": s.parent_name,
            "primary_contact": s.primary_contact,
            "marks_obtained": marks,
            "is_absent": absent,
            "remarks": remarks,
            "percentage": round((marks / exam.max_marks) * 100, 1) if (not absent and exam.max_marks > 0) else 0.0
        })

    # Compute ranks for present students
    present_students = [item for item in scored_items if not item["is_absent"]]
    present_students.sort(key=lambda x: x["marks_obtained"], reverse=True)

    ranks = {}
    current_rank = 1
    for idx, item in enumerate(present_students):
        if idx > 0 and item["marks_obtained"] < present_students[idx - 1]["marks_obtained"]:
            current_rank = idx + 1
        ranks[item["student_id"]] = current_rank

    for item in scored_items:
        if item["is_absent"]:
            item["rank"] = None
        else:
            item["rank"] = ranks.get(item["student_id"])

    # Batch test stats
    active_marks = [it["marks_obtained"] for it in scored_items if not it["is_absent"]]
    highest = max(active_marks) if active_marks else None
    avg = round(sum(active_marks) / len(active_marks), 1) if active_marks else None

    # Sort scored_items alphabetically for clean tabular display
    scored_items.sort(key=lambda x: x["student_name"].lower())

    return {
        "exam": {
            "id": exam.id,
            "batch_id": exam.batch_id,
            "batch_name": exam.batch.name if exam.batch else "Unknown",
            "title": exam.title,
            "subject": exam.subject,
            "max_marks": exam.max_marks,
            "exam_date": exam.exam_date,
            "created_at": exam.created_at,
            "highest_score": highest,
            "average_score": avg,
            "total_students_tested": len([s for s in exam.scores if not s.is_absent]),
            "total_enrolled": len(active_students)
        },
        "scores": scored_items
    }

@app.post("/api/v1/tests/{test_id}/scores", response_model=schemas.TestExamDetailOut)
async def bulk_save_test_scores(
    test_id: str,
    payload: schemas.BulkScoreSaveRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    exam_res = await db.execute(
        select(models.TestExam)
        .options(joinedload(models.TestExam.batch), selectinload(models.TestExam.scores))
        .where(models.TestExam.id == test_id)
    )
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Test exam not found")

    score_map = {s.student_id: s for s in exam.scores}

    for item in payload.scores:
        marks = min(max(0.0, item.marks_obtained), exam.max_marks)
        rec = score_map.get(item.student_id)
        if rec:
            rec.marks_obtained = marks
            rec.is_absent = item.is_absent
            rec.remarks = item.remarks
        else:
            new_rec = models.TestScore(
                test_id=test_id,
                student_id=item.student_id,
                marks_obtained=marks,
                is_absent=item.is_absent,
                remarks=item.remarks
            )
            db.add(new_rec)

    await db.commit()
    return await get_test_scores(test_id=test_id, db=db, user=user)

@app.delete("/api/v1/tests/{test_id}")
async def delete_test_exam(
    test_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    exam_res = await db.execute(select(models.TestExam).where(models.TestExam.id == test_id))
    exam = exam_res.scalar_one_or_none()
    if not exam:
        raise HTTPException(status_code=404, detail="Test exam not found")

    await db.delete(exam)
    await db.commit()
    return {"message": "Test exam and scores deleted successfully"}

# ----------------- STUDENT 360 PROFILE & ANALYTICS -----------------
@app.get("/api/v1/students/{student_id}/profile", response_model=schemas.StudentProfile360Out)
async def get_student_profile_360(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    stmt = (
        select(models.Student)
        .options(
            selectinload(models.Student.student_batches).joinedload(models.StudentBatch.batch),
            selectinload(models.Student.payments).joinedload(models.FeePayment.batch),
            selectinload(models.Student.attendance_records).joinedload(models.Attendance.batch),
            selectinload(models.Student.test_scores).joinedload(models.TestScore.test).joinedload(models.TestExam.batch)
        )
        .where(models.Student.id == student_id)
    )
    res = await db.execute(stmt)
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Financials
    due, paid, monthly_breakdown = calculate_student_financials(student)

    # Payments sorted desc
    payments_sorted = sorted(student.payments, key=lambda p: (p.payment_date, p.created_at), reverse=True)
    payments_out = [
        {
            "id": p.id,
            "student_id": p.student_id,
            "student_name": student.student_name,
            "parent_name": student.parent_name,
            "primary_contact": student.primary_contact,
            "batch_name": p.batch.name if p.batch else "General",
            "amount_paid": p.amount_paid,
            "payment_date": p.payment_date,
            "payment_mode": p.payment_mode,
            "reference_id": p.reference_id,
            "month_for": p.month_for,
            "remarks": p.remarks,
            "created_at": p.created_at
        } for p in payments_sorted
    ]

    # Enrolled active batches
    active_batches = [
        sb.batch for sb in student.student_batches
        if sb.is_active and sb.batch and sb.batch.is_active
    ]
    batches_out = [
        {
            "id": b.id, 
            "name": b.name, 
            "monthly_fee": b.monthly_fee,
            "whatsapp_group_link": b.whatsapp_group_link
        }
        for b in active_batches
    ]

    # Attendance stats
    att_records = student.attendance_records
    total_sessions = len(att_records)
    present_cnt = sum(1 for a in att_records if a.status == "PRESENT")
    absent_cnt = sum(1 for a in att_records if a.status == "ABSENT")
    late_cnt = sum(1 for a in att_records if a.status == "LATE")
    effective_present = present_cnt + (0.5 * late_cnt)
    att_pct = round((effective_present / total_sessions * 100), 1) if total_sessions > 0 else 100.0

    recent_absents = [
        {
            "date": a.attendance_date.isoformat(),
            "batch_name": a.batch.name if a.batch else "Batch",
            "notes": a.notes or "No remarks"
        }
        for a in sorted([a for a in att_records if a.status == "ABSENT"], key=lambda x: x.attendance_date, reverse=True)[:10]
    ]

    all_attendance_records = [
        {
            "date": a.attendance_date.isoformat(),
            "batch_name": a.batch.name if a.batch else "Batch",
            "status": a.status,
            "notes": a.notes or ""
        }
        for a in sorted(att_records, key=lambda x: x.attendance_date, reverse=True)
    ]

    # Academic tests history (Pre-fetch scores across all tests to prevent N+1 queries)
    academic_tests = []
    test_ids = [ts.test_id for ts in student.test_scores if ts.test_id]
    scores_by_test = {}
    if test_ids:
        all_scores_res = await db.execute(
            select(models.TestScore).where(models.TestScore.test_id.in_(test_ids))
        )
        for s in all_scores_res.scalars().all():
            scores_by_test.setdefault(s.test_id, []).append(s)

    for ts in sorted(student.test_scores, key=lambda s: s.test.exam_date if s.test else date.min, reverse=True):
        if not ts.test:
            continue
        test_obj = ts.test
        all_test_scores = scores_by_test.get(test_obj.id, [])
        active_marks = [s.marks_obtained for s in all_test_scores if not s.is_absent]
        highest_score = max(active_marks) if active_marks else None
        avg_score = round(sum(active_marks) / len(active_marks), 1) if active_marks else None

        test_rank = None
        if not ts.is_absent and active_marks:
            sorted_marks = sorted(list(set(active_marks)), reverse=True)
            test_rank = sorted_marks.index(ts.marks_obtained) + 1 if ts.marks_obtained in sorted_marks else None

        percentage = round((ts.marks_obtained / test_obj.max_marks) * 100, 1) if (not ts.is_absent and test_obj.max_marks > 0) else 0.0

        academic_tests.append({
            "test_id": test_obj.id,
            "test_title": test_obj.title,
            "subject": test_obj.subject,
            "batch_name": test_obj.batch.name if test_obj.batch else "Batch",
            "exam_date": test_obj.exam_date,
            "max_marks": test_obj.max_marks,
            "marks_obtained": ts.marks_obtained,
            "percentage": percentage,
            "rank": test_rank,
            "is_absent": ts.is_absent,
            "highest_in_class": highest_score,
            "average_in_class": avg_score,
            "total_students": len(all_test_scores),
            "remarks": ts.remarks
        })

    student_out = {
        "id": student.id,
        "student_name": student.student_name,
        "parent_name": student.parent_name,
        "primary_contact": student.primary_contact,
        "grade": student.grade,
        "school_or_board": student.school_or_board,
        "date_of_joining": student.date_of_joining,
        "is_active": student.is_active,
        "notes": student.notes,
        "batches": batches_out,
        "pending_due": due,
        "total_paid": paid,
        "monthly_breakdown": monthly_breakdown,
        "created_at": student.created_at or datetime.utcnow(),
    }

    return {
        "student": student_out,
        "batches": batches_out,
        "financials": {
            "total_expected": due + paid,
            "total_paid": paid,
            "pending_due": due,
            "monthly_breakdown": monthly_breakdown,
            "payments": payments_out
        },
        "attendance": {
            "total_sessions": total_sessions,
            "present_count": present_cnt,
            "absent_count": absent_cnt,
            "late_count": late_cnt,
            "attendance_percentage": att_pct,
            "recent_absent_dates": recent_absents,
            "all_records": all_attendance_records
        },
        "academic_tests": academic_tests
    }

@app.patch("/api/v1/students/{student_id}/notes")
async def update_student_notes(
    student_id: str,
    payload: schemas.StudentNoteUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    student_res = await db.execute(select(models.Student).where(models.Student.id == student_id))
    student = student_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    student.notes = payload.notes
    await db.commit()
    return {"message": "Notes updated successfully", "notes": student.notes}

@app.get("/api/v1/attendance/summary", response_model=schemas.MonthlyAttendanceSummaryOut)
async def get_monthly_attendance_summary(
    batch_id: str,
    month: Optional[str] = None, # "YYYY-MM" e.g. "2026-11"
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(auth.verify_token)
):
    batch_res = await db.execute(select(models.Batch).where(models.Batch.id == batch_id))
    batch = batch_res.scalar_one_or_none()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    target_month_str = month or date.today().strftime("%Y-%m")
    try:
        y, m = map(int, target_month_str.split("-"))
    except Exception:
        y, m = date.today().year, date.today().month
        target_month_str = f"{y:04d}-{m:02d}"

    start_date = date(y, m, 1)
    if m == 12:
        end_date = date(y + 1, 1, 1)
    else:
        end_date = date(y, m + 1, 1)

    sb_res = await db.execute(
        select(models.StudentBatch)
        .options(joinedload(models.StudentBatch.student))
        .where(models.StudentBatch.batch_id == batch_id, models.StudentBatch.is_active == True)
        .order_by(models.StudentBatch.assigned_at.asc())
    )
    active_students = [sb.student for sb in sb_res.scalars().all() if sb.student and sb.student.is_active]

    att_res = await db.execute(
        select(models.Attendance).where(
            models.Attendance.batch_id == batch_id,
            models.Attendance.attendance_date >= start_date,
            models.Attendance.attendance_date < end_date
        )
    )
    all_records = att_res.scalars().all()

    batch_session_dates = set(r.attendance_date for r in all_records)
    total_batch_sessions = len(batch_session_dates)

    student_records_map = {}
    for r in all_records:
        student_records_map.setdefault(r.student_id, []).append(r)

    student_summaries = []
    for s in active_students:
        s_recs = student_records_map.get(s.id, [])
        p_cnt = sum(1 for r in s_recs if r.status == "PRESENT")
        a_cnt = sum(1 for r in s_recs if r.status == "ABSENT")
        l_cnt = sum(1 for r in s_recs if r.status == "LATE")
        total_marked = len(s_recs)
        effective = p_cnt + (0.5 * l_cnt)
        pct = round((effective / total_marked * 100), 1) if total_marked > 0 else 0.0

        student_summaries.append({
            "student_id": s.id,
            "student_name": s.student_name,
            "parent_name": s.parent_name,
            "primary_contact": s.primary_contact,
            "total_days": total_marked,
            "present_days": p_cnt,
            "absent_days": a_cnt,
            "late_days": l_cnt,
            "attendance_percentage": pct
        })

    return {
        "batch_id": batch.id,
        "batch_name": batch.name,
        "month": target_month_str,
        "total_batch_sessions": total_batch_sessions,
        "students": student_summaries
    }

