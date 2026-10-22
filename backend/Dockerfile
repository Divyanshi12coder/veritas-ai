# Build from the repository root:  docker build -f backend/Dockerfile -t veritrace-api .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv

COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend backend
COPY ml/artifacts ml/artifacts
COPY data/kb data/kb
COPY data/samples data/samples

RUN useradd --create-home --uid 1001 veritrace && mkdir -p /srv/data && chown -R veritrace /srv
USER veritrace
WORKDIR /srv/backend

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"

# Applies migrations (no-op on an up-to-date database), then serves. PORT is provided by most PaaS hosts.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
