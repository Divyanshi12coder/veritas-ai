"""Classical (scikit-learn) model wrappers with built-in, model-appropriate explainability.

Convention everywhere in the project: class 1 == FAKE / misinformation (the positive class).

* tfidf_*        : TF-IDF word 1-2-grams -> linear classifier. Explained exactly through coefficient x tf-idf value.
* stylometric_*  : ~30 hand-crafted linguistic features -> tree ensemble. Explained locally by occlusion
                   (replace one feature with its training median and measure the change in P(fake)).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from ..nlp.features import FEATURE_DESCRIPTIONS, STYLE_FEATURES, combine_title_body, extract_features


@dataclass
class Explanation:
    method: str
    note: str
    fake: list[dict]
    real: list[dict]


class ClassicalModel:
    """Serializable bundle: (vectorizer | None, estimator, metadata). Pickled with joblib."""

    def __init__(self, key: str, label: str, family: str, clf: Any, vectorizer: Any = None,
                 medians: np.ndarray | None = None, description: str = "", coef: np.ndarray | None = None):
        self.key = key
        self.label = label
        self.family = family  # "tfidf" | "stylometric"
        self.clf = clf
        self.vectorizer = vectorizer
        self.medians = medians
        self.description = description
        self.coef = coef  # linear weight vector (n_features,) for TF-IDF models
        self.kind = "classical"
        self._idf: dict[str, float] | None = None

    # ------------------------------------------------------------------ inference
    def _matrix(self, items: list[tuple[str, str]]):
        if self.family == "tfidf":
            return self.vectorizer.transform([combine_title_body(t, b) for t, b in items])
        return np.asarray([extract_features(t, b) for t, b in items], dtype=np.float64)

    def predict_proba_fake(self, title: str, body: str) -> float:
        return float(self.clf.predict_proba(self._matrix([(title, body)]))[0, 1])

    @property
    def idf(self) -> dict[str, float] | None:
        if self.family != "tfidf":
            return None
        if self._idf is None:
            self._idf = dict(zip(self.vectorizer.get_feature_names_out(), self.vectorizer.idf_))
        return self._idf

    # ------------------------------------------------------------------ explainability
    def explain(self, title: str, body: str, top_k: int = 8) -> Explanation:
        if self.family == "tfidf":
            return self._explain_linear(title, body, top_k)
        return self._explain_occlusion(title, body, top_k)

    def _explain_linear(self, title: str, body: str, top_k: int) -> Explanation:
        X = self._matrix([(title, body)])
        names = self.vectorizer.get_feature_names_out()
        coo = X.tocoo()
        contribs = [(names[j], float(v * self.coef[j]), float(v)) for j, v in zip(coo.col, coo.data)]
        fake = sorted([c for c in contribs if c[1] > 0], key=lambda c: -c[1])[:top_k]
        real = sorted([c for c in contribs if c[1] < 0], key=lambda c: c[1])[:top_k]
        fmt = lambda c: {"feature": c[0], "contribution": round(c[1], 4), "kind": "term", "value": round(c[2], 4)}  # noqa: E731
        return Explanation(
            method="Linear model contributions (coefficient × TF-IDF weight)",
            note=(
                "Each term's contribution is its learned weight multiplied by its TF-IDF value in this article. "
                "This is an exact decomposition of the linear model's score, but it reflects statistical associations "
                "in the training corpus, not truth. Terms may encode topic or publisher habits."
            ),
            fake=[fmt(c) for c in fake],
            real=[fmt(c) for c in real],
        )

    def _explain_occlusion(self, title: str, body: str, top_k: int) -> Explanation:
        x = np.asarray(extract_features(title, body), dtype=np.float64)
        rows = np.tile(x, (len(x) + 1, 1))
        for i in range(len(x)):
            rows[i + 1, i] = self.medians[i]
        probs = self.clf.predict_proba(rows)[:, 1]
        base = probs[0]
        deltas = [(STYLE_FEATURES[i], float(base - probs[i + 1]), float(x[i])) for i in range(len(x))]
        fake = sorted([d for d in deltas if d[1] > 1e-4], key=lambda d: -d[1])[:top_k]
        real = sorted([d for d in deltas if d[1] < -1e-4], key=lambda d: d[1])[:top_k]
        fmt = lambda d: {"feature": FEATURE_DESCRIPTIONS.get(d[0], d[0]), "contribution": round(d[1], 4), "kind": "style", "value": round(d[2], 4)}  # noqa: E731
        return Explanation(
            method="Feature occlusion (change in P(fake) when a feature is set to the training median)",
            note=(
                "Local sensitivity analysis: how much would the predicted probability change if this single feature "
                "looked 'typical'? Features interact in tree ensembles, so these are approximate, one-at-a-time effects."
            ),
            fake=[fmt(d) for d in fake],
            real=[fmt(d) for d in real],
        )
