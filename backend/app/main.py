"""FastAPI application factory."""
from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.routes import router
from .config import get_settings
from .database import init_db
from .services.analysis import get_kb
from .services.registry import registry

settings = get_settings()
logging.basicConfig(level=settings.log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("veritrace")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.database_url.startswith("sqlite"):
        init_db()  # PostgreSQL deployments run `alembic upgrade head` instead
    registry.load()
    try:
        get_kb()
    except Exception:  # noqa: BLE001
        log.exception("knowledge base failed to initialise")
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Veritrace API",
        version=settings.version,
        description="Explainable misinformation analysis: NLP + ML + source credibility + retrieval + optional LLM reasoning.",
        lifespan=lifespan,
    )
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list, allow_methods=["GET", "POST", "DELETE"],
                       allow_headers=["Content-Type"], max_age=600)

    hits: dict[str, deque[float]] = defaultdict(deque)

    @app.middleware("http")
    async def guard(request: Request, call_next):
        # request-size limit
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > settings.max_request_bytes:
            return JSONResponse({"detail": "Request body too large."}, status_code=413)
        # sliding-window rate limit on the expensive endpoints
        if request.method == "POST" and request.url.path.startswith("/api/analyze") and settings.rate_limit_per_minute > 0:
            ip = request.client.host if request.client else "unknown"
            now = time.monotonic()
            q = hits[ip]
            while q and now - q[0] > 60:
                q.popleft()
            if len(q) >= settings.rate_limit_per_minute:
                return JSONResponse({"detail": "Rate limit exceeded. Please wait a moment."}, status_code=429, headers={"Retry-After": "30"})
            q.append(now)
        start = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Process-Time-ms"] = str(int((time.perf_counter() - start) * 1000))
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError):
        msgs = [f"{'.'.join(str(p) for p in e['loc'][1:])}: {e['msg']}" for e in exc.errors()]
        return JSONResponse({"detail": "; ".join(msgs) or "Invalid request."}, status_code=422)

    @app.exception_handler(Exception)
    async def unhandled(_: Request, exc: Exception):
        log.exception("unhandled error")
        return JSONResponse({"detail": "Internal server error."}, status_code=500)  # never leak internals

    app.include_router(router)
    return app


app = create_app()
