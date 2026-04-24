# LogGuardian FastAPI Backend

Production-ready FastAPI service for LogGuardian with:

- Modular log ingestion APIs (single + batch + file upload)
- Signal-only Supabase persistence (`alerts`, `anomalies`, `analytics_minute`)
- Hybrid anomaly scoring (Isolation Forest + optional autoencoder)
- Realtime WebSocket stream for live updates
- Alert deduplication/grouping with resolve lifecycle
- Analytics and model-training endpoints

## 1. Setup

1. Copy environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill Supabase credentials in `.env`:

   - `SUPABASE_URL`
   - `SUPABASE_ROLE_KEY` (recommended)
   - `SUPABASE_KEY` (fallback)
   - `SUPABASE_ANON_PUBLIC_KEY` (fallback)
   - `SUPABASE_DEFAULT_USER_ID` (recommended for single-tenant setup)
   - `SUPABASE_DEFAULT_PROJECT_ID` (optional)
   - `SUPABASE_BOOTSTRAP_USER_EMAIL` (optional, auto-seed user for fresh DB)

3. Optional (free alerts):

   - SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `ALERT_EMAIL_TO`
   - Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

4. Create tables in Supabase using SQL from:

   - `sql/supabase_schema.sql`
   - For hardened production upgrades, apply ordered scripts in:
     - `sql/migrations/README.md`

5. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

## 2. Run API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 3. API Endpoints

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

## 4. Sample cURL

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/logs/ingest" \
  -H "Content-Type: application/json" \
  -d '{"service":"api","level":"ERROR","message":"database timeout on checkout"}'
```
