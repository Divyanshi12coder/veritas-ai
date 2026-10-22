"""HTTP routes."""
from __future__ import annotations

import json
import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from .. import models as orm
from ..config import get_settings
from ..database import get_db
from ..schemas import (
    AnalysisResponse,
    AnalyzeRequest,
    AnalyzeUrlRequest,
    BucketCount,
    DailyPoint,
    Health,
    HistoryItem,
    HistoryPage,
    KBEntry,
    LabelCount,
    ModelCard,
    ModelInfo,
    ModelMetrics,
    ModelUsage,
    PhraseStat,
    SampleArticle,
    SourceStat,
    Statistics,
    Totals,
)
from ..services import analysis as analysis_svc
from ..services import llm as llm_svc
from ..services.extractor import ExtractionError, extract_from_url
from ..services.registry import EXPLAINABILITY, registry

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

LABELS = ["likely_misinformation", "uncertain", "likely_reliable"]


# ------------------------------------------------------------------ analysis
def _run(db: Session, **kw) -> AnalysisResponse:
    try:
        return analysis_svc.analyze_article(db, **kw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        log.error("analysis unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="The analysis models are not available on this server.") from exc


@router.post("/analyze", response_model=AnalysisResponse, tags=["analysis"])
def analyze(req: AnalyzeRequest, db: Session = Depends(get_db)):
    return _run(db, title=req.title, body=req.body, author=req.author or None, source_url=req.source_url or None,
                model_key=req.model, use_llm=req.use_llm)


@router.post("/analyze/url", response_model=AnalysisResponse, tags=["analysis"])
def analyze_url(req: AnalyzeUrlRequest, db: Session = Depends(get_db)):
    try:
        art = extract_from_url(req.url)
    except ExtractionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return _run(db, title=art["title"], body=art["body"], author=art["author"], source_url=art["source_url"],
                published_at=art["published_at"], model_key=req.model, use_llm=req.use_llm, extracted_from_url=True)


@router.get("/analysis/{analysis_id}", response_model=AnalysisResponse, tags=["analysis"])
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    res = analysis_svc.load_analysis(db, analysis_id)
    if res is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return res


@router.delete("/analysis/{analysis_id}", status_code=204, tags=["analysis"])
def delete_analysis(analysis_id: str, db: Session = Depends(get_db)):
    an = db.get(orm.Analysis, analysis_id)
    if an is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    art = an.article
    db.delete(an)
    db.flush()
    if not art.analyses:
        db.delete(art)
    db.commit()


# ------------------------------------------------------------------ history & stats
def _item(a: orm.Analysis) -> HistoryItem:
    return HistoryItem(id=a.id, title=a.article.title, domain=a.article.domain, label=a.label, p_fake=a.p_fake, confidence=a.confidence,
                       credibility_score=a.credibility_score, model_key=a.model_key, created_at=a.created_at)


@router.get("/history", response_model=HistoryPage, tags=["history"])
def history(limit: int = Query(20, ge=1, le=100), offset: int = Query(0, ge=0), label: Optional[str] = Query(None),
            q: Optional[str] = Query(None, max_length=100), db: Session = Depends(get_db)):
    stmt = select(orm.Analysis).join(orm.Article).options(joinedload(orm.Analysis.article))
    count = select(func.count()).select_from(orm.Analysis).join(orm.Article)
    if label:
        if label not in LABELS:
            raise HTTPException(status_code=422, detail=f"label must be one of {LABELS}")
        stmt, count = stmt.where(orm.Analysis.label == label), count.where(orm.Analysis.label == label)
    if q:
        like = f"%{q.strip()}%"
        cond = orm.Article.title.ilike(like) | orm.Article.domain.ilike(like)
        stmt, count = stmt.where(cond), count.where(cond)
    rows = db.scalars(stmt.order_by(orm.Analysis.created_at.desc()).limit(limit).offset(offset)).all()
    return HistoryPage(items=[_item(a) for a in rows], total=db.scalar(count) or 0, limit=limit, offset=offset)


def _histogram(values: list[float], edges: list[float], fmt) -> list[BucketCount]:
    out = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        n = sum(1 for v in values if lo <= v < hi or (hi == edges[-1] and v == hi))
        out.append(BucketCount(bucket=fmt(lo, hi), count=n))
    return out


@router.get("/statistics", response_model=Statistics, tags=["statistics"])
def statistics(days: int = Query(90, ge=1, le=365), db: Session = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.scalars(select(orm.Analysis).join(orm.Article).options(joinedload(orm.Analysis.article))
                      .where(orm.Analysis.created_at >= since).order_by(orm.Analysis.created_at.desc()).limit(5000)).all()
    n = len(rows)
    counts = Counter(r.label for r in rows)
    totals = Totals(analyzed=n, likely_misinformation=counts["likely_misinformation"], uncertain=counts["uncertain"],
                    likely_reliable=counts["likely_reliable"],
                    avg_credibility=round(sum(r.credibility_score for r in rows) / n, 1) if n else None,
                    avg_confidence=round(sum(r.confidence for r in rows) / n, 3) if n else None)
    daily_map: dict[str, list[orm.Analysis]] = defaultdict(list)
    for r in rows:
        daily_map[r.created_at.date().isoformat()].append(r)
    daily = []
    for day in sorted(daily_map):
        g = daily_map[day]
        daily.append(DailyPoint(date=day, count=len(g), avg_credibility=round(sum(x.credibility_score for x in g) / len(g), 1),
                                avg_sentiment=round(sum(x.sentiment_compound for x in g) / len(g), 3),
                                avg_suspicious_phrases=round(sum(x.suspicious_phrase_count for x in g) / len(g), 2),
                                misinformation=sum(1 for x in g if x.label == "likely_misinformation"),
                                reliable=sum(1 for x in g if x.label == "likely_reliable")))
    by_domain: dict[str, list[int]] = defaultdict(list)
    for r in rows:
        if r.article.domain:
            by_domain[r.article.domain].append(r.credibility_score)
    sources = sorted((SourceStat(domain=d, count=len(v), avg_credibility=round(sum(v) / len(v), 1)) for d, v in by_domain.items()),
                     key=lambda s: (-s.count, s.domain))[:10]
    phrases: Counter[str] = Counter()
    for r in rows[:500]:
        for h in (r.payload.get("explanation", {}) or {}).get("highlights", []):
            phrases[h["text"].lower()] += 1
    return Statistics(
        totals=totals,
        distribution=[LabelCount(label=l, count=counts[l]) for l in LABELS],
        confidence_histogram=_histogram([r.confidence for r in rows], [0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
                                        lambda lo, hi: f"{int(lo * 100)}-{int(hi * 100)}%"),
        credibility_histogram=_histogram([float(r.credibility_score) for r in rows], [0, 20, 40, 60, 80, 100],
                                         lambda lo, hi: f"{int(lo)}-{int(hi)}"),
        daily=daily, sources=sources,
        model_usage=[ModelUsage(model_key=k, count=v) for k, v in Counter(r.model_key for r in rows).most_common()],
        top_suspicious_phrases=[PhraseStat(phrase=p, count=c) for p, c in phrases.most_common(10)],
        recent=[_item(r) for r in rows[:8]],
    )


# ------------------------------------------------------------------ system
@router.get("/health", response_model=Health, tags=["system"])
def health(db: Session = Depends(get_db)):
    s = get_settings()
    try:
        db.execute(select(1))
        db_state = "ok"
    except Exception:  # noqa: BLE001
        db_state = "unavailable"
    try:
        rag = analysis_svc.get_kb().info()
    except Exception:  # noqa: BLE001
        rag = {"ready": False}
    ok = db_state == "ok" and registry.ready and rag.get("ready", False)
    return Health(status="ok" if ok else "degraded", version=s.version, database=db_state, models_loaded=list(registry.classical),
                  default_model=registry.best_key, rag=rag, llm=llm_svc.provider_info(),
                  transformer={"configured": bool(s.transformer_model), "model": s.transformer_model,
                               "loaded": bool(registry._transformer_ok)})


@router.get("/model-info", response_model=ModelInfo, tags=["system"])
def model_info():
    s = get_settings()
    m = registry.metrics
    cards = []
    for key, mod in registry.classical.items():
        r = (m.get("models") or {}).get(key, {})
        cards.append(ModelCard(key=key, label=mod.label, kind="classical", description=mod.description, available=True,
                               is_default=key == registry.best_key, explainability=EXPLAINABILITY[key],
                               metrics=ModelMetrics(**r["test"]) if r.get("test") else None, validation_f1=r.get("validation_f1"),
                               trained_at=m.get("trained_at")))
    if registry.transformer:
        cards.append(ModelCard(key="transformer", label=registry.transformer.label, kind="transformer",
                               description=registry.transformer.description, available=bool(registry._transformer_ok),
                               is_default=False, explainability=EXPLAINABILITY["transformer"]))
    return ModelInfo(
        models=cards,
        dataset=m.get("dataset", {}),
        pipeline_steps=["Text cleaning & unicode/HTML normalisation", "Agency-dateline and boilerplate scrubbing", "Tokenisation & sentence splitting",
                        "Stop-word handling and Porter stemming (keywords)", "TF-IDF word 1-2-grams (60k features)",
                        "33 stylometric features: readability, sentiment, subjectivity, punctuation, capitalisation, phrases",
                        "Rule-based NER and TF-IDF keyword extraction", "Classification & explainability", "Claim extraction → FAISS retrieval → stance assessment",
                        "Transparent credibility scoring", "Optional LLM structured reasoning"],
        transformer={"configured": bool(s.transformer_model), "model": s.transformer_model, "available": bool(registry._transformer_ok),
                     "how_to_enable": "pip install transformers torch; fine-tune with ml/train_transformer.py; set TRANSFORMER_MODEL to the output directory."},
        caveats=[
            "Trained on a public benchmark whose real/fake articles come from different publishers; models can partly learn publisher style, so scores on other kinds of text are expected to be lower than the benchmark numbers.",
            "Benchmark metrics are measured on a held-out test split of that corpus only.",
            "Source credibility uses an editable seed list and heuristics, not an authoritative rating.",
        ],
    )


@router.get("/samples", response_model=list[SampleArticle], tags=["system"])
def samples():
    p = get_settings().samples_path
    if not p.exists():
        return []
    return [SampleArticle(**x) for x in json.loads(p.read_text(encoding="utf-8"))["samples"]]


@router.get("/kb", response_model=list[KBEntry], tags=["system"])
def knowledge_base():
    return [KBEntry(**{k: e[k] for k in ("id", "title", "topic", "statement", "common_false_claims", "source_name")}, source_url=e.get("source_url"))
            for e in analysis_svc.get_kb().entries]
