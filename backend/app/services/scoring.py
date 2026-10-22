"""Transparent credibility score.

Credibility (0-100, higher = more credible) is a weighted mean of six factors. When a factor cannot be computed
(e.g. no source URL, no checkable claims) it is excluded and the remaining weights are renormalised, so a missing
input never silently counts as 'good' or 'bad'. Every factor, weight and input is returned to the UI.
"""
from __future__ import annotations

from ..schemas import Credibility, CredibilityFactor

WEIGHTS = {
    "linguistic": 0.20,
    "source": 0.20,
    "evidence": 0.20,
    "sensationalism": 0.15,
    "consistency": 0.10,
    "model": 0.15,
}

METHODOLOGY = (
    "Credibility = Σ(weight × factor score) ÷ Σ(weights of available factors). "
    "Weights: linguistic reliability 20%, source credibility 20%, evidence strength 20%, low sensationalism 15%, "
    "headline-body consistency 10%, classifier assessment 15%. Unavailable factors are dropped and the rest renormalised. "
    "Weights are a documented design choice, not learned parameters; they are listed in backend/app/services/scoring.py."
)


def band(score: float) -> str:
    if score >= 75:
        return "High credibility"
    if score >= 55:
        return "Moderate credibility"
    if score >= 35:
        return "Low credibility"
    return "Very low credibility"


def evidence_score(claims: list[dict]) -> tuple[float | None, str]:
    """Share-based evidence score over claims that were actually decided by retrieval."""
    sup = sum(1 for c in claims if c["assessment"] == "supported")
    con = sum(1 for c in claims if c["assessment"] == "contradicted")
    decided = sup + con
    if decided == 0:
        return None, "No claim could be decisively checked against the knowledge base."
    return 100.0 * sup / decided, f"{sup} supported and {con} contradicted of {len(claims)} extracted claims ({len(claims) - decided} unverified/insufficient)."


def compute(*, p_fake_model: float, stylometric_p_fake: float | None, sensationalism: float, source: dict, claims: list[dict],
            title_body_overlap: float, model_label: str) -> Credibility:
    ev_score, ev_detail = evidence_score(claims)
    raw: dict[str, tuple[float | None, str, str, str]] = {
        "linguistic": (
            None if stylometric_p_fake is None else 100.0 * (1 - stylometric_p_fake),
            "Linguistic reliability",
            "Probability that the writing style resembles reliable reporting, from a model trained only on stylistic features (no topic words).",
            "Stylometric model P(real)",
        ),
        "source": (source.get("score") if source.get("available") else None, "Source credibility",
                   "Publisher reputation from the curated seed list, or structural heuristics for unlisted domains.",
                   source.get("name") or source.get("domain") or "No source URL provided"),
        "evidence": (ev_score, "Evidence strength",
                     "Among claims decisively matched in the knowledge base, the share that were supported.", ev_detail),
        "sensationalism": (100.0 - sensationalism, "Restraint (low sensationalism)",
                           "100 minus the sensationalism index (clickbait phrases, emotive words, ALL-CAPS, exclamation, absolutes).",
                           f"Sensationalism index {sensationalism:.0f}/100"),
        "consistency": (min(100.0, 100.0 * title_body_overlap / 0.6), "Headline-body consistency",
                        "How much of the headline's vocabulary is actually developed in the body (low overlap suggests a misleading headline).",
                        f"Headline vocabulary overlap {100 * title_body_overlap:.0f}%"),
        "model": (100.0 * (1 - p_fake_model), "Classifier assessment",
                  "Probability the article is reliable according to the selected classifier.", f"{model_label}: P(real) = {1 - p_fake_model:.2f}"),
    }
    available_weight = sum(WEIGHTS[k] for k, v in raw.items() if v[0] is not None)
    factors: list[CredibilityFactor] = []
    total = 0.0
    for key, (score, label, desc, detail) in raw.items():
        avail = score is not None
        eff = WEIGHTS[key] / available_weight if avail and available_weight else 0.0
        if avail:
            total += eff * float(score)
        factors.append(CredibilityFactor(key=key, label=label, score=None if score is None else round(float(score), 1), weight=WEIGHTS[key],
                                         effective_weight=round(eff, 4), available=avail, description=desc, detail=detail))
    final = int(round(max(0.0, min(100.0, total))))
    return Credibility(score=final, band=band(final), factors=factors, methodology=METHODOLOGY)
