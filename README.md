# LogGuardian

LogGuardian is a full-stack, open-source log monitoring platform with:

- Next.js frontend (marketing + live dashboard)
- FastAPI backend for ingestion and analytics
- Supabase (PostgreSQL) persistence
- Hybrid anomaly scoring (Isolation Forest + Autoencoder)
- WebSocket realtime stream for logs and alerts
- Deduplicated alerts and incident lifecycle controls

## Repository Structure

```text
LogGuardian/
	frontend/  # Next.js app
	backend/   # FastAPI app
```

## Architecture

Client logs -> FastAPI ingestion -> Processing + hybrid ML engine -> PostgreSQL (Supabase) -> Dashboard + Alerts + WebSocket realtime feed

1. Frontend ingests single logs, batch logs, or uploaded files.
2. Backend normalizes payloads and applies hybrid scoring.
3. Critical anomalies trigger deduplicated grouped alerts.
4. Only high-value signals are persisted (`alerts`, `anomalies`, `analytics_minute`).
5. Dashboard, log viewer, and alerts panel receive realtime updates over WebSockets.

## 1) Configure Supabase

Run SQL from [backend/sql/supabase_schema.sql](backend/sql/supabase_schema.sql) in Supabase SQL editor.

## 2) Configure Environment Variables

Create frontend env file:

```bash
cp frontend/.env.example frontend/.env.local
```

Create backend env file:

```bash
cp backend/.env.example backend/.env
```

Fill backend values:

- `SUPABASE_URL`
- `SUPABASE_ROLE_KEY` (recommended for backend)

Supported fallback keys if needed:

- `SUPABASE_KEY`
- `SUPABASE_ANON_PUBLIC_KEY`

Optional tenant bootstrap for fresh databases:

- `SUPABASE_BOOTSTRAP_USER_EMAIL`

Optional backend values:

- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `ALERT_EMAIL_TO`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

## 3) Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

## 4) Run Backend

Create/activate your Python virtual environment, then:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend docs: http://127.0.0.1:8000/docs

## Functional Routes

Frontend:

- `/` landing page
- `/dashboard` live operational dashboard
- `/logs` advanced log viewer (search + filters + time range)
- `/alerts` incident and alert panel

Backend:

- `GET /api/v1/health`
- `POST /api/v1/logs/ingest`
- `POST /api/v1/logs/ingest/batch`
- `POST /api/v1/logs/upload`
- `GET /api/v1/logs`
- `GET /api/v1/analytics/overview`
- `POST /api/v1/model/train`
- `GET /api/v1/model/status`
- `GET /api/v1/alerts`
- `POST /api/v1/alerts/{alert_id}/resolve`
- `GET /api/v1/stream/status`
- `WS /api/v1/stream/logs`

## Notes

- Keep `frontend/.env.local` and `backend/.env` private.
- Set `NEXT_PUBLIC_API_BASE_URL` to backend URL for deployment.
- For production, deploy Next.js and FastAPI separately and point frontend env to the deployed API.

## Deploy Frontend To Vercel

Use these steps when deploying only the `frontend` app:

1. Import this repository in Vercel.
2. Set **Root Directory** to `frontend`.
3. Use default Next.js commands:
	- Build Command: `npm run build`
	- Output: `.next` (managed automatically by Vercel for Next.js)
4. Add these environment variables in Vercel (Project Settings -> Environment Variables):
	- `NEXT_PUBLIC_API_BASE_URL` = your deployed backend base URL (for example `https://api.example.com`)
	- `NEXT_PUBLIC_WS_BASE_URL` = your deployed backend WS URL (for example `wss://api.example.com`)
	- `NEXT_PUBLIC_SITE_URL` = your production site URL (for example `https://logguardian.vercel.app`)
	- Optional auth:
	  - `NEXT_PUBLIC_SUPABASE_URL`
	  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	  - `NEXT_PUBLIC_AUTH_REDIRECT_URL` (for example `https://logguardian.vercel.app/dashboard`)

### Pre-Deploy Check

Run this locally from `frontend` before pushing:

```bash
npm run build
```
