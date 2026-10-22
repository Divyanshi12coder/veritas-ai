"""Rule-based named-entity recognition and keyword extraction (no model download needed)."""
from __future__ import annotations

import math
import re
from collections import Counter

from .lexicons import STOPWORDS
from .preprocessing import split_sentences, stem, tokenize

_CAP_SEQ = re.compile(r"\b(?:[A-Z][a-zA-Z'.-]+)(?:\s+(?:of|the|for|and|de|van|von|&)?\s*[A-Z][a-zA-Z'.-]+)*")
_DATE_RE = re.compile(
    r"\b(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?(?:\s+\d{4})?|(?:19|20)\d{2})\b"
)
_MONEY_RE = re.compile(r"[$€£₹]\s?\d[\d,.]*(?:\s?(?:million|billion|trillion|thousand|crore|lakh))?|\b\d[\d,.]*\s?(?:dollars|euros|pounds|rupees)\b", re.I)
_PERCENT_RE = re.compile(r"\b\d+(?:\.\d+)?\s?(?:%|percent|per cent)", re.I)
_ORG_HINT = re.compile(r"\b(?:Inc|Corp|Corporation|Company|Co|Ltd|LLC|Agency|Administration|Department|Ministry|University|Institute|Committee|Council|Commission|Association|Organization|Organisation|Foundation|Party|Bank|Court|Congress|Senate|Police|Army|Hospital|Network|News|Times|Post)\b")
_PERSON_TITLE = re.compile(r"^(?:Mr|Mrs|Ms|Dr|Prof|President|Senator|Governor|Minister|Judge|Gen|Sen|Rep|Gov|Sir|Dame)\.?\s", re.I)
_FIRST_WORDS = {"The", "A", "An", "In", "On", "At", "He", "She", "It", "They", "We", "This", "That", "These", "Those", "But", "And", "However", "According", "After", "Before", "When", "While", "If", "As", "For", "With", "By", "His", "Her", "Their", "Our", "Its", "Some", "Many", "Most", "No", "There", "What", "Who", "Why", "How", "Mr", "Mrs", "Ms", "Dr"}
_GPE = {
    "United States", "U.S.", "America", "China", "Russia", "India", "Ukraine", "Israel", "Iran", "Canada", "Mexico", "Brazil", "France",
    "Germany", "Britain", "United Kingdom", "England", "Japan", "Australia", "Europe", "Africa", "Asia", "Washington", "London", "Beijing",
    "Moscow", "Paris", "Berlin", "Delhi", "New Delhi", "New York", "California", "Texas", "Florida", "Pakistan", "Turkey", "Egypt",
}


def extract_entities(text: str, limit: int = 14) -> list[dict]:
    counts: Counter[tuple[str, str]] = Counter()
    for sent in split_sentences(text):
        for m in _CAP_SEQ.finditer(sent):
            span = m.group(0).strip(" .'-")
            words = span.split()
            if m.start() == 0 and len(words) == 1 and words[0] in _FIRST_WORDS:
                continue
            if words and words[0] in _FIRST_WORDS and m.start() == 0:
                words = words[1:]
                span = " ".join(words)
            if not span or (len(words) == 1 and (len(span) < 3 or span.lower() in STOPWORDS)):
                continue
            if len(words) == 1 and m.start() == 0:  # sentence-initial single capitalised word is usually not an entity
                continue
            if span in _GPE:
                label = "PLACE"
            elif _ORG_HINT.search(span) or span.isupper():
                label = "ORG"
            elif _PERSON_TITLE.match(m.group(0)) or (len(words) in (2, 3) and all(w[0].isupper() for w in words)):
                label = "PERSON/ORG"
            else:
                label = "PROPER_NOUN"
            counts[(span, label)] += 1
    for rx, label in ((_DATE_RE, "DATE"), (_MONEY_RE, "MONEY"), (_PERCENT_RE, "PERCENT")):
        for m in rx.finditer(text):
            counts[(m.group(0).strip(), label)] += 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0][0]))
    return [{"text": t, "label": lab, "count": c} for (t, lab), c in ranked[:limit]]


def extract_keywords(text: str, idf: dict[str, float] | None = None, limit: int = 10) -> list[dict]:
    """TF-IDF keyword scoring. `idf` comes from the trained vectoriser when available (fallback: raw frequency)."""
    toks = [t for t in tokenize(text) if t[0].isalpha() and t not in STOPWORDS and len(t) > 2]
    if not toks:
        return []
    uni = Counter(toks)
    bi = Counter(f"{a} {b}" for a, b in zip(toks, toks[1:]))
    scores: dict[str, float] = {}
    n = len(toks)
    for term, c in list(uni.items()) + [(k, v) for k, v in bi.items() if v >= 2]:
        tf = 1 + math.log(c)
        w = idf.get(term) if idf else None
        scores[term] = tf * (w if w else (3.0 if " " not in term else 5.0)) * (1.15 if " " in term else 1.0)
    # drop unigrams contained in a higher scoring bigram
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    out, used_stems = [], set()
    for term, sc in ranked:
        stems = {stem(w) for w in term.split()}
        if stems & used_stems and " " not in term:
            continue
        out.append({"term": term, "score": round(sc / max(n, 1) ** 0.15, 3)})
        used_stems |= stems
        if len(out) >= limit:
            break
    return out
