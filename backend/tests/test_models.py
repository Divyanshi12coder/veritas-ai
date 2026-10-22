import json

import pytest

from app.config import get_settings
from app.services.registry import registry

from .conftest import FAKE_TEXT, REAL_TEXT, needs_models

pytestmark = needs_models


@pytest.fixture(scope="module", autouse=True)
def _load():
    registry.load()


def test_all_classical_models_load_and_predict_valid_probabilities():
    assert set(registry.classical) >= {"tfidf_lr", "tfidf_svm", "stylometric_rf", "stylometric_hgb"}
    for key, m in registry.classical.items():
        p = m.predict_proba_fake("Council approves budget", REAL_TEXT)
        assert 0.0 <= p <= 1.0, key


def test_models_separate_sensational_from_neutral_text():
    for key in ("tfidf_lr", "stylometric_hgb"):
        m = registry.classical[key]
        assert m.predict_proba_fake("SHOCKING: they hid the cure!!!", FAKE_TEXT) > m.predict_proba_fake("Council approves budget", REAL_TEXT), key


def test_linear_explanation_is_exact_decomposition_of_score_direction():
    m = registry.classical["tfidf_lr"]
    ex = m.explain("SHOCKING: they hid the cure!!!", FAKE_TEXT)
    assert ex.fake and all(f["contribution"] > 0 and f["kind"] == "term" for f in ex.fake)
    assert all(f["contribution"] < 0 for f in ex.real)


def test_occlusion_explanation_for_tree_models():
    ex = registry.classical["stylometric_rf"].explain("SHOCKING: they hid the cure!!!", FAKE_TEXT)
    assert ex.fake and all(f["kind"] == "style" for f in ex.fake)


def test_resolve_falls_back_when_transformer_unavailable():
    model, note = registry.resolve("transformer")
    assert model.kind == "classical" and note
    model, note = registry.resolve("auto")
    assert model.key == registry.best_key and note is None


def test_metrics_file_is_internally_consistent():
    metrics = json.loads((get_settings().model_dir / "metrics.json").read_text())
    for key, r in metrics["models"].items():
        (tn, fp), (fn, tp) = r["test"]["confusion_matrix"]
        n = tn + fp + fn + tp
        assert n == r["test"]["n_test"]
        assert abs((tp + tn) / n - r["test"]["accuracy"]) < 1e-9, key
        assert abs(tp / max(tp + fp, 1) - r["test"]["precision"]) < 1e-9, key
        assert abs(tp / max(tp + fn, 1) - r["test"]["recall"]) < 1e-9, key
