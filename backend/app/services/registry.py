"""Model registry: loads classical artifacts at start-up, wires the optional transformer, handles fallback."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import joblib

from ..config import get_settings
from ..ml.classical import ClassicalModel
from ..ml.transformer import TransformerModel

log = logging.getLogger(__name__)

CLASSICAL_KEYS = ["tfidf_lr", "tfidf_svm", "stylometric_rf", "stylometric_hgb"]
EXPLAINABILITY = {
    "tfidf_lr": "Exact per-term contributions (coefficient × TF-IDF).",
    "tfidf_svm": "Per-term contributions from the averaged calibrated linear weights.",
    "stylometric_rf": "Local feature occlusion over 33 linguistic features.",
    "stylometric_hgb": "Local feature occlusion over 33 linguistic features.",
    "transformer": "Sentence-level occlusion (perturbation analysis).",
}


class ModelRegistry:
    def __init__(self) -> None:
        self.classical: dict[str, ClassicalModel] = {}
        self.metrics: dict[str, Any] = {}
        self.best_key: str | None = None
        self.transformer: TransformerModel | None = None
        self._transformer_ok: bool | None = None

    # ------------------------------------------------------------------ loading
    def load(self) -> None:
        s = get_settings()
        mdir = Path(s.model_dir)
        for key in CLASSICAL_KEYS:
            p = mdir / f"{key}.joblib"
            if p.exists():
                try:
                    self.classical[key] = joblib.load(p)
                except Exception as exc:  # noqa: BLE001
                    log.error("failed to load %s: %s", p.name, exc)
        mpath = mdir / "metrics.json"
        if mpath.exists():
            self.metrics = json.loads(mpath.read_text(encoding="utf-8"))
            self.best_key = self.metrics.get("best_model")
        if self.best_key not in self.classical:
            self.best_key = next((k for k in CLASSICAL_KEYS if k in self.classical), None)
        if s.transformer_model:
            self.transformer = TransformerModel(s.transformer_model, s.transformer_fake_label)
        log.info("models loaded: %s (default=%s, transformer=%s)", list(self.classical), self.best_key, bool(self.transformer))

    @property
    def ready(self) -> bool:
        return bool(self.classical)

    def transformer_available(self) -> bool:
        if not self.transformer:
            return False
        if self._transformer_ok is None:  # probe once; the first call pays the load cost
            self._transformer_ok = self.transformer.available()
        return self._transformer_ok

    # ------------------------------------------------------------------ selection
    def resolve(self, requested: str) -> tuple[Any, str | None]:
        """Return (model, fallback_note). Falls back to the best classical model when the request cannot be served."""
        if not self.ready:
            raise RuntimeError("No trained models found. Run `python ml/train.py` first.")
        want = requested if requested != "auto" else (get_settings().default_model if get_settings().default_model != "auto" else None)
        if want == "transformer" or (requested == "auto" and want is None and self.transformer):
            if self.transformer_available():
                return self.transformer, None
            note = "Transformer model is not available on this server; used the classical model instead."
            return self.classical[self.best_key], note
        if want and want in self.classical:
            return self.classical[want], None
        if want and want not in self.classical:
            return self.classical[self.best_key], f"Model '{want}' is not available; used {self.classical[self.best_key].label}."
        return self.classical[self.best_key], None

    def stylometric(self) -> ClassicalModel | None:
        return self.classical.get("stylometric_hgb") or self.classical.get("stylometric_rf")

    def keys(self) -> list[str]:
        return list(self.classical) + (["transformer"] if self.transformer_available() else [])


registry = ModelRegistry()
