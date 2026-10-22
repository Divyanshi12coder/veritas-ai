"""Source-credibility assessment: curated seed list + transparent structural heuristics."""
from __future__ import annotations

import json
import logging
import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from ..config import get_settings

log = logging.getLogger(__name__)

RISKY_TLDS = {"xyz", "biz", "info", "click", "top", "buzz", "icu", "work", "tk", "ml", "ga", "cf", "gq", "monster", "cam", "rest"}
RESERVED_TLDS = {"example", "test", "invalid", "localhost"}
SENSATIONAL_DOMAIN_WORDS = ("truth", "patriot", "exposed", "alert", "viral", "breaking", "buzz", "leak", "insider", "wakeup", "freedom", "real")
INSTITUTIONAL_RE = re.compile(r"\.(gov|edu|mil)(\.[a-z]{2})?$|\.ac\.[a-z]{2}$")


@lru_cache
def _ratings(path: str) -> dict:
    p = Path(path)
    if not p.exists():
        log.warning("source ratings file missing: %s", p)
        return {"_meta": {"scores": {"established": 88, "satire": 35, "flagged": 8}}, "domains": {}}
    return json.loads(p.read_text(encoding="utf-8"))


def extract_domain(url: str | None) -> str | None:
    if not url:
        return None
    candidate = url if "://" in url else f"https://{url}"
    try:
        host = (urlparse(candidate).hostname or "").lower()
    except ValueError:
        return None
    host = host.removeprefix("www.")
    return host or None


def _lookup(domain: str, domains: dict) -> tuple[str, dict] | None:
    parts = domain.split(".")
    for i in range(len(parts) - 1):
        cand = ".".join(parts[i:])
        if cand in domains:
            return cand, domains[cand]
    return None


def assess_source(source_url: str | None, author: str | None, published_at: str | None) -> dict:
    """Return a SourceReport-shaped dict. `available` is False when no URL/domain is known."""
    ratings = _ratings(str(get_settings().source_ratings_path))
    scores = ratings["_meta"]["scores"]
    domain = extract_domain(source_url)
    checks: list[dict] = []
    if author:
        checks.append({"label": "Named author / byline", "passed": True, "detail": f"Byline present: {author[:60]}"})
    else:
        checks.append({"label": "Named author / byline", "passed": False, "detail": "No author provided; anonymous articles are harder to hold accountable."})
    if published_at:
        checks.append({"label": "Publication date", "passed": True, "detail": f"Dated {published_at[:25]}"})
    else:
        checks.append({"label": "Publication date", "passed": None, "detail": "No publication date available."})

    if not domain:
        return {"domain": None, "available": False, "score": None, "tier": "unknown", "name": None,
                "notes": ["No source URL was provided, so source credibility could not be assessed."], "checks": checks}

    hit = _lookup(domain, ratings["domains"])
    if hit:
        key, info = hit
        tier = info["tier"]
        score = float(scores[tier])
        checks.insert(0, {"label": "Curated seed list", "passed": tier == "established",
                          "detail": f"{info['name']} is listed as '{tier}'. {info['note']}"})
        notes = ["Rating comes from the editable seed list in data/kb/source_ratings.json (editorial heuristic, not an authoritative verdict)."]
        return {"domain": domain, "available": True, "score": score, "tier": tier, "name": info["name"], "notes": notes, "checks": checks}

    tld = domain.rsplit(".", 1)[-1]
    score = 50.0
    notes = ["Domain is not in the seed list; score is derived from structural heuristics only and is capped at 75."]
    checks.insert(0, {"label": "Curated seed list", "passed": None, "detail": "Domain not listed; publisher reputation is unknown."})
    if source_url and source_url.lower().startswith("http://"):
        score -= 5
        checks.append({"label": "Transport security", "passed": False, "detail": "Page served over plain HTTP."})
    elif source_url:
        score += 3
        checks.append({"label": "Transport security", "passed": True, "detail": "Page served over HTTPS."})
    if INSTITUTIONAL_RE.search(domain):
        score += 20
        checks.append({"label": "Institutional domain", "passed": True, "detail": "Government/education TLDs are restricted to eligible organisations."})
    if tld in RISKY_TLDS:
        score -= 12
        checks.append({"label": "Top-level domain", "passed": False, "detail": f".{tld} domains are cheap and over-represented in low-quality sites."})
    elif tld not in RESERVED_TLDS:
        checks.append({"label": "Top-level domain", "passed": True, "detail": f".{tld} is not a commonly abused TLD."})
    label = domain.split(".")[0]
    if label.count("-") >= 2 or sum(c.isdigit() for c in label) >= 3:
        score -= 8
        checks.append({"label": "Domain name pattern", "passed": False, "detail": "Hyphen/number-heavy domain names are common in disposable sites."})
    hits = [w for w in SENSATIONAL_DOMAIN_WORDS if w in label]
    if hits:
        score -= 10
        checks.append({"label": "Sensational domain wording", "passed": False, "detail": f"Domain contains attention-seeking words: {', '.join(hits)}."})
    score += 4 if author else -4
    score += 3 if published_at else 0
    return {"domain": domain, "available": True, "score": float(max(15.0, min(75.0, score))), "tier": "unrated",
            "name": None, "notes": notes, "checks": checks}
