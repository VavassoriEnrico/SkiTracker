from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db_dependency import get_db
from app.dependency_auth import get_current_user
from app.schemas.ski_lesson import SkiLessonCreate, SkiLessonRead
from app.services import ski_lesson_service
from app.services.ski_instructor_service import get_or_create_instructor

router = APIRouter(prefix="/ski_lesson", tags=["ski_lesson"])


@router.get("/instructor/me", response_model=list[SkiLessonRead])
def get_my_instructor_lessons(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ski_lesson_service.get_lessons_by_instructor_id(
        db, instructor_id=UUID(current_user["id"])
    )


@router.get("/customer/me", response_model=list[SkiLessonRead])
def get_my_customer_lessons(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ski_lesson_service.get_lessons_by_customer_id(
        db, customer_id=UUID(current_user["id"])
    )


@router.get("/instructor/me/customer/{customer_id}", response_model=list[SkiLessonRead])
def get_my_lessons_with_customer(
    customer_id: UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ski_lesson_service.get_lesson_by_instructor_id_and_customer_id(
        db,
        instructor_id=UUID(current_user["id"]),
        customer_id=customer_id,
    )


@router.post("", response_model=SkiLessonRead, status_code=201)
def create_my_lesson(
    payload: SkiLessonCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    instructor_id = UUID(current_user["id"])
    get_or_create_instructor(db, user_id=instructor_id, email=current_user.get("email"))
    return ski_lesson_service.create_lesson(db, instructor_id=instructor_id, payload=payload)


@router.delete("/{lesson_id}", status_code=204)
def delete_my_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    instructor_id = UUID(current_user["id"])
    get_or_create_instructor(db, user_id=instructor_id, email=current_user.get("email"))
    ski_lesson_service.delete_lesson(db, lesson_id=lesson_id, instructor_id=instructor_id)
    return Response(status_code=204)
