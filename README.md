# TutorCRM - Zero-Budget Tuition & Fee Manager

A full-stack, mobile-first CRM and fee management web app tailored for independent tuition teachers and local coaching centers in India.

## Zero-Cost Stack
- **Frontend:** Next.js (App Router), Tailwind CSS, Lucide Icons, `qrcode.react` (Deploys to Vercel Free Tier)
- **Backend:** FastAPI, SQLAlchemy 2.0 (Async), `asyncpg`/`aiosqlite` (Deploys to Render Free Tier)
- **Database:** Supabase Managed PostgreSQL (or local SQLite for zero-setup local dev)
- **Zero-Cost Indian Market Features:**
  - Dynamic Client-side UPI QR Code (no Razorpay or 2% gateway fees)
  - Pre-filled WhatsApp Reminders via `wa.me/91...` deep links (no WhatsApp API or Twilio fees)

---

## Running in Antigravity IDE

You are already in Antigravity IDE! Open the integrated terminal (`Ctrl + \`` or menu **Terminal > New Terminal**).

### Terminal 1: Backend (FastAPI)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
> The backend will automatically create tables and seed initial sample data (batches & students) into local SQLite (`tutor.db`).

### Terminal 2: Frontend (Next.js)

Split your terminal in Antigravity IDE (click the **Split Terminal** icon in the terminal tab):

```powershell
cd frontend
npm install
npm run dev
```

Open **`http://localhost:3000`** in your browser (or use Antigravity's integrated browser preview).

---

## Supabase PostgreSQL Setup (Optional for Cloud)

When you're ready to deploy or switch to Supabase:
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in Supabase and paste the contents of `backend/supabase_schema.sql`.
3. In `backend/.env`, set:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   *(Note: Use port **6543** for the transaction pooler so Render cold starts don't hit connection limits).*

---

## Zero-Budget Deployment

### Backend on Render (Free Tier)
1. Push your repository to GitHub.
2. In Render dashboard, click **New Web Service** and select your repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 10000`
   - **Environment Variables:** Set `DATABASE_URL` to your Supabase pooler URL.
4. Set up a free 14-minute HTTP monitor at [cron-job.org](https://cron-job.org) pinging `https://<your-render-app>.onrender.com/healthz` to prevent cold starts.

### Frontend on Vercel (Free Tier)
1. Import your GitHub repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Set Environment Variable:
   - `NEXT_PUBLIC_BACKEND_URL`: `https://<your-render-app>.onrender.com`
   - `NEXT_PUBLIC_TEACHER_NAME`: `Sharma Tutorials`
   - `NEXT_PUBLIC_TEACHER_UPI_ID`: `yourname@bank`
