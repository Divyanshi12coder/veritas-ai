import httpx
import pytest

from app.config import get_settings
from app.schemas import LLMAnalysis
from app.services import llm
from app.services.extractor import ExtractionError, fetch_html, parse_article, validate_public_url
from app.services.source import assess_source, extract_domain


def test_extract_domain():
    assert extract_domain("https://www.reuters.com/world/x") == "reuters.com"
    assert extract_domain("bbc.co.uk/news") == "bbc.co.uk"
    assert extract_domain("") is None


def test_listed_and_flagged_sources():
    good = assess_source("https://www.reuters.com/a", "Jane Doe", None)
    bad = assess_source("https://infowars.com/a", None, None)
    assert good["tier"] == "established" and good["score"] > 80
    assert bad["tier"] == "flagged" and bad["score"] < 20


def test_unlisted_domain_uses_heuristics_and_is_capped():
    s = assess_source("http://real-truth-exposed-24.xyz/x", None, None)
    assert s["tier"] == "unrated" and s["score"] < 35
    ok = assess_source("https://www.cityofexample.gov/news", "Staff", "2024-01-01")
    assert 60 < ok["score"] <= 75


def test_no_url_means_unavailable_not_zero():
    s = assess_source(None, "Author", None)
    assert s["available"] is False and s["score"] is None


@pytest.mark.parametrize("url", [
    "ftp://example.com/x", "file:///etc/passwd", "http://localhost/admin", "http://127.0.0.1:8000/",
    "http://169.254.169.254/latest/meta-data", "http://10.0.0.5/", "https://user:pw@example.com/", "http://[::1]/",
])
def test_ssrf_protection_rejects_unsafe_urls(url):
    with pytest.raises(ExtractionError):
        validate_public_url(url)


def test_redirect_to_private_address_is_blocked(monkeypatch):
    monkeypatch.setattr("app.services.extractor.validate_public_url", lambda u: (_ for _ in ()).throw(ExtractionError("blocked")) if "169.254" in u else u)
    transport = httpx.MockTransport(lambda req: httpx.Response(302, headers={"location": "http://169.254.169.254/"}))
    with pytest.raises(ExtractionError):
        fetch_html("https://news.example.org/a", httpx.Client(transport=transport))


def test_fetch_and_parse_article_with_mock_transport(monkeypatch):
    para = " ".join(["The council announced a new plan for local transport on Tuesday and officials explained the details."] * 3)
    html = (f"<html><head><title>x</title><meta property='og:title' content='Transport plan announced'>"
            f"<meta name='author' content='Jo Writer'><meta property='article:published_time' content='2024-05-01T10:00:00Z'></head>"
            f"<body><nav>menu</nav><article><p>{para}</p><p>{para}</p></article><footer>f</footer></body></html>")
    monkeypatch.setattr("app.services.extractor.validate_public_url", lambda u: u)
    transport = httpx.MockTransport(lambda req: httpx.Response(200, headers={"content-type": "text/html; charset=utf-8"}, text=html))
    url, text = fetch_html("https://news.example.org/a", httpx.Client(transport=transport))
    art = parse_article(text, url)
    assert art["title"] == "Transport plan announced" and art["author"] == "Jo Writer" and art["published_at"].startswith("2024-05-01")
    assert "menu" not in art["body"] and len(art["body"].split()) > 60


def test_parse_article_rejects_pages_without_article_text():
    with pytest.raises(ExtractionError):
        parse_article("<html><head><title>t</title></head><body><p>short</p></body></html>", "https://x.org")


# ----------------------------------------------------------------- LLM layer
def test_llm_disabled_when_no_provider():
    out = llm.analyze({"title": "t", "body": "b"}, {"model_label": "m", "p_fake": 0.5}, [], [], enabled=True)
    assert out.status == "disabled" and "No LLM provider" in out.message


def test_llm_can_be_switched_off_per_request():
    assert llm.analyze({}, {}, [], [], enabled=False).status == "disabled"


def test_parse_llm_json_tolerates_prose_wrapping():
    data = llm.parse_llm_json('Here you go:\n```json\n{"summary": "ok", "red_flags": []}\n```')
    assert data["summary"] == "ok"
    with pytest.raises(ValueError):
        llm.parse_llm_json("no json here")


def test_llm_structured_output_is_validated_and_clamped():
    a = llm.to_analysis({"summary": "S", "red_flags": [{"category": "sensational wording", "description": "d", "quote": "q", "severity": "weird"}] * 9,
                         "claims_review": [{"claim": "c", "assessment": "unverified", "reasoning": "r"}]}, "anthropic", "m")
    assert isinstance(a, LLMAnalysis) and len(a.red_flags) == 6 and a.red_flags[0].severity == "info"


def test_llm_provider_success_and_failure_paths(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "llm_provider", "anthropic")
    monkeypatch.setattr(s, "anthropic_api_key", "test-key-not-real")
    monkeypatch.setattr(llm, "_call_anthropic", lambda prompt: '{"summary": "A summary.", "red_flags": [], "missing_context": ["x"]}')
    ok = llm.analyze({"title": "t", "body": "b"}, {"model_label": "m", "p_fake": 0.3}, [], [], enabled=True)
    assert ok.status == "ok" and ok.summary == "A summary."

    def boom(prompt):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(llm, "_call_anthropic", boom)
    err = llm.analyze({"title": "t", "body": "b"}, {"model_label": "m", "p_fake": 0.3}, [], [], enabled=True)
    assert err.status == "error" and "test-key" not in (err.message or "")
