from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.draft_routes import router as draft_router
from app.decision_routes import router as decision_router
from app.models import BrandRule, Draft, ReviewFinding
from app.review_engine.engine import ReviewEngine
from app.review_engine.models import ApprovedFact
from app.rule_routes import router as rule_router


app = FastAPI(
    title="BrandLens API",
    description="Backend API for the BrandLens brand-governance platform.",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

review_engine = ReviewEngine()

app.include_router(draft_router)
app.include_router(rule_router)
app.include_router(decision_router)

# --------------------------------------------------
# Request Models
# --------------------------------------------------

class ReviewRequest(BaseModel):
    draft_id: int | None = Field(
        default=None,
        gt=0,
        description="ID of an existing draft to associate with this review",
    )

    text: str = Field(
        ...,
        min_length=1,
        max_length=10000,
        description="Marketing content to review",
    )

    forbidden_terms: List[str] = Field(default_factory=list)
    required_terms: List[str] = Field(default_factory=list)
    approved_facts: List[str] = Field(default_factory=list)


# --------------------------------------------------
# Basic API Endpoints
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Welcome to BrandLens API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "BrandLens API",
    }


# --------------------------------------------------
# Review Marketing Content
# --------------------------------------------------

@app.post("/api/review")
def review_content(
    request: ReviewRequest,
    db: Session = Depends(get_db),
):
    # Verify that the draft exists if a draft ID was supplied.
    draft = None

    if request.draft_id is not None:
        draft = (
            db.query(Draft)
            .filter(Draft.id == request.draft_id)
            .first()
        )

        if draft is None:
            raise HTTPException(
                status_code=404,
                detail="Draft not found",
            )

    # Load active brand rules from the database.
    saved_rules = (
        db.query(BrandRule)
        .filter(BrandRule.is_active.is_(True))
        .all()
    )

    # Combine saved rules with rules supplied in the request.
    forbidden_terms = list(request.forbidden_terms)
    required_terms = list(request.required_terms)

    approved_facts = [
        ApprovedFact(statement=fact)
        for fact in request.approved_facts
    ]

    for rule in saved_rules:
        if rule.rule_type == "forbidden_term":
            forbidden_terms.append(rule.value)

        elif rule.rule_type == "required_term":
            required_terms.append(rule.value)

        elif rule.rule_type == "approved_fact":
            approved_facts.append(
                ApprovedFact(
                    statement=rule.value,
                    source=rule.description,
                )
            )

    # Run the existing review engine.
    result = review_engine.review(
        text=request.text,
        forbidden_terms=forbidden_terms,
        required_terms=required_terms,
        approved_facts=approved_facts,
    )

    # Save the latest findings and update the review status.
    try:
        if draft is not None:
            # Remove findings from the previous review.
            db.query(ReviewFinding).filter(
                ReviewFinding.draft_id == draft.id
            ).delete(synchronize_session=False)

            # Save findings from the current review.
            for finding in result.findings:
                saved_finding = ReviewFinding(
                    draft_id=draft.id,
                    finding_type=finding.type,
                    severity=finding.severity,
                    message=finding.message,
                    matched_text=finding.matched_text,
                    explanation=finding.explanation,
                    evidence=finding.evidence,
                    suggestion=finding.suggestion,
                    advisory=finding.advisory,
                    start=finding.start,
                    end=finding.end,
                )

                db.add(saved_finding)

            # Update the automated review status.
            if result.status == "needs_review":
                draft.status = "needs_review"
            elif result.status == "advisory_review":
                draft.status = "advisory_review"
            else:
                draft.status = "reviewed"

            db.add(draft)
            db.commit()

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Review findings and status could not be saved.",
        ) from error

    # Return the review result.
    return {
        "status": result.status,
        "has_issues": result.has_issues,
        "findings": [
            {
                "type": finding.type,
                "severity": finding.severity,
                "message": finding.message,
                "matched_text": finding.matched_text,
                "explanation": finding.explanation,
                "evidence": finding.evidence,
                "suggestion": finding.suggestion,
                "advisory": finding.advisory,
                "start": finding.start,
                "end": finding.end,
            }
            for finding in result.findings
        ],
    }


# --------------------------------------------------
# Retrieve Saved Review Findings for a Draft
# --------------------------------------------------

@app.get("/api/drafts/{draft_id}/findings")
def get_draft_findings(
    draft_id: int,
    db: Session = Depends(get_db),
):
    # Check whether the draft exists.
    draft = (
        db.query(Draft)
        .filter(Draft.id == draft_id)
        .first()
    )

    if draft is None:
        raise HTTPException(
            status_code=404,
            detail="Draft not found",
        )

    # Retrieve saved findings for this draft.
    findings = (
        db.query(ReviewFinding)
        .filter(ReviewFinding.draft_id == draft_id)
        .order_by(ReviewFinding.id.asc())
        .all()
    )

    return {
        "draft_id": draft_id,
        "total_findings": len(findings),
        "findings": [
            {
                "id": finding.id,
                "type": finding.finding_type,
                "severity": finding.severity,
                "message": finding.message,
                "matched_text": finding.matched_text,
                "explanation": finding.explanation,
                "evidence": finding.evidence,
                "suggestion": finding.suggestion,
                "advisory": finding.advisory,
                "start": finding.start,
                "end": finding.end,
            }
            for finding in findings
        ],
    }