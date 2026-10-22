import pytest

from app.services import scoring
from app.services.claims import extract_claims
from app.services.rag import KnowledgeBase, negation_polarity


@pytest.fixture(scope="module")
def kb():
    return KnowledgeBase()


def test_knowledge_base_builds_a_faiss_index(kb):
    info = kb.info()
    assert info["ready"] and info["kb_entries"] >= 25 and info["vectors"] > info["kb_entries"]


def test_false_claim_is_contradicted_with_evidence(kb):
    r = kb.assess("Vaccines cause autism in young children according to new leaked documents.")
    assert r["assessment"] == "contradicted"
    assert r["evidence"][0]["kb_id"] == "vaccines-autism"
    assert r["evidence"][0]["relation"] == "matches_known_false_claim"


def test_negated_claim_is_supported_not_contradicted(kb):
    r = kb.assess("Vaccines do not cause autism, according to large studies.")
    assert r["assessment"] == "supported"


def test_true_statement_is_supported(kb):
    assert kb.assess("The WHO declared COVID-19 a pandemic on March 11, 2020.")["assessment"] == "supported"


def test_out_of_scope_claim_is_unverified_not_guessed(kb):
    r = kb.assess("The city council voted 5-2 on Tuesday to approve the new library budget.")
    assert r["assessment"] == "unverified" and r["evidence"] == []


def test_negation_polarity():
    assert negation_polarity("vaccines cause autism") == 0
    assert negation_polarity("vaccines don't cause autism") == 1
    assert negation_polarity("there is no evidence that it is not safe") == 0


def test_claim_extraction_prefers_checkable_sentences():
    text = ("I think this is wonderful. The study found that 40 percent of participants improved after treatment. "
            "Did anyone notice? Researchers said the drug causes fewer side effects than the older therapy in Europe.")
    claims = extract_claims("Title", text)
    assert claims and all(len(c["text"].split()) >= 8 for c in claims)
    assert any(c["kind"] == "statistical" for c in claims)


def _src(score=80.0, available=True):
    return {"score": score, "available": available, "name": "X", "domain": "x.com"}


def test_credibility_weights_sum_to_one_and_renormalise():
    kwargs = dict(p_fake_model=0.1, stylometric_p_fake=0.2, sensationalism=10.0, title_body_overlap=0.6, model_label="m")
    full = scoring.compute(source=_src(), claims=[{"assessment": "supported"}], **kwargs)
    assert abs(sum(f.effective_weight for f in full.factors if f.available) - 1.0) < 1e-3
    partial = scoring.compute(source=_src(available=False), claims=[{"assessment": "unverified"}], **kwargs)
    unavailable = [f.key for f in partial.factors if not f.available]
    assert set(unavailable) == {"source", "evidence"}
    assert abs(sum(f.effective_weight for f in partial.factors) - 1.0) < 1e-3
    assert 0 <= full.score <= 100


def test_credibility_is_monotonic_in_model_signal():
    base = dict(stylometric_p_fake=0.5, sensationalism=30.0, title_body_overlap=0.4, model_label="m", source=_src(available=False), claims=[])
    low = scoring.compute(p_fake_model=0.95, **base).score
    high = scoring.compute(p_fake_model=0.05, **base).score
    assert high > low


def test_band_edges():
    assert scoring.band(80) == "High credibility" and scoring.band(10) == "Very low credibility"
