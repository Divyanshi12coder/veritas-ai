"""Analysis orchestrator: NLP -> classifier -> explainability -> source -> claims/RAG -> credibility -> LLM -> persistence."""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from .. import models as orm
from ..nlp.entities import extract_entities, extract_keywords
from ..nlp.features import combine_title_body, profile_text
from ..nlp.preprocessing import clean_text
from ..schemas import (
    AnalysisResponse,
    ArticleInfo,
    ClaimResult,
    EntityMention,
    EvidenceItem,
    Explanation,
    FeatureContribution,
    Highlight,
    KeywordScore,
    Linguistics,
    LLMAnalysis,
    ModelComparison,
    Signal,
    SourceCheck,
    SourceReport,
    Verdict,
)
from . import claims as claims_svc
from . import llm as llm_svc
from . import scoring
from .rag import KnowledgeBase
from .registry import registry
from .source import assess_source, extract_domain

log = logging.getLogger(__name__)

DISCLAIMER = (
    "Veritrace provides probabilistic decision support, not an authoritative fact determination. Predictions can be wrong "
    "(false positives and false negatives), retrieved evidence comes from a small curated knowledge base and should be verified "
    "against primary sources, and any LLM commentary may contain errors. Treat results on political or sensitive topics with particular care."
)

FAKE_THRESHOLD = 0.65
REAL_THRESHOLD = 0.35

_kb: KnowledgeBase | None = None


def get_kb() -> KnowledgeBase:
    global _kb
    if _kb is None:
        _kb = KnowledgeBase()
    return _kb


def _verdict(p_fake: float, model, note: str | None) -> Verdict:
    if p_fake >= FAKE_THRESHOLD:
        label, display = "likely_misinformation", "Likely misinformation"
    elif p_fake <= REAL_THRESHOLD:
        label, display = "likely_reliable", "Likely reliable"
    else:
        label, display = "uncertain", "Uncertain: mixed signals"
    return Verdict(label=label, display=display, p_fake=round(p_fake, 4), confidence=round(max(p_fake, 1 - p_fake), 4),
                   model_key=model.key, model_label=model.label, model_kind=model.kind, note=note)


def _signals(profile, claims: list[dict], source: dict) -> list[Signal]:
    f = profile.features
    out: list[Signal] = []

    def add(key, label, sev, detail):
        out.append(Signal(key=key, label=label, severity=sev, detail=detail))

    s = profile.sensationalism_score
    if s >= 55:
        add("sensationalism", "High sensationalism", "high", f"Sensationalism index {s:.0f}/100 (clickbait phrases, emotive words, capitals, exclamation).")
    elif s >= 25:
        add("sensationalism", "Some sensational wording", "medium", f"Sensationalism index {s:.0f}/100.")
    if profile.suspicious_phrase_count:
        cats = sorted({m[1] for m in profile.suspicious_matches})
        add("suspicious_phrases", "Suspicious phrases", "high" if profile.suspicious_phrase_count >= 3 else "medium",
            f"{profile.suspicious_phrase_count} flagged phrase(s): {', '.join(cats)}.")
    if f["emotive_ratio"] >= 0.012:
        add("emotive", "Strong emotional language", "medium", f"{100 * f['emotive_ratio']:.1f}% of words are highly emotive.")
    if f["caps_word_ratio"] >= 0.03 or f["title_caps_ratio"] >= 0.5:
        add("caps", "Heavy use of ALL-CAPS", "medium", "Capitalised words are used for emphasis, a common attention-seeking pattern.")
    if f["title_clickbait"] or f["title_exclaim"]:
        add("headline", "Clickbait-style headline", "medium", "The headline uses a clickbait pattern or exclamation.")
    if f["title_body_overlap"] < 0.25 and f["title_len"] >= 5:
        add("consistency", "Headline weakly supported by body", "medium", f"Only {100 * f['title_body_overlap']:.0f}% of headline terms appear in the body.")
    if profile.word_count >= 120 and profile.attribution_cues == 0:
        add("unattributed", "No attributed sources", "medium", "The text names no sources, studies or officials for its statements.")
    elif profile.attribution_cues >= 3:
        add("attributed", "Statements attributed to sources", "info", f"{profile.attribution_cues} attribution cues (said / according to / reported).")
    if profile.absolutist_terms >= 3:
        add("absolutes", "Absolutist wording", "low", f"{profile.absolutist_terms} absolutist terms (always, never, everyone...).")
    con = [c for c in claims if c["assessment"] == "contradicted"]
    sup = [c for c in claims if c["assessment"] == "supported"]
    if con:
        add("contradicted", f"{len(con)} claim(s) contradict the knowledge base", "high", "Retrieved entries state the opposite of claims made in the article.")
    if sup:
        add("supported", f"{len(sup)} claim(s) match established findings", "info", "Retrieved entries agree with these claims.")
    if source["available"] and source["tier"] in ("flagged", "satire"):
        add("source", "Source flagged in seed list", "high", f"{source.get('name') or source['domain']} is listed as '{source['tier']}'.")
    elif source["available"] and source["tier"] == "established":
        add("source", "Established publisher", "info", f"{source.get('name')} is in the established-source seed list.")
    elif source["available"] and (source["score"] or 50) < 40:
        add("source", "Low-scoring source", "medium", "Structural heuristics for this domain look weak.")
    if not out:
        add("none", "No strong warning signals", "info", "Linguistic and source checks found nothing notable.")
    order = {"high": 0, "medium": 1, "low": 2, "info": 3}
    return sorted(out, key=lambda x: order[x.severity])


def _linguistics(profile) -> Linguistics:
    f = profile.features
    return Linguistics(
        word_count=profile.word_count, sentence_count=profile.sentence_count, avg_sentence_length=round(f["avg_sentence_len"], 1),
        lexical_diversity=round(f["lexical_diversity"], 3), flesch_reading_ease=round(f["flesch_reading_ease"], 1),
        flesch_kincaid_grade=round(f["fk_grade"], 1), reading_level=profile.reading_level,
        sentiment_positive=round(f["sentiment_pos"], 4), sentiment_negative=round(f["sentiment_neg"], 4),
        sentiment_compound=round(f["sentiment_compound"], 3), sentiment_label=profile.sentiment_label,
        subjectivity=round(f["subjectivity"], 4), caps_word_ratio=round(f["caps_word_ratio"], 4),
        exclamation_count=profile.exclamation_count, question_count=profile.question_count, emotive_word_ratio=round(f["emotive_ratio"], 4),
        suspicious_phrase_count=profile.suspicious_phrase_count, attribution_cues=profile.attribution_cues,
        hedging_cues=profile.hedging_cues, absolutist_terms=profile.absolutist_terms, sensationalism_score=profile.sensationalism_score,
    )


def analyze_article(db: Session, *, title: str, body: str, author: str | None = None, source_url: str | None = None,
                    published_at: str | None = None, model_key: str = "auto", use_llm: bool = True,
                    extracted_from_url: bool = False) -> AnalysisResponse:
    t0 = time.perf_counter()
    title, body = clean_text(title, scrub_artifacts=False), body.strip()
    profile = profile_text(title, body)
    if profile.word_count < 30:
        raise ValueError("The article body is too short to analyse (at least ~30 words are needed).")

    model, fallback_note = registry.resolve(model_key)
    p_fake = model.predict_proba_fake(title, body)
    verdict = _verdict(p_fake, model, fallback_note)

    ex = model.explain(title, body)
    tf_model = registry.classical.get("tfidf_lr")
    seen_h: set[str] = set()
    highlights: list[Highlight] = []
    for text, cat, ctx in profile.suspicious_matches:
        if text.lower() in seen_h:
            continue
        seen_h.add(text.lower())
        highlights.append(Highlight(text=text, kind=cat, reason=f"Flagged as '{cat}': …{ctx.strip()}…"))
        if len(highlights) >= 14:
            break
    explanation = Explanation(
        method=ex.method, note=ex.note,
        top_fake_features=[FeatureContribution(**d) for d in ex.fake], top_real_features=[FeatureContribution(**d) for d in ex.real],
        highlights=highlights,
        keywords=[KeywordScore(**k) for k in extract_keywords(combine_title_body(title, body), tf_model.idf if tf_model else None)],
        entities=[EntityMention(**e) for e in extract_entities(body)],
    )

    compared = []
    for key, m in registry.classical.items():
        compared.append(ModelComparison(model_key=key, label=m.label, p_fake=round(m.predict_proba_fake(title, body), 4)))
    sty = registry.stylometric()
    sty_p = next((c.p_fake for c in compared if sty and c.model_key == sty.key), None)

    source = assess_source(source_url, author, published_at)
    kb = get_kb()
    claim_dicts = []
    for i, c in enumerate(claims_svc.extract_claims(title, body), start=1):
        res = kb.assess(c["text"])
        claim_dicts.append({"id": i, "text": c["text"], "kind": c["kind"], **res})
    claim_results = [ClaimResult(id=c["id"], text=c["text"], kind=c["kind"], assessment=c["assessment"], confidence=c["confidence"],
                                 rationale=c["rationale"], evidence=[EvidenceItem(**e) for e in c["evidence"]]) for c in claim_dicts]

    credibility = scoring.compute(p_fake_model=p_fake, stylometric_p_fake=sty_p, sensationalism=profile.sensationalism_score, source=source,
                                  claims=claim_dicts, title_body_overlap=profile.features["title_body_overlap"], model_label=model.label)
    signals = _signals(profile, claim_dicts, source)

    domain = extract_domain(source_url)
    article_info = ArticleInfo(title=title, body=body, author=author, source_url=source_url, domain=domain, published_at=published_at,
                               word_count=profile.word_count, extracted_from_url=extracted_from_url)
    llm_out: LLMAnalysis = llm_svc.analyze(
        {"title": title, "body": body, "author": author, "domain": domain}, verdict.model_dump(),
        [s.model_dump() for s in signals], [c for c in claim_dicts], enabled=use_llm)

    resp = AnalysisResponse(
        id="", created_at=datetime.now(timezone.utc), duration_ms=int((time.perf_counter() - t0) * 1000), article=article_info, verdict=verdict,
        credibility=credibility, signals=signals, explanation=explanation, linguistics=_linguistics(profile),
        source=SourceReport(**{**source, "checks": [SourceCheck(**c) for c in source["checks"]]}), claims=claim_results, llm=llm_out,
        models_compared=compared, disclaimer=DISCLAIMER,
    )
    return persist(db, resp)


# ---------------------------------------------------------------------- persistence
def persist(db: Session, resp: AnalysisResponse) -> AnalysisResponse:
    art = orm.Article(title=resp.article.title, body=resp.article.body, author=resp.article.author, source_url=resp.article.source_url,
                      domain=resp.article.domain, published_at=resp.article.published_at, word_count=resp.article.word_count,
                      extracted_from_url=resp.article.extracted_from_url)
    payload = resp.model_dump(mode="json")
    payload["article"]["body"] = ""  # the body lives on the Article row
    an = orm.Analysis(article=art, label=resp.verdict.label, p_fake=resp.verdict.p_fake, confidence=resp.verdict.confidence,
                      credibility_score=resp.credibility.score, model_key=resp.verdict.model_key, model_kind=resp.verdict.model_kind,
                      sentiment_compound=resp.linguistics.sentiment_compound, suspicious_phrase_count=resp.linguistics.suspicious_phrase_count,
                      duration_ms=resp.duration_ms, llm_status=resp.llm.status, payload=payload)
    for c in resp.claims:
        claim = orm.Claim(position=c.id, text=c.text, kind=c.kind, assessment=c.assessment, confidence=c.confidence, rationale=c.rationale)
        claim.evidence = [orm.Evidence(kb_id=e.kb_id, title=e.title, statement=e.statement, similarity=e.similarity,
                                       source_name=e.source_name, source_url=e.source_url, relation=e.relation) for e in c.evidence]
        an.claims.append(claim)
    db.add(an)
    db.commit()
    resp.id = an.id
    resp.created_at = an.created_at
    stored = dict(an.payload)
    stored["id"] = an.id
    an.payload = stored
    db.commit()
    return resp


def load_analysis(db: Session, analysis_id: str) -> AnalysisResponse | None:
    an = db.get(orm.Analysis, analysis_id)
    if an is None:
        return None
    data = dict(an.payload)
    data["id"] = an.id
    data["created_at"] = an.created_at
    data["article"] = {**data["article"], "body": an.article.body}
    return AnalysisResponse.model_validate(data)
