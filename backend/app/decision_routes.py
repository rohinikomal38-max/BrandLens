from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ReviewDecision


router = APIRouter(prefix="/api/decisions", tags=["Review Decisions"])


@router.get("/")
def get_all_review_decisions(
    db: Session = Depends(get_db),
):
    decisions = (
        db.query(ReviewDecision)
        .order_by(ReviewDecision.id.desc())
        .all()
    )

    return [
        {
            "id": decision.id,
            "draft_id": decision.draft_id,
            "decision": decision.decision,
            "reviewer": decision.reviewer,
            "comments": decision.comments,
        }
        for decision in decisions
    ]