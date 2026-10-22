"""Optional Hugging Face transformer classifier (DistilBERT / BERT / RoBERTa).

Enabled only when TRANSFORMER_MODEL is set (hub id or local directory produced by ml/train_transformer.py) and the
`transformers` + `torch` packages are installed. It is loaded lazily on first use so API start-up stays fast; if
anything fails, the registry transparently falls back to the classical models and the UI says so.
"""
from __future__ import annotations

import logging
from threading import Lock

from ..nlp.features import combine_title_body
from ..nlp.preprocessing import split_sentences
from .classical import Explanation

log = logging.getLogger(__name__)


class TransformerModel:
    kind = "transformer"
    key = "transformer"

    def __init__(self, model_name: str, fake_label: str):
        self.model_name = model_name
        self.fake_label = fake_label
        self.label = f"Transformer ({model_name.split('/')[-1]})"
        self.description = "Fine-tuned transformer sequence classifier. Explained with sentence-level occlusion."
        self._pipe = None
        self._lock = Lock()

    def _load(self):
        if self._pipe is None:
            with self._lock:
                if self._pipe is None:
                    from transformers import pipeline  # optional heavy dependency

                    log.info("loading transformer %s", self.model_name)
                    self._pipe = pipeline("text-classification", model=self.model_name, truncation=True, max_length=512, top_k=None)
        return self._pipe

    def available(self) -> bool:
        try:
            self._load()
            return True
        except Exception as exc:  # noqa: BLE001
            log.warning("transformer unavailable: %s", exc)
            return False

    def _p_fake(self, texts: list[str]) -> list[float]:
        out = self._load()(texts, batch_size=8)
        probs = []
        for scores in out:
            m = {d["label"]: d["score"] for d in scores}
            probs.append(float(m.get(self.fake_label, 0.0)))
        return probs

    def predict_proba_fake(self, title: str, body: str) -> float:
        return self._p_fake([combine_title_body(title, body)])[0]

    def explain(self, title: str, body: str, top_k: int = 8) -> Explanation:
        sents = split_sentences(body)[:40]
        base_text = combine_title_body(title, " ".join(sents))
        variants = [combine_title_body(title, " ".join(s for j, s in enumerate(sents) if j != i)) for i in range(len(sents))]
        probs = self._p_fake([base_text] + variants)
        base = probs[0]
        deltas = sorted(((base - p, s) for p, s in zip(probs[1:], sents)), key=lambda t: -abs(t[0]))
        fmt = lambda d: {"feature": d[1][:160], "contribution": round(float(d[0]), 4), "kind": "sentence", "value": None}  # noqa: E731
        return Explanation(
            method="Sentence occlusion (change in P(fake) when a sentence is removed)",
            note="Removing a sentence and re-scoring shows which passages the transformer relied on. It is a perturbation analysis, "
                 "not a view into attention weights, and sentences interact.",
            fake=[fmt(d) for d in deltas if d[0] > 0][:top_k],
            real=[fmt(d) for d in deltas if d[0] < 0][:top_k],
        )
