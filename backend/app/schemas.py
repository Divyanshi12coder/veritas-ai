"""Pydantic request/response schemas. This module is the authoritative API contract."""
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

VerdictLabel = Literal["likely_misinformation", "uncertain", "likely_reliable"]
Assessment = Literal["supported", "contradicted", "unverified", "insufficient"]
Severity = Literal["high", "medium", "low", "info"]
ModelKey = Literal["auto", "tfidf_lr", "tfidf_svm", "stylometric_rf", "stylometric_hgb", "transformer"]


# --------------------------------------------------------------------------- requests
class AnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=300)
    body: str = Field(..., min_length=80, max_length=60_000)
    author: Optional[str] = Field(None, max_length=200)
    source_url: Optional[str] = Field(None, max_length=2048)
    model: ModelKey = "auto"
    use_llm: bool = True

    @field_validator("title", "body", "author", "source_url")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v


class AnalyzeUrlRequest(BaseModel):
    url: str = Field(..., min_length=8, max_length=2048)
    model: ModelKey = "auto"
    use_llm: bool = True


# --------------------------------------------------------------------------- response parts
class ArticleInfo(BaseModel):
    title: str
    body: str
    author: Optional[str] = None
    source_url: Optional[str] = None
    domain: Optional[str] = None
    published_at: Optional[str] = None
    word_count: int
    extracted_from_url: bool = False


class Verdict(BaseModel):
    label: VerdictLabel
    display: str
    p_fake: float
    confidence: float
    model_key: str
    model_label: str
    model_kind: str  # "classical" | "transformer"
    note: Optional[str] = None  # e.g. fallback explanation


class CredibilityFactor(BaseModel):
    key: str
    label: str
    score: Optional[float]  # 0-100, higher is always "more credible"; null when unavailable
    weight: float
    effective_weight: float
    available: bool
    description: str
    detail: Optional[str] = None


class Credibility(BaseModel):
    score: int
    band: str
    factors: list[CredibilityFactor]
    methodology: str


class Signal(BaseModel):
    key: str
    label: str
    severity: Severity
    detail: str


class FeatureContribution(BaseModel):
    feature: str
    contribution: float  # positive pushes toward FAKE, negative toward REAL
    kind: Literal["term", "style", "sentence"]
    value: Optional[float] = None


class Highlight(BaseModel):
    text: str
    kind: str
    reason: str


class KeywordScore(BaseModel):
    term: str
    score: float


class EntityMention(BaseModel):
    text: str
    label: str
    count: int


class Explanation(BaseModel):
    method: str
    note: str
    top_fake_features: list[FeatureContribution]
    top_real_features: list[FeatureContribution]
    highlights: list[Highlight]
    keywords: list[KeywordScore]
    entities: list[EntityMention]


class Linguistics(BaseModel):
    word_count: int
    sentence_count: int
    avg_sentence_length: float
    lexical_diversity: float
    flesch_reading_ease: float
    flesch_kincaid_grade: float
    reading_level: str
    sentiment_positive: float
    sentiment_negative: float
    sentiment_compound: float
    sentiment_label: str
    subjectivity: float
    caps_word_ratio: float
    exclamation_count: int
    question_count: int
    emotive_word_ratio: float
    suspicious_phrase_count: int
    attribution_cues: int
    hedging_cues: int
    absolutist_terms: int
    sensationalism_score: float  # 0-100, higher = more sensational


class SourceCheck(BaseModel):
    label: str
    passed: Optional[bool]
    detail: str


class SourceReport(BaseModel):
    domain: Optional[str]
    available: bool
    score: Optional[float]
    tier: str
    name: Optional[str] = None
    notes: list[str] = []
    checks: list[SourceCheck] = []


class EvidenceItem(BaseModel):
    kb_id: str
    title: str
    statement: str
    similarity: float
    source_name: str
    source_url: Optional[str] = None
    relation: Literal["matches_statement", "matches_known_false_claim"]


class ClaimResult(BaseModel):
    id: int
    text: str
    kind: str
    assessment: Assessment
    confidence: float
    rationale: str
    evidence: list[EvidenceItem]


class LLMRedFlag(BaseModel):
    category: str
    description: str
    quote: Optional[str] = None
    severity: Severity = "info"


class LLMClaimReview(BaseModel):
    claim: str
    assessment: str
    reasoning: str


class LLMAnalysis(BaseModel):
    status: Literal["ok", "disabled", "error"]
    provider: Optional[str] = None
    model: Optional[str] = None
    message: Optional[str] = None
    summary: Optional[str] = None
    red_flags: list[LLMRedFlag] = []
    missing_context: list[str] = []
    claims_review: list[LLMClaimReview] = []
    evidence_quality: Optional[str] = None
    uncertainty: Optional[str] = None
    disclaimer: str = (
        "Generated by a language model from the text and retrieved evidence above. "
        "It is a narrative aid, not a faithful trace of the classifier's internals, and may be wrong."
    )


class ModelComparison(BaseModel):
    model_key: str
    label: str
    p_fake: float


class AnalysisResponse(BaseModel):
    id: str
    created_at: datetime
    duration_ms: int
    article: ArticleInfo
    verdict: Verdict
    credibility: Credibility
    signals: list[Signal]
    explanation: Explanation
    linguistics: Linguistics
    source: SourceReport
    claims: list[ClaimResult]
    llm: LLMAnalysis
    models_compared: list[ModelComparison]
    disclaimer: str


# --------------------------------------------------------------------------- history / stats
class HistoryItem(BaseModel):
    id: str
    title: str
    domain: Optional[str]
    label: VerdictLabel
    p_fake: float
    confidence: float
    credibility_score: int
    model_key: str
    created_at: datetime


class HistoryPage(BaseModel):
    items: list[HistoryItem]
    total: int
    limit: int
    offset: int


class Totals(BaseModel):
    analyzed: int
    likely_misinformation: int
    uncertain: int
    likely_reliable: int
    avg_credibility: Optional[float]
    avg_confidence: Optional[float]


class LabelCount(BaseModel):
    label: str
    count: int


class BucketCount(BaseModel):
    bucket: str
    count: int


class DailyPoint(BaseModel):
    date: str
    count: int
    avg_credibility: Optional[float]
    avg_sentiment: Optional[float]
    avg_suspicious_phrases: Optional[float]
    misinformation: int
    reliable: int


class SourceStat(BaseModel):
    domain: str
    count: int
    avg_credibility: float


class PhraseStat(BaseModel):
    phrase: str
    count: int


class ModelUsage(BaseModel):
    model_key: str
    count: int


class Statistics(BaseModel):
    totals: Totals
    distribution: list[LabelCount]
    confidence_histogram: list[BucketCount]
    credibility_histogram: list[BucketCount]
    daily: list[DailyPoint]
    sources: list[SourceStat]
    model_usage: list[ModelUsage]
    top_suspicious_phrases: list[PhraseStat]
    recent: list[HistoryItem]


# --------------------------------------------------------------------------- misc
class SampleArticle(BaseModel):
    id: str
    title: str
    body: str
    author: Optional[str]
    source_url: Optional[str]
    description: str


class KBEntry(BaseModel):
    id: str
    title: str
    topic: str
    statement: str
    common_false_claims: list[str]
    source_name: str
    source_url: Optional[str]


class ModelMetrics(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: Optional[float]
    confusion_matrix: list[list[int]]  # [[TN, FP], [FN, TP]] with FAKE = positive class
    roc_curve: Optional[list[list[float]]] = None  # [[fpr, tpr], ...] downsampled
    n_test: int


class ModelCard(BaseModel):
    key: str
    label: str
    kind: str
    description: str
    available: bool
    is_default: bool
    explainability: str
    metrics: Optional[ModelMetrics] = None
    validation_f1: Optional[float] = None
    trained_at: Optional[str] = None


class ModelInfo(BaseModel):
    models: list[ModelCard]
    dataset: dict
    pipeline_steps: list[str]
    transformer: dict
    caveats: list[str]


class Health(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    database: str
    models_loaded: list[str]
    default_model: Optional[str]
    rag: dict
    llm: dict
    transformer: dict
