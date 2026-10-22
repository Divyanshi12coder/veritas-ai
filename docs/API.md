# API reference

Interactive OpenAPI docs are served by the backend at **`/docs`** (Swagger UI) and **`/redoc`**; the machine-readable schema is at `/openapi.json`. The authoritative response models live in [`backend/app/schemas.py`](../backend/app/schemas.py).

Base URL in development: `http://localhost:8000`. All errors are JSON: `{"detail": "<message>"}`.

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/analyze` | Analyse pasted article text |
| `POST` | `/api/analyze/url` | Fetch an article URL, extract it, analyse it |
| `GET` | `/api/analysis/{id}` | Retrieve a stored analysis |
| `DELETE` | `/api/analysis/{id}` | Delete a stored analysis |
| `GET` | `/api/history` | Paginated history (`limit`, `offset`, `label`, `q`) |
| `GET` | `/api/statistics` | Aggregates for the dashboard (`days`) |
| `GET` | `/api/model-info` | Model cards with measured test metrics, dataset provenance, caveats |
| `GET` | `/api/samples` | Built-in sample articles |
| `GET` | `/api/kb` | Entries in the retrieval knowledge base |
| `GET` | `/api/health` | Component health (database, models, RAG, LLM, transformer) |

## `POST /api/analyze`

```bash
curl -s http://localhost:8000/api/analyze -H 'content-type: application/json' -d '{
  "title": "Council approves library budget",
  "body": "The city council voted 5-2 on Tuesday to approve ... (at least 80 characters, ~30 words)",
  "author": "Maria Okafor",
  "source_url": "https://www.example.org/news/library",
  "model": "auto",
  "use_llm": true
}'
```

| Field | Type | Notes |
|---|---|---|
| `title` | string, 3–300 chars | required |
| `body` | string, 80–60 000 chars | required |
| `author`, `source_url` | string | optional |
| `model` | `auto` \| `tfidf_lr` \| `tfidf_svm` \| `stylometric_rf` \| `stylometric_hgb` \| `transformer` | unavailable models fall back to the best classical model and say so in `verdict.note` |
| `use_llm` | bool | LLM commentary is only produced if a provider is configured |

Response (abridged):

```jsonc
{
  "id": "…", "created_at": "…", "duration_ms": 120,
  "verdict": { "label": "likely_misinformation", "display": "Likely misinformation", "p_fake": 0.97, "confidence": 0.97,
               "model_key": "tfidf_lr", "model_label": "TF-IDF + Logistic Regression", "model_kind": "classical", "note": null },
  "credibility": { "score": 21, "band": "Very low credibility", "methodology": "…",
                   "factors": [ { "key": "source", "label": "Source credibility", "score": 22.0, "weight": 0.2, "effective_weight": 0.2, "available": true, "…": "…" } ] },
  "signals": [ { "key": "suspicious_phrases", "label": "Suspicious phrases", "severity": "high", "detail": "…" } ],
  "explanation": { "method": "…", "note": "…", "top_fake_features": [], "top_real_features": [], "highlights": [], "keywords": [], "entities": [] },
  "linguistics": { "sentiment_compound": -0.4, "flesch_reading_ease": 62.1, "sensationalism_score": 71.0, "…": "…" },
  "source": { "domain": "…", "available": true, "score": 22.0, "tier": "unrated", "checks": [] },
  "claims": [ { "id": 1, "text": "…", "assessment": "contradicted", "rationale": "…",
                "evidence": [ { "kb_id": "vaccines-autism", "similarity": 0.82, "source_name": "…", "relation": "matches_known_false_claim" } ] } ],
  "llm": { "status": "disabled", "message": "…" },
  "models_compared": [ { "model_key": "tfidf_svm", "label": "…", "p_fake": 0.95 } ],
  "disclaimer": "…"
}
```

`verdict.label` is derived from `p_fake`: ≥ 0.65 → `likely_misinformation`, ≤ 0.35 → `likely_reliable`, otherwise `uncertain`.

## `POST /api/analyze/url`

```bash
curl -s http://localhost:8000/api/analyze/url -H 'content-type: application/json' -d '{"url": "https://example.org/article", "use_llm": false}'
```

Returns the same `AnalysisResponse` (with `article.extracted_from_url = true`). Returns `422` with a readable message when the URL is unsafe (non-HTTP, credentials, private/loopback addresses), cannot be downloaded, or contains no extractable article text.

## Status codes

| Code | Meaning |
|---|---|
| `200` / `204` | Success |
| `404` | Unknown analysis id |
| `413` | Request body larger than `MAX_REQUEST_BYTES` |
| `422` | Validation or extraction failure (message in `detail`) |
| `429` | Per-IP rate limit exceeded on analysis endpoints |
| `503` | Models not available on the server |
