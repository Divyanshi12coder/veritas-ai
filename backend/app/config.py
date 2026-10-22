"""Application settings, loaded from environment variables (see .env.example)."""
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[2]
_DEFAULT_DB = "sqlite:///" + (ROOT_DIR / "data" / "veritrace.db").as_posix()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env", ROOT_DIR / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "Veritrace"
    version: str = "1.0.0"
    environment: str = Field("development", alias="ENVIRONMENT")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    # Database: SQLite for local development, PostgreSQL in production.
    database_url: str = Field(_DEFAULT_DB, alias="DATABASE_URL")

    # CORS
    cors_origins: str = Field("http://localhost:5173,http://127.0.0.1:5173", alias="CORS_ORIGINS")

    # Models / ML
    model_dir: Path = Field(ROOT_DIR / "ml" / "artifacts", alias="MODEL_DIR")
    default_model: str = Field("auto", alias="DEFAULT_MODEL")
    transformer_model: Optional[str] = Field(None, alias="TRANSFORMER_MODEL")  # HF id or local path
    transformer_fake_label: str = Field("LABEL_1", alias="TRANSFORMER_FAKE_LABEL")  # output label meaning FAKE

    # RAG / knowledge
    kb_path: Path = Field(ROOT_DIR / "data" / "kb" / "knowledge_base.json", alias="KB_PATH")
    source_ratings_path: Path = Field(ROOT_DIR / "data" / "kb" / "source_ratings.json", alias="SOURCE_RATINGS_PATH")
    samples_path: Path = Field(ROOT_DIR / "data" / "samples" / "samples.json", alias="SAMPLES_PATH")
    embedding_backend: str = Field("tfidf", alias="EMBEDDING_BACKEND")  # tfidf | sentence-transformers
    embedding_model: str = Field("sentence-transformers/all-MiniLM-L6-v2", alias="EMBEDDING_MODEL")

    # LLM (optional)
    llm_provider: str = Field("none", alias="LLM_PROVIDER")  # none | anthropic | openai
    llm_model: Optional[str] = Field(None, alias="LLM_MODEL")
    anthropic_api_key: Optional[str] = Field(None, alias="ANTHROPIC_API_KEY")
    openai_api_key: Optional[str] = Field(None, alias="OPENAI_API_KEY")
    openai_base_url: str = Field("https://api.openai.com/v1", alias="OPENAI_BASE_URL")
    llm_timeout_s: float = Field(40.0, alias="LLM_TIMEOUT_S")

    # Safety limits
    rate_limit_per_minute: int = Field(40, alias="RATE_LIMIT_PER_MINUTE")
    max_request_bytes: int = Field(300_000, alias="MAX_REQUEST_BYTES")
    fetch_timeout_s: float = Field(10.0, alias="FETCH_TIMEOUT_S")
    fetch_max_bytes: int = Field(2_000_000, alias="FETCH_MAX_BYTES")

    @field_validator("database_url", "cors_origins", mode="before")
    @classmethod
    def _blank_means_default(cls, v, info):
        if isinstance(v, str) and not v.strip():
            return cls.model_fields[info.field_name].default
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_enabled(self) -> bool:
        if self.llm_provider == "anthropic":
            return bool(self.anthropic_api_key)
        if self.llm_provider == "openai":
            return bool(self.openai_api_key)
        return False

    @property
    def llm_model_name(self) -> Optional[str]:
        if self.llm_model:
            return self.llm_model
        return {"anthropic": "claude-haiku-4-5-20251001", "openai": "gpt-4o-mini"}.get(self.llm_provider)


@lru_cache
def get_settings() -> Settings:
    return Settings()
