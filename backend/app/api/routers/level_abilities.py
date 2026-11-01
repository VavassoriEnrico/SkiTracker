from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db_dependency import get_db
from app.schemas.level_abilities import LevelAbilityRead
from app.services.level_abilities_service import get_ability_by_number_and_level_id

router = APIRouter(prefix="/level_ability", tags=["level_ability"])

@router.get("", response_model=LevelAbilityRead)
def get_ability_by_number_and_level(
    db: Session = Depends(get_db),
    level_id: int = Query(ge=1), 
    ability_number: int = Query(ge=1, le=3)
):
    return get_ability_by_number_and_level_id(db, level_id, ability_number)


