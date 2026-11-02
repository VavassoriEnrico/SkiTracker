from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db_dependency import get_db
from app.dependency_auth import get_current_user

from app.schemas.ski_instructor import SkiInstructorRead, SkiInstructorUpdate
from app.services.ski_instructor_service import get_or_create_instructor, update_instructor


router = APIRouter(prefix="/ski_instructor", tags=["ski_instructor"])


@router.get("/me", response_model=SkiInstructorRead)
def get_my_instructor(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return get_or_create_instructor(
        db,
        user_id=UUID(current_user["id"]),
        email=current_user.get("email"),
    )


@router.patch("/me", response_model=SkiInstructorRead)
def update_my_instructor(
    payload: SkiInstructorUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return update_instructor(
        db,
        user_id=UUID(current_user["id"]),
        email=current_user.get("email"),
        name=payload.name,
        surname=payload.surname,
        username=payload.username,
        birth_date=payload.birth_date,
    )
