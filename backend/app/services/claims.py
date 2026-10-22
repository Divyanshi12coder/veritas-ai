"""Check-worthy claim extraction (rule-based sentence scoring)."""
from __future__ import annotations

import re

from ..nlp.lexicons import ABSOLUTIST_WORDS, CAUSAL_CUES
from ..nlp.preprocessing import split_sentences

_NUM = re.compile(r"\d")
_ASSERT = re.compile(
    r"\b(is|are|was|were|has|have|had|will|causes?|caused|proves?|proved|shows?|showed|confirm(?:s|ed)?|reveal(?:s|ed)?|"
    r"kills?|killed|cures?|cured|prevents?|found|discovered|admitted|announced|declared|ban(?:s|ned)?|never|always)\b",
    re.I,
)
_ENTITYISH = re.compile(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b")
# Sentences that *report* a claim in order to question it ("the idea that...", "debunked") are not assertions by the author.
_FRAMING = re.compile(r"\b(?:idea that|claims? that|myth|rumou?rs?|debunked?|false(?:ly)?|hoax|conspiracy theor\w+|misinformation|retracted|no evidence|have not found|not found)\b", re.I)
_OPINION = re.compile(r"^(i |we |in my opinion|personally|i think|it seems)", re.I)


def _kind(s: str) -> str:
    low = s.lower()
    if _NUM.search(s) and ("%" in s or "percent" in low or "million" in low or "billion" in low):
        return "statistical"
    if any(c in low for c in CAUSAL_CUES):
        return "causal"
    if any(w in low.split() for w in ABSOLUTIST_WORDS):
        return "absolute"
    if re.search(r"\b(said|says|announced|admitted|declared|according to)\b", low):
        return "attribution"
    return "factual"


def extract_claims(title: str, body: str, max_claims: int = 5) -> list[dict]:
    """Rank sentences by check-worthiness and return the top ones in document order."""
    sentences = split_sentences(body)
    scored: list[tuple[float, int, str]] = []
    for idx, s in enumerate(sentences):
        words = s.split()
        if not 8 <= len(words) <= 55 or s.endswith("?") or _OPINION.match(s):
            continue
        score = 0.0
        score += 1.0 if _ASSERT.search(s) else 0.0
        score += 1.2 if _NUM.search(s) else 0.0
        score += 0.6 * min(len(_ENTITYISH.findall(s[1:])), 3)
        score += 1.0 if any(c in s.lower() for c in CAUSAL_CUES) else 0.0
        score += 0.8 if any(w in s.lower().split() for w in ABSOLUTIST_WORDS) else 0.0
        score -= 0.4 if s.count('"') >= 2 else 0.0  # pure quotation: attributed speech, less directly checkable
        score -= 2.0 if _FRAMING.search(s) else 0.0
        score += 0.5 if idx < 3 else 0.0  # lede sentences often carry the central claim
        if score >= 1.6:
            scored.append((score, idx, s.strip()))
    top = sorted(scored, key=lambda t: -t[0])[:max_claims]
    top.sort(key=lambda t: t[1])
    claims = [{"text": s, "kind": _kind(s), "score": round(sc, 2)} for sc, _, s in top]
    if not claims and title:  # fall back to the headline as the central claim
        claims.append({"text": title.strip(), "kind": _kind(title), "score": 1.0})
    return claims
