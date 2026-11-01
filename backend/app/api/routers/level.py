from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db_dependency import get_db
from app.schemas.level import LevelRead
from app.services.level_service import get_level

router = APIRouter(prefix="/level", tags=["level"])


@router.get("", response_model=LevelRead)
def get_level_by_number(
    level_number: int = Query(ge=1, le=7),
    db: Session = Depends(get_db),
):
    return get_level(db, level_number)
