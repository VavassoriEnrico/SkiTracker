from sqlalchemy.orm import Session

from app.repositories import level_abilities_repository
from app.models.level_abilities import LevelAbility

def get_ability_by_number_and_level_id(
    db: Session,
    level_id: int,
    ability_number: int
) -> LevelAbility:
    return level_abilities_repository.get_ability_by_number_and_level_id(
        db, level_id, ability_number
    )