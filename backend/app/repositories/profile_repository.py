from datetime import date
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.profile import Profile


def get_by_id(db: Session, profile_id: UUID) -> Profile | None:
    return db.query(Profile).filter(Profile.id == profile_id).first()

def create(
    db: Session,
    *,
    profile_id: UUID,
    email: str | None = None,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    role: str = "ski_instructor",
    birth_date: date | None = None,
) -> Profile:
    profile = Profile(
        id = profile_id,
        name = name, 
        surname = surname, 
        email = email,
        role = role,
        username = username, 
        birth_date = birth_date,
    )
    db.add(profile)
    db.flush()
    return profile


def update_fields(
    db: Session,
    profile: Profile,
    *,
    name: str | None = None,
    surname: str | None = None,
    username: str | None = None,
    birth_date: date | None = None,
) -> Profile:
    if name is not None:
        profile.name = name
    if surname is not None:
        profile.surname = surname
    if username is not None:
        profile.username = username
    if birth_date is not None:
        profile.birth_date = birth_date

    db.add(profile)
    return profile
    
    


