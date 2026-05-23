"""
RSS-based news aggregator for AP politics.

Uses RSS feeds + feedparser (NOT HTML scraping of news sites). RSS is:
  - keyless and stable (no markup-breakage, no IP bans)
  - the right granularity (headline + link + timestamp)
  - clean on copyright (we store headlines + links, never article bodies)

Add feeds freely. Google News query feeds are the easiest high-coverage source;
add publisher-native RSS where available.
"""

import feedparser
from datetime import datetime, timezone

FEEDS = [
    "https://news.google.com/rss/search?q=Andhra+Pradesh+politics+when:7d&hl=en-IN&gl=IN&ceid=IN:en",
    "https://news.google.com/rss/search?q=Chandrababu+Naidu+OR+Pawan+Kalyan+OR+Jagan+when:7d&hl=en-IN&gl=IN&ceid=IN:en",
    "https://news.google.com/rss/search?q=YSRCP+OR+TDP+OR+Jana+Sena+Andhra+when:7d&hl=en-IN&gl=IN&ceid=IN:en",
    # Telugu-language query feed (Google News supports te):
    "https://news.google.com/rss/search?q=ఆంధ్రప్రదేశ్+రాజకీయాలు&hl=te-IN&gl=IN&ceid=IN:te",
]


def _source_from_title(title: str) -> str:
    # Google News titles end with " - <Source>"
    parts = title.rsplit(" - ", 1)
    return parts[1].strip() if len(parts) == 2 else ""


def fetch_headlines():
    seen, out = set(), []
    for url in FEEDS:
        try:
            parsed = feedparser.parse(url)
        except Exception:
            continue
        for entry in parsed.entries:
            title = getattr(entry, "title", "").strip()
            if not title or title in seen:
                continue
            seen.add(title)
            published = getattr(entry, "published", "") or getattr(entry, "updated", "")
            out.append({
                "title": title,
                "link": getattr(entry, "link", ""),
                "source": _source_from_title(title),
                "published": published,
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })
    return out
