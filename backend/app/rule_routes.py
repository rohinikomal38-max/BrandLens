from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BrandRule


router = APIRouter(prefix="/api/rules", tags=["Brand Rules"])


class BrandRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    rule_type: str = Field(
        ...,
        pattern="^(forbidden_term|required_term|approved_fact)$",
    )
    value: str = Field(..., min_length=1, max_length=5000)
    description: str | None = Field(default=None, max_length=5000)


class BrandRuleResponse(BaseModel):
    id: int
    name: str
    rule_type: str
    value: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}


@router.post("/", response_model=BrandRuleResponse, status_code=201)
def create_rule(
    request: BrandRuleCreate,
    db: Session = Depends(get_db),
):
    rule = BrandRule(
        name=request.name,
        rule_type=request.rule_type,
        value=request.value,
        description=request.description,
        is_active=True,
    )

    db.add(rule)
    db.commit()
    db.refresh(rule)

    return rule


@router.get("/", response_model=list[BrandRuleResponse])
def list_rules(
    db: Session = Depends(get_db),
):
    return (
        db.query(BrandRule)
        .order_by(BrandRule.id.desc())
        .all()
    )


@router.get("/{rule_id}", response_model=BrandRuleResponse)
def get_rule(
    rule_id: int,
    db: Session = Depends(get_db),
):
    rule = db.query(BrandRule).filter(BrandRule.id == rule_id).first()

    if rule is None:
        raise HTTPException(
            status_code=404,
            detail="Brand rule not found",
        )

    return rule