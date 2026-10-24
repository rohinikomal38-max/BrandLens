from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def current_utc_time():
    return datetime.now(timezone.utc)


class BrandRule(Base):
    __tablename__ = "brand_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    rule_type = Column(String(50), nullable=False)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=current_utc_time,
        nullable=False,
    )


class Draft(Base):
    __tablename__ = "drafts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    content_type = Column(String(100), nullable=True)
    status = Column(String(50), default="draft", nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=current_utc_time,
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=current_utc_time,
        onupdate=current_utc_time,
        nullable=False,
    )

    findings = relationship(
        "ReviewFinding",
        back_populates="draft",
        cascade="all, delete-orphan",
    )
    decisions = relationship(
        "ReviewDecision",
        back_populates="draft",
        cascade="all, delete-orphan",
    )


class ReviewFinding(Base):
    __tablename__ = "review_findings"

    id = Column(Integer, primary_key=True, index=True)
    draft_id = Column(Integer, ForeignKey("drafts.id"), nullable=False)
    finding_type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    matched_text = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    suggestion = Column(Text, nullable=True)
    advisory = Column(Boolean, default=False, nullable=False)
    start = Column(Integer, nullable=True)
    end = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=current_utc_time,
        nullable=False,
    )

    draft = relationship("Draft", back_populates="findings")


class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id = Column(Integer, primary_key=True, index=True)
    draft_id = Column(Integer, ForeignKey("drafts.id"), nullable=False)
    decision = Column(String(50), nullable=False)
    reviewer = Column(String(200), nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=current_utc_time,
        nullable=False,
    )

    draft = relationship("Draft", back_populates="decisions")