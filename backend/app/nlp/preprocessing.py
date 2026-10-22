"""Text cleaning, normalisation, tokenisation, stop-word handling and stemming."""
from __future__ import annotations

import html
import re
import unicodedata
from functools import lru_cache

from nltk.stem.porter import PorterStemmer

from .lexicons import STOPWORDS

_URL_RE = re.compile(r"https?://\S+|www\.\S+", re.I)
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
_TOKEN_RE = re.compile(r"[A-Za-z]+(?:'[a-z]+)?|\d+(?:[.,]\d+)*%?")
_SENT_SPLIT_RE = re.compile(r"(?<=[.!?])[\"')\]]*\s+(?=[\"'(\[]?[A-Z0-9])")
_ABBREV = ("Mr.", "Mrs.", "Ms.", "Dr.", "Prof.", "Sr.", "Jr.", "St.", "U.S.", "U.K.", "No.", "Inc.", "Corp.", "Gen.", "Sen.", "Rep.", "Gov.")

# Agency datelines / boilerplate are *dataset artefacts*: "WASHINGTON (Reuters) -" appears in nearly every
# real-news sample of common benchmark corpora, so a model can learn the agency name instead of language.
# We strip them so training and inference both focus on the text itself.
_DATELINE_RE = re.compile(r"^\s*(?:[A-Z][A-Z .,'/-]{2,40}\s*)?\((?:Reuters|AP|AFP|UPI|Bloomberg)\)\s*[-–—:]*\s*", re.M)
_SOURCE_TAG_RE = re.compile(r"\b(?:featured image|image via|photo by|getty images?|read more:?)\b[^\n]*", re.I)
_AGENCY_RE = re.compile(r"\((?:Reuters|AP|AFP)\)|\bReuters\b", re.I)

_stemmer = PorterStemmer()


def normalise_unicode(text: str) -> str:
    text = html.unescape(text)
    text = unicodedata.normalize("NFKC", text)
    replacements = {"�": "'", "‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "..."}
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text


def clean_text(text: str, *, scrub_artifacts: bool = True) -> str:
    """Normalise unicode/HTML/URLs/whitespace. Keeps case and punctuation (needed for stylometric features)."""
    if not text:
        return ""
    text = _TAG_RE.sub(" ", text)
    text = normalise_unicode(text)
    if scrub_artifacts:
        text = _DATELINE_RE.sub("", text)
        text = _SOURCE_TAG_RE.sub("", text)
        text = _AGENCY_RE.sub("", text)
    text = _URL_RE.sub(" ", text)
    text = "".join(ch for ch in text if ch == "\n" or ch == "\t" or unicodedata.category(ch)[0] != "C")
    return _WS_RE.sub(" ", text).strip()


def tokenize(text: str, *, lowercase: bool = True) -> list[str]:
    toks = _TOKEN_RE.findall(text)
    return [t.lower() for t in toks] if lowercase else toks


def words_only(text: str) -> list[str]:
    return [t for t in tokenize(text) if t[0].isalpha()]


def remove_stopwords(tokens: list[str]) -> list[str]:
    return [t for t in tokens if t not in STOPWORDS and len(t) > 2]


@lru_cache(maxsize=50_000)
def stem(token: str) -> str:
    return _stemmer.stem(token)


def stem_tokens(tokens: list[str]) -> list[str]:
    return [stem(t) for t in tokens]


def split_sentences(text: str) -> list[str]:
    if not text:
        return []
    protected = text
    for ab in _ABBREV:
        protected = protected.replace(ab, ab.replace(".", "<dot>"))
    parts = _SENT_SPLIT_RE.split(protected)
    out = []
    for p in parts:
        for line in p.split("\n"):
            s = line.replace("<dot>", ".").strip()
            if s:
                out.append(s)
    return out


def tfidf_preprocessor(text: str) -> str:
    """Preprocessor handed to sklearn's TfidfVectorizer (lower-casing + cleaning; stop-words kept for n-grams)."""
    return clean_text(text).lower()


def count_syllables(word: str) -> int:
    word = word.lower()
    if len(word) <= 3:
        return 1
    word = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", word)
    word = re.sub(r"^y", "", word)
    groups = re.findall(r"[aeiouy]{1,2}", word)
    return max(1, len(groups))
