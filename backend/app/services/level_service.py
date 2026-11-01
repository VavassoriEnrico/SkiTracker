from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.level import Level
from app.repositories import level_repository


def get_level(db: Session, level_number: int) -> Level:
    level = level_repository.get_by_level_number(db, level_number)
    if level is None:
        raise HTTPException(status_code=404, detail="This level has not been added yet.")
    return level
