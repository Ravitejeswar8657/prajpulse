# Praja Pulse — backend

FastAPI service that aggregates AP political headlines (RSS, keyless),
scores them with a Telugu/Tenglish/English sentiment lexicon, caches the
result, and serves clean JSON to the Praja Pulse frontend. Optional Claude
"deep" scoring for hard cases (key stays server-side).

## Run locally
    pip install -r requirements.txt
    uvicorn app.main:app --reload
    # http://127.0.0.1:8000/api/pulse

## Docker
    docker build -t praja-pulse .
    docker run -p 8000:8000 --env-file .env praja-pulse

## Endpoints
    GET  /api/pulse?limit=50   main feed: board + issues + scored signals
    GET  /api/health           liveness + cache stats + deep availability
    POST /api/deep             {"texts":[...]} -> Claude re-score (if key set)
    POST /api/refresh          force re-pull (header X-Refresh-Token if set)

## Config (env)
    ANTHROPIC_API_KEY   optional; enables /api/deep
    REFRESH_MINUTES     scheduler interval (default 30)
    REFRESH_TOKEN       protects /api/refresh in prod
    ALLOW_ORIGINS       lock to your frontend origin in prod

## Deploy notes (your DevOps wheelhouse)
- Containerized; drop onto AKS / Azure Web App / Fly / Render.
- For AKS: use the Dockerfile, expose 8000, put behind your ingress.
- Use Managed Identity / Key Vault for ANTHROPIC_API_KEY rather than .env.
- The scheduler keeps the cache warm; visitors hit cache, never a live scrape.

## Note on "scraping"
This uses RSS feeds + official query feeds, not HTML scraping of news sites.
RSS is keyless, stable, and clean on copyright (headlines + links, never
article bodies). The frontend links each signal back to its source.

## Extending the moat
- app/ground_truth.py LEXICON  -> add Telugu/Tenglish sentiment terms
- app/ground_truth.py ENTITIES -> add MLAs/leaders + aliases
- app/aggregator.py FEEDS      -> add publisher RSS feeds
