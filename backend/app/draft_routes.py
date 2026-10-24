from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Draft, ReviewDecision


router = APIRouter(prefix="/api/drafts", tags=["Drafts"])


class DraftCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1, max_length=50000)
    content_type: str | None = Field(default=None, max_length=100)


class DraftResponse(BaseModel):
    id: int
    title: str
    content: str
    content_type: str | None
    status: str

    model_config = {"from_attributes": True}


@router.post("/", response_model=DraftResponse, status_code=201)
def create_draft(
    request: DraftCreate,
    db: Session = Depends(get_db),
):
    draft = Draft(
        title=request.title,
        content=request.content,
        content_type=request.content_type,
        status="draft",
    )

    db.add(draft)
    db.commit()
    db.refresh(draft)

    return draft


@router.get("/", response_model=list[DraftResponse])
def list_drafts(db: Session = Depends(get_db)):
    return db.query(Draft).order_by(Draft.id.desc()).all()


@router.get("/{draft_id}", response_model=DraftResponse)
def get_draft(
    draft_id: int,
    db: Session = Depends(get_db),
):
    draft = db.query(Draft).filter(Draft.id == draft_id).first()

    if draft is None:
        raise HTTPException(status_code=404, detail="Draft not found")

    return draft
class ReviewDecisionCreate(BaseModel):
    decision: str = Field(
        ...,
        pattern="^(approved|changes_requested)$",
    )
    reviewer: str | None = Field(default=None, max_length=200)
    comments: str | None = Field(default=None, max_length=5000)


class ReviewDecisionResponse(BaseModel):
    id: int
    draft_id: int
    decision: str
    reviewer: str | None
    comments: str | None

    model_config = {"from_attributes": True}


@router.post(
    "/{draft_id}/decisions",
    response_model=ReviewDecisionResponse,
    status_code=201,
)
def create_review_decision(
    draft_id: int,
    request: ReviewDecisionCreate,
    db: Session = Depends(get_db),
):
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

    decision = ReviewDecision(
        draft_id=draft_id,
        decision=request.decision,
        reviewer=request.reviewer,
        comments=request.comments,
    )

    db.add(decision)

    if request.decision == "approved":
        draft.status = "approved"
    else:
        draft.status = "changes_requested"

    try:
        db.commit()
        db.refresh(decision)
    except Exception as error:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Review decision could not be saved.",
        ) from error

    return decision


@router.get(
    "/{draft_id}/decisions",
    response_model=list[ReviewDecisionResponse],
)
def get_review_decisions(
    draft_id: int,
    db: Session = Depends(get_db),
):
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

    return (
        db.query(ReviewDecision)
        .filter(ReviewDecision.draft_id == draft_id)
        .order_by(ReviewDecision.id.desc())
        .all()
    )