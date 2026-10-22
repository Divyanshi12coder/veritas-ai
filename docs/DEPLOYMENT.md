# Deployment

Veritrace is two deployable units plus a database:

| Unit | Recommended hosts | Notes |
|---|---|---|
| Frontend (static SPA) | Vercel, Netlify, Cloudflare Pages | Build: `npm run build`, output `dist/` |
| Backend (FastAPI) | Render, Railway, Fly.io (Docker) | `backend/Dockerfile`; health check `GET /api/health` |
| Database | Managed PostgreSQL (Render, Railway, Neon, Supabase) | SQLite is for local development only |

## Production environment variables

| Variable | Where | Value |
|---|---|---|
| `DATABASE_URL` | backend | `postgresql://user:pass@host:5432/veritrace` (the legacy `postgres://` scheme is also accepted) |
| `CORS_ORIGINS` | backend | Your frontend origin(s), comma-separated, e.g. `https://veritrace.vercel.app` |
| `ENVIRONMENT` | backend | `production` |
| `RATE_LIMIT_PER_MINUTE` | backend | Per-IP limit on `POST /api/analyze*` (default 40) |
| `LLM_PROVIDER`, `LLM_MODEL`, `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` | backend | Optional LLM reasoning; leave unset to run fully local |
| `TRANSFORMER_MODEL` | backend | Optional; needs `transformers` + `torch` in the image |
| `VITE_API_BASE_URL` | frontend (build time) | Public URL of the backend, e.g. `https://veritrace-api.onrender.com` |

Set keys in the host's secret manager, never in the repository.

## 1. Database

Create a managed PostgreSQL instance and copy its connection string. The backend container runs `alembic upgrade head` on every start, so the schema is created and kept current automatically.

## 2. Backend

**Render** (Docker web service)

1. New → Web Service → connect the repository.
2. Runtime: Docker. Dockerfile path: `backend/Dockerfile`. Docker context: repository root.
3. Health check path: `/api/health`.
4. Add the environment variables above.

**Railway:** New project → Deploy from repo → set the Dockerfile path to `backend/Dockerfile` → add a PostgreSQL plugin and reference its URL as `DATABASE_URL`.

**Fly.io:**

```bash
fly launch --dockerfile backend/Dockerfile --no-deploy
fly postgres create && fly postgres attach <db-app>
fly secrets set CORS_ORIGINS=https://your-frontend.example
fly deploy
```

The image copies `ml/artifacts/` (the trained models), so no training happens at deploy time. A 512 MB instance is sufficient for the classical models; a transformer needs more.

## 3. Frontend

**Vercel / Netlify:** root directory `frontend`, build command `npm run build`, output `dist`, environment variable `VITE_API_BASE_URL` set to the backend URL. Add a rewrite of all paths to `/index.html` for client-side routing (`frontend/vercel.json` and `frontend/public/_redirects` are included).

## 4. Everything with Docker Compose

```bash
docker compose up --build        # UI http://localhost:8080, API http://localhost:8000/docs
```

Compose runs PostgreSQL, the API, and nginx serving the SPA with `/api` reverse-proxied to the backend.

## Operational notes

- **Health:** `GET /api/health` returns `ok` or `degraded` (database, models or knowledge base unavailable) plus which optional components are active.
- **Scaling:** the API is stateless apart from an in-process rate-limit window; with several replicas, enforce limits at the proxy as well.
- **Retraining:** run `python ml/train.py` locally, commit the new `ml/artifacts/`, redeploy. Artifacts are pickles tied to the pinned scikit-learn version.
- **Security:** only HTTP(S) article URLs resolving to public addresses are fetched; request bodies are capped; errors never include stack traces.
