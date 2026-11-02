from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.ski_instructor import SkiInstructor


def get_by_id(db: Session, instructor_id: UUID) -> SkiInstructor | None:
    return db.query(SkiInstructor).filter(SkiInstructor.id == instructor_id).first()

def create(
    db: Session,
    *,
    instructor_id: UUID,
    email: str | None = None,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    birth_date: date | None = None,
) -> SkiInstructor:
    instructor = SkiInstructor(
        id = instructor_id,
        name = name, 
        surname = surname, 
        email = email,
        username = username, 
        birth_date = birth_date,
    )
    db.add(instructor)
    db.flush()
    return instructor


def update_fields(
    db: Session,
    instructor: SkiInstructor,
    *,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    birth_date: date | None = None,
) -> SkiInstructor:
    if name is not None:
        instructor.name = name
    if surname is not None:
        instructor.surname = surname
    if username is not None:
        instructor.username = username
    if birth_date is not None:
        instructor.birth_date = birth_date

    db.add(instructor)
    return instructor
