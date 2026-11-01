from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db_dependency import get_db
from app.dependency_auth import get_current_user

from app.schemas.profile import ProfileRead, ProfileUpdate
from app.services.profile_service import get_or_create_profile, update_profile


router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("/me", response_model=ProfileRead)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return get_or_create_profile(
        db,
        user_id=UUID(current_user["id"]),
        email=current_user.get("email"),
    )


@router.patch("/me", response_model=ProfileRead)
def update_my_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return update_profile(
        db,
        user_id=UUID(current_user["id"]),
        email=current_user.get("email"),
        name=payload.name,
        surname=payload.surname,
        username=payload.username,
        birth_date=payload.birth_date,
    )

