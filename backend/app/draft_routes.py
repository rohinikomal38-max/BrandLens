from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Draft


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