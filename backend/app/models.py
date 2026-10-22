"""ORM models. The schema is mirrored by the Alembic migration in alembic/versions."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return uuid.uuid4().hex


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    title: Mapped[str] = mapped_column(String(300))
    body: Mapped[str] = mapped_column(Text)
    author: Mapped[Optional[str]] = mapped_column(String(200))
    source_url: Mapped[Optional[str]] = mapped_column(String(2048))
    domain: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    published_at: Mapped[Optional[str]] = mapped_column(String(64))
    word_count: Mapped[int] = mapped_column(Integer)
    extracted_from_url: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    analyses: Mapped[list["Analysis"]] = relationship(back_populates="article", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"
    __table_args__ = (Index("ix_analyses_created_at", "created_at"), Index("ix_analyses_label", "label"))

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    article_id: Mapped[str] = mapped_column(ForeignKey("articles.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(32))
    p_fake: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    credibility_score: Mapped[int] = mapped_column(Integer)
    model_key: Mapped[str] = mapped_column(String(64))
    model_kind: Mapped[str] = mapped_column(String(32))
    sentiment_compound: Mapped[float] = mapped_column(Float, default=0.0)
    suspicious_phrase_count: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    llm_status: Mapped[str] = mapped_column(String(16), default="disabled")
    payload: Mapped[dict] = mapped_column(JSON)  # full AnalysisResponse JSON minus article body
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    article: Mapped[Article] = relationship(back_populates="analyses")
    claims: Mapped[list["Claim"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(32))
    assessment: Mapped[str] = mapped_column(String(16))
    confidence: Mapped[float] = mapped_column(Float)
    rationale: Mapped[str] = mapped_column(Text)

    analysis: Mapped[Analysis] = relationship(back_populates="claims")
    evidence: Mapped[list["Evidence"]] = relationship(back_populates="claim", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("claims.id", ondelete="CASCADE"), index=True)
    kb_id: Mapped[str] = mapped_column(String(64))
    title: Mapped[str] = mapped_column(String(300))
    statement: Mapped[str] = mapped_column(Text)
    similarity: Mapped[float] = mapped_column(Float)
    source_name: Mapped[str] = mapped_column(String(200))
    source_url: Mapped[Optional[str]] = mapped_column(String(2048))
    relation: Mapped[str] = mapped_column(String(40))

    claim: Mapped[Claim] = relationship(back_populates="evidence")
