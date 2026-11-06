from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.repositories import ski_lesson_repository, ski_customer_repository, ski_videos_repository
from app.services import ski_videos_service
from app.models.ski_lesson import SkiLesson
from app.schemas.ski_lesson import SkiLessonCreate, SkiLessonRead


def to_lesson_read(db: Session, lesson: SkiLesson) -> SkiLessonRead:
    return SkiLessonRead(
        id=lesson.id,
        lesson_date=lesson.lesson_date,
        start_time=lesson.start_time,
        end_time=lesson.end_time,
        instructor_id=lesson.instructor_id,
        customer_ids=ski_lesson_repository.get_customer_ids(db, lesson.id),
    )


def get_lessons_by_customer_id(db: Session, customer_id: UUID) -> list[SkiLessonRead]:
    lessons = ski_lesson_repository.get_lessons_by_customer(db, customer_id)
    return [to_lesson_read(db, lesson) for lesson in lessons]


def get_lessons_by_instructor_id(db: Session, instructor_id: UUID) -> list[SkiLessonRead]:
    lessons = ski_lesson_repository.get_lessons_by_instructor(db, instructor_id)
    return [to_lesson_read(db, lesson) for lesson in lessons]


def get_lesson(db: Session, lesson_id: int, instructor_id: UUID) -> SkiLessonRead:
    lesson = ski_lesson_repository.get_by_id_and_instructor(db, lesson_id, instructor_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    return to_lesson_read(db, lesson)


def get_lesson_by_instructor_id_and_customer_id(
    db: Session, instructor_id: UUID, customer_id: UUID,
) -> list[SkiLessonRead]:
    lessons = ski_lesson_repository.get_lesson_by_instructor_and_customer(db, instructor_id, customer_id)
    return [to_lesson_read(db, lesson) for lesson in lessons]


def create_lesson(db: Session, *, instructor_id: UUID, payload: SkiLessonCreate) -> SkiLessonRead:
    customers = ski_customer_repository.get_by_ids(db, payload.customer_ids)
    if len(customers) != len(payload.customer_ids):
        raise HTTPException(status_code=404, detail="One or more clients were not found.")
    if ski_lesson_repository.has_overlap(
        db, instructor_id=instructor_id, lesson_date=payload.lesson_date,
        start_time=payload.start_time, end_time=payload.end_time,
    ):
        raise HTTPException(status_code=409, detail="You already have a lesson during this time. Choose another time.")
    try:
        lesson = ski_lesson_repository.create(db, instructor_id=instructor_id, **payload.model_dump())
        db.commit()
    except IntegrityError as error:
        db.rollback()
        # The database checks overlapping times even for simultaneous requests.
        if getattr(error.orig, "sqlstate", None) == "23P01":
            raise HTTPException(status_code=409, detail="You already have a lesson during this time. Choose another time.") from None
        raise
    db.refresh(lesson)
    return to_lesson_read(db, lesson)


def delete_lesson(db: Session, *, lesson_id: int, instructor_id: UUID) -> None:
    lesson = ski_lesson_repository.get_by_id_and_instructor(db, lesson_id, instructor_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")
    for video in ski_videos_repository.get_videos_by_lesson(db, lesson_id):
        ski_videos_service.delete_video_files(video)
    ski_lesson_repository.delete(db, lesson)
    db.commit()
