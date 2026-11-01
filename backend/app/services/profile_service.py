from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.repositories import profile_repository


def get_or_create_profile(
    db: Session,
    *,
    user_id: UUID,
    email: str | None = None,
) -> Profile:
    profile = profile_repository.get_by_id(db, user_id)
    
    if profile is not None: 
        return profile
    
    profile = profile_repository.create(
        db,
        profile_id=user_id,
        email=email,
    )
    db.commit()
    db.refresh(profile)

    
    return profile




def update_profile(
    db: Session,
    *,
    user_id: UUID,
    email: str | None = None,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    birth_date: date | None = None,
) -> Profile:
    profile = get_or_create_profile(db, user_id=user_id, email=email)

    profile_repository.update_fields(
        db,
        profile,
        name=name,
        surname=surname,
        username=username,
        birth_date=birth_date,
    )
    db.commit()
    db.refresh(profile)
    
    
    return profile

