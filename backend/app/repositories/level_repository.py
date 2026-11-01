from sqlalchemy.orm import Session

from app.models.level import Level


def get_by_level_number(db: Session, level_number: int) -> Level | None:
    return db.query(Level).filter(Level.level_number == level_number).first()
