# Praja Pulse

AP political sentiment radar. A FastAPI backend aggregates Andhra Pradesh
political headlines (via RSS), scores them with a Telugu/Tenglish/English
sentiment lexicon, and serves clean JSON. A Vite + React frontend renders it
as a bold-poster dashboard: a per-leader sentiment leaderboard, hot issues,
and a live signal feed. Optional Claude "deep" scoring for hard cases.

```
praja-pulse-app/
├── backend/      FastAPI service (scrape + score + serve)
└── frontend/     Vite + React dashboard (bold-poster UI)
```

## Quick start

### 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # optional
pip install -r requirements.txt
uvicorn app.main:app --reload
# serves http://127.0.0.1:8000/api/pulse
```
On first boot it pulls live AP headlines and scores them. (If you're on a
restricted network that blocks news.google.com, the feed will be empty —
that's a network issue, not a code one.)

Optional: enable the Claude-powered DEEP button
```bash
export ANTHROPIC_API_KEY=sk-...    # key stays server-side, never in the browser
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# opens http://127.0.0.1:5173 — reads the backend at http://127.0.0.1:8000
```
The backend origin is set in `frontend/index.html` via `window.PRAJA_API_BASE`.
Change it there when you deploy.

## Deploy
- Frontend: `npm run build` → drop `frontend/dist/` on Netlify / Vercel / any static host.
- Backend: containerized (`backend/Dockerfile`) → AKS / Azure Web App / Fly / Render.
  Lock `ALLOW_ORIGINS` to your frontend URL and store the API key in Key Vault /
  Managed Identity rather than a plain env var.

## Where the value lives (extend these)
- `backend/app/ground_truth.py` → the LEXICON (Telugu/Tenglish sentiment terms)
  and ENTITIES (leaders + aliases). This is the AP-native part that's yours.
- `backend/app/aggregator.py` → FEEDS. Add publisher RSS feeds for more coverage.

## Notes
- Uses RSS, not HTML scraping: keyless, stable, and clean on copyright
  (headlines + links only; the UI links back to each source).
- The backend caches results and refreshes on a schedule, so visitors hit a
  warm cache instead of triggering a scrape each time.
- Public data only · no PII.
