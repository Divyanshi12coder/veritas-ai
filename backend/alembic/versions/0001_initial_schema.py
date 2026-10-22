"""initial schema: articles, analyses, claims, evidence

Revision ID: 0001
Revises:
"""
import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "articles",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("body", sa.Text, nullable=False),
        sa.Column("author", sa.String(200)),
        sa.Column("source_url", sa.String(2048)),
        sa.Column("domain", sa.String(255)),
        sa.Column("published_at", sa.String(64)),
        sa.Column("word_count", sa.Integer, nullable=False),
        sa.Column("extracted_from_url", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_articles_domain", "articles", ["domain"])
    op.create_table(
        "analyses",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("article_id", sa.String(32), sa.ForeignKey("articles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(32), nullable=False),
        sa.Column("p_fake", sa.Float, nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("credibility_score", sa.Integer, nullable=False),
        sa.Column("model_key", sa.String(64), nullable=False),
        sa.Column("model_kind", sa.String(32), nullable=False),
        sa.Column("sentiment_compound", sa.Float, nullable=False, server_default="0"),
        sa.Column("suspicious_phrase_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("duration_ms", sa.Integer, nullable=False, server_default="0"),
        sa.Column("llm_status", sa.String(16), nullable=False, server_default="disabled"),
        sa.Column("payload", sa.JSON, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_analyses_article_id", "analyses", ["article_id"])
    op.create_index("ix_analyses_created_at", "analyses", ["created_at"])
    op.create_index("ix_analyses_label", "analyses", ["label"])
    op.create_table(
        "claims",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("analysis_id", sa.String(32), sa.ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("position", sa.Integer, nullable=False),
        sa.Column("text", sa.Text, nullable=False),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("assessment", sa.String(16), nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        sa.Column("rationale", sa.Text, nullable=False),
    )
    op.create_index("ix_claims_analysis_id", "claims", ["analysis_id"])
    op.create_table(
        "evidence",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("claim_id", sa.Integer, sa.ForeignKey("claims.id", ondelete="CASCADE"), nullable=False),
        sa.Column("kb_id", sa.String(64), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("statement", sa.Text, nullable=False),
        sa.Column("similarity", sa.Float, nullable=False),
        sa.Column("source_name", sa.String(200), nullable=False),
        sa.Column("source_url", sa.String(2048)),
        sa.Column("relation", sa.String(40), nullable=False),
    )
    op.create_index("ix_evidence_claim_id", "evidence", ["claim_id"])


def downgrade() -> None:
    op.drop_table("evidence")
    op.drop_table("claims")
    op.drop_table("analyses")
    op.drop_table("articles")
