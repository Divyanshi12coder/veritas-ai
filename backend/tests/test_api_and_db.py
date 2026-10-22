import pytest

from app import models as orm
from app.schemas import AnalysisResponse

from .conftest import FAKE_TEXT, REAL_TEXT, needs_models

pytestmark = needs_models


def _post(client, title, body, **extra):
    return client.post("/api/analyze", json={"title": title, "body": body, "use_llm": False, **extra})


def test_health_reports_components(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    h = r.json()
    assert h["status"] == "ok" and h["database"] == "ok" and h["rag"]["ready"] is True
    assert "tfidf_lr" in h["models_loaded"] and h["llm"]["configured"] is False


def test_analyze_returns_complete_structured_report(client):
    r = _post(client, "SHOCKING: they hid the cure for cancer!!!", FAKE_TEXT, source_url="http://real-truth-exposed-24.xyz/x")
    assert r.status_code == 200, r.text
    data = r.json()
    AnalysisResponse.model_validate(data)  # contract holds
    assert data["verdict"]["model_kind"] == "classical" and data["verdict"]["model_label"]
    assert 0 <= data["verdict"]["p_fake"] <= 1 and 0 <= data["credibility"]["score"] <= 100
    assert abs(sum(f["effective_weight"] for f in data["credibility"]["factors"]) - 1) < 1e-2
    assert data["llm"]["status"] == "disabled"
    assert data["explanation"]["top_fake_features"] or data["explanation"]["top_real_features"]
    assert data["explanation"]["highlights"], "suspicious phrases should be highlighted"
    assert len(data["models_compared"]) >= 4


def test_fake_style_text_scores_lower_credibility_than_neutral_reporting(client):
    fake = _post(client, "SHOCKING: they hid the cure for cancer!!!", FAKE_TEXT).json()
    real = _post(client, "Council approves library budget after hearing", REAL_TEXT).json()
    assert fake["credibility"]["score"] < real["credibility"]["score"]
    assert fake["verdict"]["p_fake"] > real["verdict"]["p_fake"]


def test_model_selection_and_fallback_note(client):
    one = _post(client, "Council approves budget", REAL_TEXT, model="stylometric_rf").json()
    assert one["verdict"]["model_key"] == "stylometric_rf"
    fb = _post(client, "Council approves budget", REAL_TEXT, model="transformer").json()
    assert fb["verdict"]["model_kind"] == "classical" and "not available" in fb["verdict"]["note"]


def test_analysis_is_persisted_and_retrievable_and_deletable(client):
    created = _post(client, "Council approves budget", REAL_TEXT).json()
    got = client.get(f"/api/analysis/{created['id']}")
    assert got.status_code == 200 and got.json()["article"]["body"].startswith("The city council")
    assert got.json()["verdict"]["p_fake"] == created["verdict"]["p_fake"]
    assert client.delete(f"/api/analysis/{created['id']}").status_code == 204
    assert client.get(f"/api/analysis/{created['id']}").status_code == 404


@pytest.mark.parametrize("payload", [
    {"title": "ab", "body": "x" * 100},
    {"title": "Valid title", "body": "too short"},
    {"title": "Valid title", "body": "word " * 40, "model": "nonexistent"},
    {"body": "word " * 40},
])
def test_validation_errors_are_clean_422(client, payload):
    r = client.post("/api/analyze", json=payload)
    assert r.status_code == 422 and isinstance(r.json()["detail"], str)


def test_too_short_after_cleaning_returns_422_message(client):
    r = _post(client, "A headline", "This text has eighty characters or more but only about twelve actual words in it, sadly.")
    assert r.status_code == 422 and "too short" in r.json()["detail"].lower()


def test_url_analysis_failure_is_graceful_and_does_not_leak(client):
    r = client.post("/api/analyze/url", json={"url": "http://127.0.0.1/api/health"})
    assert r.status_code == 422 and "publicly routable" in r.json()["detail"]
    assert "Traceback" not in r.text


def test_unknown_analysis_404(client):
    assert client.get("/api/analysis/doesnotexist").status_code == 404


def test_history_filtering_and_statistics(client):
    _post(client, "Council approves budget again", REAL_TEXT)
    _post(client, "SHOCKING cure hidden!!!", FAKE_TEXT)
    hist = client.get("/api/history", params={"limit": 5}).json()
    assert hist["total"] >= 2 and len(hist["items"]) <= 5
    q = client.get("/api/history", params={"q": "SHOCKING"}).json()
    assert q["total"] >= 1 and all("SHOCKING" in i["title"] for i in q["items"])
    assert client.get("/api/history", params={"label": "bogus"}).status_code == 422
    st = client.get("/api/statistics").json()
    t = st["totals"]
    assert t["analyzed"] >= 2 and t["likely_misinformation"] + t["uncertain"] + t["likely_reliable"] == t["analyzed"]
    assert sum(b["count"] for b in st["confidence_histogram"]) == t["analyzed"]
    assert st["daily"] and st["recent"]


def test_model_info_has_real_metrics(client):
    info = client.get("/api/model-info").json()
    keys = {m["key"] for m in info["models"]}
    assert {"tfidf_lr", "tfidf_svm", "stylometric_rf", "stylometric_hgb"} <= keys
    best = next(m for m in info["models"] if m["is_default"])
    m = best["metrics"]
    assert m["n_test"] > 1000 and 0.5 < m["accuracy"] <= 1 and len(m["confusion_matrix"]) == 2
    assert info["dataset"]["sizes"]["test"] == m["n_test"] or info["dataset"]["sizes"]["test"] > 0


def test_samples_and_kb_endpoints(client):
    samples = client.get("/api/samples").json()
    assert len(samples) >= 5 and all(len(s["body"]) > 200 for s in samples)
    kb = client.get("/api/kb").json()
    assert len(kb) >= 25 and "statement" in kb[0]


def test_oversized_request_rejected(client):
    r = client.post("/api/analyze", content=b"x" * 400_000, headers={"content-type": "application/json"})
    assert r.status_code == 413


def test_security_headers_present(client):
    assert client.get("/api/health").headers["x-content-type-options"] == "nosniff"


def test_database_cascade_delete(db):
    from app.services import analysis as svc

    res = svc.analyze_article(db, title="Council approves budget", body=REAL_TEXT, use_llm=False)
    assert db.get(orm.Analysis, res.id) is not None
    n_claims = db.query(orm.Claim).filter_by(analysis_id=res.id).count()
    assert n_claims == len(res.claims)
    db.delete(db.get(orm.Analysis, res.id))
    db.commit()
    assert db.query(orm.Claim).filter_by(analysis_id=res.id).count() == 0


def test_rate_limit_returns_429(client, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "rate_limit_per_minute", 2)
    # the middleware reads settings at request time; reset its window by using a unique client address
    codes = [client.post("/api/analyze", json={"title": "x", "body": "y"}, headers={"x-test": str(i)}).status_code for i in range(6)]
    assert 429 in codes
