from datetime import date
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.ski_instructor import SkiInstructor
from app.repositories import ski_customer_repository, ski_instructor_repository


def get_or_create_instructor(
    db: Session,
    *,
    user_id: UUID,
    email: str | None = None,
) -> SkiInstructor:
    instructor = ski_instructor_repository.get_by_id(db, user_id)
    
    if instructor is not None: 
        return instructor
    
    if ski_customer_repository.get_by_id(db, user_id) is not None:
        raise HTTPException(status_code=403, detail="This account belongs to a customer.")

    instructor = ski_instructor_repository.create(
        db,
        instructor_id=user_id,
        email=email,
    )
    db.commit()
    db.refresh(instructor)

    
    return instructor




def update_instructor(
    db: Session,
    *,
    user_id: UUID,
    email: str | None = None,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    birth_date: date | None = None,
) -> SkiInstructor:
    instructor = get_or_create_instructor(db, user_id=user_id, email=email)

    ski_instructor_repository.update_fields(
        db,
        instructor,
        name=name,
        surname=surname,
        username=username,
        birth_date=birth_date,
    )
    db.commit()
    db.refresh(instructor)
    
    
    return instructor
