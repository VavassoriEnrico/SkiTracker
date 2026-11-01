from sqlalchemy.orm import Session

from app.models.level_abilities import LevelAbility

def get_ability_by_number_and_level_id(
    db: Session,
    level_id: int,
    ability_number: int
) -> LevelAbility:
    return db.query(LevelAbility).filter(LevelAbility.level_id == level_id , LevelAbility.ability_number == ability_number).first()