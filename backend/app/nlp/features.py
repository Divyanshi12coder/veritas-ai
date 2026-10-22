"""Linguistic / stylometric feature extraction.

`extract_features` returns a fixed-order numeric vector used by the stylometric models and by the
"linguistic profile" shown in the UI. Everything is computed locally with no external model.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

from . import lexicons as L
from .preprocessing import (
    clean_text,
    count_syllables,
    split_sentences,
    tokenize,
    words_only,
)

_ATTRIB_RES = [re.compile(p, re.I) for p in L.ATTRIBUTION_PATTERNS]
_CLICKBAIT_RES = [re.compile(p, re.I) for p in L.CLICKBAIT_TITLE_PATTERNS]
_QUOTE_RE = re.compile(r'"[^"]{3,}"')
_NUM_RE = re.compile(r"\b\d[\d,.]*%?")
_HASHTAG_RE = re.compile(r"#\w+")
_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.I)

STYLE_FEATURES: list[str] = [
    "word_count_log",
    "avg_word_len",
    "sentence_count_log",
    "avg_sentence_len",
    "lexical_diversity",
    "caps_word_ratio",
    "uppercase_char_ratio",
    "exclamation_rate",
    "question_rate",
    "punct_ratio",
    "quote_rate",
    "digit_ratio",
    "flesch_reading_ease",
    "fk_grade",
    "sentiment_pos",
    "sentiment_neg",
    "sentiment_compound",
    "subjectivity",
    "emotive_ratio",
    "intensifier_ratio",
    "hedging_ratio",
    "absolutist_ratio",
    "pronoun_1_2_ratio",
    "attribution_rate",
    "suspicious_phrase_rate",
    "title_len",
    "title_caps_ratio",
    "title_exclaim",
    "title_question",
    "title_clickbait",
    "title_body_overlap",
    "hashtag_rate",
    "url_count",
]

FEATURE_DESCRIPTIONS = {
    "word_count_log": "Article length (log words)",
    "avg_word_len": "Average word length",
    "sentence_count_log": "Number of sentences (log)",
    "avg_sentence_len": "Average sentence length",
    "lexical_diversity": "Lexical diversity (type/token ratio)",
    "caps_word_ratio": "Share of ALL-CAPS words",
    "uppercase_char_ratio": "Share of uppercase characters",
    "exclamation_rate": "Exclamation marks per sentence",
    "question_rate": "Question marks per sentence",
    "punct_ratio": "Punctuation density",
    "quote_rate": "Direct quotations per sentence",
    "digit_ratio": "Share of numeric tokens",
    "flesch_reading_ease": "Flesch reading ease",
    "fk_grade": "Flesch-Kincaid grade level",
    "sentiment_pos": "Positive sentiment share",
    "sentiment_neg": "Negative sentiment share",
    "sentiment_compound": "Overall sentiment polarity",
    "subjectivity": "Subjectivity (opinion wording)",
    "emotive_ratio": "Emotive wording share",
    "intensifier_ratio": "Intensifier share",
    "hedging_ratio": "Hedging / caution wording",
    "absolutist_ratio": "Absolutist wording (always, never, everyone)",
    "pronoun_1_2_ratio": "First/second-person pronouns",
    "attribution_rate": "Attributions to sources per sentence",
    "suspicious_phrase_rate": "Suspicious phrases per 100 words",
    "title_len": "Headline length (words)",
    "title_caps_ratio": "Headline ALL-CAPS share",
    "title_exclaim": "Exclamation in headline",
    "title_question": "Question in headline",
    "title_clickbait": "Clickbait headline pattern",
    "title_body_overlap": "Headline/body vocabulary overlap",
    "hashtag_rate": "Hashtags per 100 words",
    "url_count": "Embedded URLs",
}


@dataclass
class TextProfile:
    """Rich profile for display (superset of the numeric feature vector)."""

    features: dict[str, float]
    word_count: int
    sentence_count: int
    sentiment_label: str
    reading_level: str
    exclamation_count: int
    question_count: int
    suspicious_phrase_count: int
    attribution_cues: int
    hedging_cues: int
    absolutist_terms: int
    sensationalism_score: float
    suspicious_matches: list[tuple[str, str, str]] = field(default_factory=list)  # (matched text, category, context)


def _ratio(n: float, d: float) -> float:
    return n / d if d else 0.0


def sentiment_scores(tokens: list[str]) -> tuple[float, float, float]:
    """Lexicon sentiment with simple negation flipping and intensifier boosting. Returns (pos, neg, compound)."""
    pos = neg = 0.0
    for i, t in enumerate(tokens):
        w = 1.0
        if i > 0 and tokens[i - 1] in L.INTENSIFIERS:
            w = 1.5
        negated = any(p in {"not", "no", "never", "n't", "without"} or p.endswith("n't") for p in tokens[max(0, i - 3) : i])
        if t in L.POSITIVE_WORDS:
            if negated:
                neg += w
            else:
                pos += w
        elif t in L.NEGATIVE_WORDS:
            if negated:
                pos += 0.5 * w
            else:
                neg += w
    n = max(len(tokens), 1)
    pos_r, neg_r = pos / n, neg / n
    total = pos + neg
    compound = (pos - neg) / math.sqrt((pos - neg) ** 2 + 15) if total else 0.0
    return pos_r, neg_r, compound


def find_suspicious_phrases(text: str) -> list[tuple[str, str, str]]:
    low = text.lower()
    out: list[tuple[str, str, str]] = []
    seen: set[tuple[int, str]] = set()
    for phrase, category in L.SUSPICIOUS_PHRASES:
        start = 0
        while True:
            idx = low.find(phrase, start)
            if idx < 0:
                break
            key = (idx, phrase)
            if key not in seen:
                seen.add(key)
                a, b = max(0, idx - 40), min(len(text), idx + len(phrase) + 40)
                out.append((text[idx : idx + len(phrase)], category, text[a:b].replace("\n", " ")))
            start = idx + len(phrase)
    out.sort(key=lambda m: low.find(m[0].lower()))
    return out


def reading_level(grade: float) -> str:
    if grade <= 6:
        return "Easy (middle-school)"
    if grade <= 10:
        return "Standard (general audience)"
    if grade <= 14:
        return "Advanced (college)"
    return "Very complex (specialist)"


def sentiment_label(compound: float) -> str:
    if compound >= 0.25:
        return "Positive"
    if compound <= -0.25:
        return "Negative"
    return "Neutral"


def profile_text(title: str, body: str) -> TextProfile:
    title_c = clean_text(title, scrub_artifacts=False)
    body_c = clean_text(body)
    sents = split_sentences(body_c)
    toks_raw = tokenize(body_c, lowercase=False)
    toks = [t.lower() for t in toks_raw]
    wtoks = [t for t in toks if t[0].isalpha()]
    n_words = max(len(wtoks), 1)
    n_sent = max(len(sents), 1)

    caps_words = [t for t in toks_raw if len(t) >= 3 and t.isalpha() and t.isupper()]
    n_chars = max(len(body_c), 1)
    upper_chars = sum(1 for c in body_c if c.isupper())
    punct = sum(1 for c in body_c if c in "!?.,;:\"'()-")
    exclam = body_c.count("!")
    quest = body_c.count("?")
    quotes = len(_QUOTE_RE.findall(body_c))
    digits = sum(1 for t in toks if t[0].isdigit())
    syll = sum(count_syllables(w) for w in wtoks)
    asl = n_words / n_sent
    asw = syll / n_words
    flesch = max(-20.0, min(120.0, 206.835 - 1.015 * asl - 84.6 * asw))
    fk = max(0.0, 0.39 * asl + 11.8 * asw - 15.59)
    pos, neg, comp = sentiment_scores(wtoks)
    subj = _ratio(sum(1 for t in wtoks if t in L.SUBJECTIVE_WORDS), n_words)
    emotive = _ratio(sum(1 for t in wtoks if t in L.EMOTIVE_WORDS), n_words)
    intens = _ratio(sum(1 for t in wtoks if t in L.INTENSIFIERS), n_words)
    hedge_n = sum(1 for t in wtoks if t in L.HEDGING_WORDS)
    absol_n = sum(1 for t in wtoks if t in L.ABSOLUTIST_WORDS)
    pron = _ratio(sum(1 for t in wtoks if t in L.FIRST_SECOND_PERSON), n_words)
    attrib = sum(len(r.findall(body_c)) for r in _ATTRIB_RES)
    matches = find_suspicious_phrases(title_c + ". " + body_c)

    t_words = tokenize(title_c, lowercase=False)
    t_alpha = [t for t in t_words if t.isalpha()]
    t_caps = [t for t in t_alpha if len(t) >= 3 and t.isupper()]
    t_low = {t.lower() for t in t_alpha if t.lower() not in L.STOPWORDS}
    b_low = {t for t in wtoks if t not in L.STOPWORDS}
    overlap = _ratio(len(t_low & b_low), len(t_low)) if t_low else 0.0
    clickbait = float(any(r.search(title_c) for r in _CLICKBAIT_RES))

    feats = {
        "word_count_log": math.log1p(n_words),
        "avg_word_len": _ratio(sum(len(w) for w in wtoks), n_words),
        "sentence_count_log": math.log1p(n_sent),
        "avg_sentence_len": asl,
        "lexical_diversity": _ratio(len(set(wtoks)), n_words),
        "caps_word_ratio": _ratio(len(caps_words), n_words),
        "uppercase_char_ratio": upper_chars / n_chars,
        "exclamation_rate": exclam / n_sent,
        "question_rate": quest / n_sent,
        "punct_ratio": punct / n_chars,
        "quote_rate": quotes / n_sent,
        "digit_ratio": digits / max(len(toks), 1),
        "flesch_reading_ease": flesch,
        "fk_grade": fk,
        "sentiment_pos": pos,
        "sentiment_neg": neg,
        "sentiment_compound": comp,
        "subjectivity": subj,
        "emotive_ratio": emotive,
        "intensifier_ratio": intens,
        "hedging_ratio": hedge_n / n_words,
        "absolutist_ratio": absol_n / n_words,
        "pronoun_1_2_ratio": pron,
        "attribution_rate": attrib / n_sent,
        "suspicious_phrase_rate": 100.0 * len(matches) / n_words,
        "title_len": float(len(t_words)),
        "title_caps_ratio": _ratio(len(t_caps), len(t_alpha)),
        "title_exclaim": float("!" in title_c),
        "title_question": float("?" in title_c),
        "title_clickbait": clickbait,
        "title_body_overlap": overlap,
        "hashtag_rate": 100.0 * len(_HASHTAG_RE.findall(body_c)) / n_words,
        "url_count": float(len(_URL_RE.findall(body))),
    }

    # Transparent, bounded sensationalism index (0-100): weighted sum of capped components.
    sens = (
        30 * min(1.0, feats["suspicious_phrase_rate"] / 1.5)
        + 20 * min(1.0, feats["emotive_ratio"] / 0.02)
        + 15 * min(1.0, feats["caps_word_ratio"] / 0.04)
        + 15 * min(1.0, feats["exclamation_rate"] / 0.3)
        + 10 * max(feats["title_caps_ratio"], feats["title_clickbait"], feats["title_exclaim"])
        + 10 * min(1.0, feats["absolutist_ratio"] / 0.015)
    )
    return TextProfile(
        features=feats,
        word_count=len(wtoks),
        sentence_count=len(sents),
        sentiment_label=sentiment_label(comp),
        reading_level=reading_level(fk),
        exclamation_count=exclam,
        question_count=quest,
        suspicious_phrase_count=len(matches),
        attribution_cues=attrib,
        hedging_cues=hedge_n,
        absolutist_terms=absol_n,
        sensationalism_score=round(min(100.0, sens), 1),
        suspicious_matches=matches,
    )


def extract_features(title: str, body: str) -> list[float]:
    f = profile_text(title, body).features
    return [float(f[name]) for name in STYLE_FEATURES]


def combine_title_body(title: str, body: str) -> str:
    return f"{title.strip()}. {body.strip()}" if title else body
