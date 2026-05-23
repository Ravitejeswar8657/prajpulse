"""
Praja Pulse backend — FastAPI.

Endpoints:
  GET  /api/pulse        -> scored headlines + aggregations (the frontend's main feed)
  POST /api/deep         -> optional Claude-powered deep re-score of given headlines
  GET  /api/health       -> liveness + cache stats
  POST /api/refresh      -> force a re-fetch (protected by a simple token)

Refresh model:
  - Background scheduler refreshes the cache every REFRESH_MINUTES.
  - Everything is cached in memory; the frontend hits a warm cache, so it's
    fast and never triggers a live scrape per visitor.

Run:  uvicorn app.main:app --reload
"""

import os
import asyncio
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .aggregator import fetch_headlines
from .ground_truth import score_text, ENTITIES
from . import deep_scorer

REFRESH_MINUTES = int(os.environ.get("REFRESH_MINUTES", "30"))
REFRESH_TOKEN = os.environ.get("REFRESH_TOKEN", "")  # set in prod to protect /api/refresh
ALLOW_ORIGINS = os.environ.get("ALLOW_ORIGINS", "*").split(",")

_cache = {"scored": [], "board": [], "issues": [], "updated_at": None, "count": 0}


def _aggregate(scored):
    acc = {}
    for r in scored:
        for e in r["entities"]:
            a = acc.setdefault(e["id"], {"sum": 0.0, "n": 0})
            a["sum"] += e["sentiment"]
            a["n"] += 1
    board = []
    for ent in ENTITIES:
        a = acc.get(ent["id"])
        if not a or a["n"] == 0:
            continue
        board.append({"id": ent["id"], "label": ent["label"], "party": ent["party"],
                      "net": round(a["sum"] / a["n"], 2), "n": a["n"]})
    board.sort(key=lambda x: x["net"], reverse=True)

    iss = {}
    for r in scored:
        iss[r["issue"]] = iss.get(r["issue"], 0) + 1
    issues = sorted(iss.items(), key=lambda kv: kv[1], reverse=True)
    return board, issues


def refresh_cache():
    headlines = fetch_headlines()
    scored = []
    for h in headlines:
        s = score_text(h["title"])
        if s:
            s.update({"link": h["link"], "source": h["source"], "published": h["published"]})
            scored.append(s)
    board, issues = _aggregate(scored)
    _cache.update({
        "scored": scored, "board": board, "issues": issues,
        "count": len(scored), "updated_at": datetime.now(timezone.utc).isoformat(),
    })
    return _cache["count"]


async def _scheduler():
    while True:
        try:
            refresh_cache()
        except Exception as e:
            print("refresh error:", e)
        await asyncio.sleep(REFRESH_MINUTES * 60)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        refresh_cache()  # warm on boot
    except Exception as e:
        print("initial refresh failed:", e)
    task = asyncio.create_task(_scheduler())
    yield
    task.cancel()


app = FastAPI(title="Praja Pulse API", version="1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=ALLOW_ORIGINS,
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "count": _cache["count"], "updated_at": _cache["updated_at"],
            "deep_available": deep_scorer.deep_available()}


@app.get("/api/pulse")
def pulse(limit: int = 50):
    return {
        "updated_at": _cache["updated_at"],
        "board": _cache["board"],
        "issues": _cache["issues"],
        "signals": _cache["scored"][:limit],
        "deep_available": deep_scorer.deep_available(),
    }


class DeepReq(BaseModel):
    texts: list[str]


@app.post("/api/deep")
def deep(req: DeepReq):
    if not deep_scorer.deep_available():
        raise HTTPException(503, "Deep scoring unavailable: GEMINI_API_KEY not set.")
    if not req.texts:
        raise HTTPException(400, "Provide texts.")
    try:
        return {"results": deep_scorer.deep_score(req.texts[:20])}
    except Exception as e:
        raise HTTPException(500, f"Deep scoring failed: {e}")


@app.post("/api/refresh")
def force_refresh(x_refresh_token: str = Header(default="")):
    if REFRESH_TOKEN and x_refresh_token != REFRESH_TOKEN:
        raise HTTPException(401, "Bad refresh token.")
    n = refresh_cache()
    return {"refreshed": True, "count": n, "updated_at": _cache["updated_at"]}
