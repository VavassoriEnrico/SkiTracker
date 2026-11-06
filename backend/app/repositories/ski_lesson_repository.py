from datetime import date, time
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.ski_lesson import SkiLesson
from app.models.ski_lesson_customer import SkiLessonCustomer
from app.models.ski_videos import SkiVideo


def get_lessons_by_customer(db: Session, customer_id: UUID) -> list[SkiLesson]:
    return db.query(SkiLesson).join(
        SkiLessonCustomer, SkiLesson.id == SkiLessonCustomer.lesson_id
    ).filter(SkiLessonCustomer.customer_id == customer_id).order_by(
        SkiLesson.lesson_date, SkiLesson.start_time
    ).all()


def get_lessons_by_instructor(db: Session, instructor_id: UUID) -> list[SkiLesson]:
    return db.query(SkiLesson).filter(
        SkiLesson.instructor_id == instructor_id
    ).order_by(SkiLesson.lesson_date, SkiLesson.start_time).all()


def get_lesson_by_instructor_and_customer(
    db: Session, instructor_id: UUID, customer_id: UUID,
) -> list[SkiLesson]:
    return db.query(SkiLesson).join(
        SkiLessonCustomer, SkiLesson.id == SkiLessonCustomer.lesson_id
    ).filter(
        SkiLesson.instructor_id == instructor_id,
        SkiLessonCustomer.customer_id == customer_id,
    ).order_by(SkiLesson.lesson_date, SkiLesson.start_time).all()


def get_customer_ids(db: Session, lesson_id: int) -> list[UUID]:
    participants = db.query(SkiLessonCustomer).filter(
        SkiLessonCustomer.lesson_id == lesson_id
    ).order_by(SkiLessonCustomer.customer_id).all()
    return [participant.customer_id for participant in participants]


def create(
    db: Session,
    *,
    instructor_id: UUID,
    customer_ids: list[UUID],
    lesson_date: date,
    start_time: time,
    end_time: time,
) -> SkiLesson:
    lesson = SkiLesson(
        instructor_id=instructor_id,
        lesson_date=lesson_date,
        start_time=start_time,
        end_time=end_time,
    )
    db.add(lesson)
    db.flush()

    for customer_id in customer_ids:
        participant = SkiLessonCustomer(lesson_id=lesson.id, customer_id=customer_id)
        db.add(participant)
    db.flush()
    return lesson


def has_overlap(db: Session, *, instructor_id: UUID, lesson_date: date, start_time: time, end_time: time) -> bool:
    lesson = db.query(SkiLesson).filter(
        SkiLesson.instructor_id == instructor_id,
        SkiLesson.lesson_date == lesson_date,
        SkiLesson.start_time < end_time,
        SkiLesson.end_time > start_time,
    ).first()
    return lesson is not None


def get_by_id_and_instructor(db: Session, lesson_id: int, instructor_id: UUID) -> SkiLesson | None:
    return db.query(SkiLesson).filter(
        SkiLesson.id == lesson_id,
        SkiLesson.instructor_id == instructor_id,
    ).first()


def delete(db: Session, lesson: SkiLesson) -> None:
    db.query(SkiVideo).filter(SkiVideo.lesson_id == lesson.id).delete()
    db.query(SkiLessonCustomer).filter(SkiLessonCustomer.lesson_id == lesson.id).delete()
    db.delete(lesson)
