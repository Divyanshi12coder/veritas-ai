from app.nlp.entities import extract_entities, extract_keywords
from app.nlp.features import STYLE_FEATURES, extract_features, find_suspicious_phrases, profile_text, sentiment_scores

from .conftest import FAKE_TEXT, REAL_TEXT


def test_feature_vector_has_fixed_length_and_is_finite():
    vec = extract_features("Title here", REAL_TEXT)
    assert len(vec) == len(STYLE_FEATURES)
    assert all(v == v and abs(v) < 1e6 for v in vec)


def test_sensational_text_scores_higher_than_neutral_text():
    fake = profile_text("SHOCKING cure they hide!!!", FAKE_TEXT)
    real = profile_text("Council approves library budget", REAL_TEXT)
    assert fake.sensationalism_score > 50 > real.sensationalism_score
    assert fake.suspicious_phrase_count >= 5
    assert real.suspicious_phrase_count == 0
    assert real.attribution_cues > fake.attribution_cues


def test_find_suspicious_phrases_returns_category_and_context():
    hits = find_suspicious_phrases("Share before it's deleted. The deep state wants you asleep.")
    cats = {h[1] for h in hits}
    assert {"urgency", "loaded language"} <= cats


def test_sentiment_handles_negation():
    pos_plain, neg_plain, _ = sentiment_scores(["this", "is", "good"])
    pos_neg, neg_neg, _ = sentiment_scores(["this", "is", "not", "good"])
    assert pos_plain > 0 and neg_plain == 0
    assert neg_neg > 0 and pos_neg == 0


def test_readability_is_reasonable():
    p = profile_text("Plain", "The cat sat on the mat. The dog ran in the sun. It was a good day for all of us today.")
    assert p.features["flesch_reading_ease"] > 80
    assert p.reading_level.startswith("Easy")


def test_entities_and_keywords():
    ents = {e["text"]: e["label"] for e in extract_entities("Reuters reported that Daniel Reyes met the United Nations on March 3, 2021 about $4.2 million.")}
    assert "DATE" in ents.values() and "MONEY" in ents.values()
    assert any("Daniel Reyes" in k for k in ents)
    kws = [k["term"] for k in extract_keywords(REAL_TEXT)]
    assert kws and all(isinstance(t, str) for t in kws)
