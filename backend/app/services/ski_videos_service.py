import logging
from uuid import UUID, uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.ski_videos import SkiVideo
from app.repositories import ski_lesson_repository, ski_videos_repository
from app.schemas.ski_videos import SkiVideoUpdate
from app.services import video_storage

MAX_VIDEO_SIZE = 50 * 1024 * 1024


def check_customer(db: Session, lesson_id: int, customer_id: UUID | None) -> None:
    if customer_id is not None and customer_id not in ski_lesson_repository.get_customer_ids(db, lesson_id):
        raise HTTPException(status_code=400, detail="Choose a client who participates in this lesson.")


def check_lesson_owner(db: Session, lesson_id: int, instructor_id: UUID) -> None:
    lesson = ski_lesson_repository.get_by_id_and_instructor(db, lesson_id, instructor_id)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Lesson not found.")


def get_videos_by_lesson(db: Session, lesson_id: int, instructor_id: UUID) -> list[SkiVideo]:
    check_lesson_owner(db, lesson_id, instructor_id)
    return ski_videos_repository.get_videos_by_lesson(db, lesson_id)


def get_video(db: Session, video_id: int, instructor_id: UUID) -> SkiVideo:
    video = ski_videos_repository.get_by_id(db, video_id)
    if video is None:
        raise HTTPException(status_code=404, detail="Video not found.")
    check_lesson_owner(db, video.lesson_id, instructor_id)
    return video


def create_video(
    db: Session,
    *,
    instructor_id: UUID,
    lesson_id: int,
    video_url: str,
    comment: str | None = None,
    customer_id: UUID | None = None,
    storage_path: str | None = None,
) -> SkiVideo:
    check_lesson_owner(db, lesson_id, instructor_id)
    check_customer(db, lesson_id, customer_id)
    video = ski_videos_repository.create(
        db, lesson_id=lesson_id, video_url=video_url, comment=comment,
        customer_id=customer_id, storage_path=storage_path,
    )
    db.commit()
    db.refresh(video)
    return video


def delete_video(db: Session, video_id: int, instructor_id: UUID) -> None:
    video = get_video(db, video_id, instructor_id)
    if video.storage_path:
        video_storage.delete(video.storage_path)
    ski_videos_repository.delete(db, video)
    db.commit()


def update_comment(
    db: Session,
    video_id: int,
    instructor_id: UUID,
    comment: str | None,
) -> SkiVideo:
    video = get_video(db, video_id, instructor_id)
    ski_videos_repository.update_comment(db, video, comment)
    db.commit()
    db.refresh(video)
    return video


def update_video(db: Session, video_id: int, instructor_id: UUID, payload: SkiVideoUpdate) -> SkiVideo:
    video = get_video(db, video_id, instructor_id)
    if "customer_id" in payload.model_fields_set:
        check_customer(db, video.lesson_id, payload.customer_id)
        video.customer_id = payload.customer_id
    if "comment" in payload.model_fields_set:
        ski_videos_repository.update_comment(db, video, payload.comment)
    db.commit()
    db.refresh(video)
    return video


def upload_video(
    db: Session, *, instructor_id: UUID, lesson_id: int, file: UploadFile,
    customer_id: UUID | None = None, comment: str | None = None,
) -> SkiVideo:
    check_lesson_owner(db, lesson_id, instructor_id)
    check_customer(db, lesson_id, customer_id)
    extensions = {"video/mp4": "mp4", "video/quicktime": "mov", "video/x-m4v": "m4v", "video/webm": "webm"}
    if file.content_type not in extensions:
        raise HTTPException(status_code=400, detail="Choose an MP4, MOV, M4V or WebM video.")
    content = file.file.read(MAX_VIDEO_SIZE + 1)
    if not content or len(content) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="Choose a video smaller than 50 MB and not empty.")
    path = f"{lesson_id}/{uuid4()}.{extensions[file.content_type]}"
    video_url = video_storage.upload(path, content, file.content_type)
    try:
        video = ski_videos_repository.create(
            db, lesson_id=lesson_id, video_url=video_url,
            customer_id=customer_id, comment=comment, storage_path=path,
        )
        db.commit()
    except Exception:
        db.rollback()
        try:
            video_storage.delete(path)
        except HTTPException:
            logging.getLogger(__name__).warning("Unable to clean up an unsuccessful video upload.")
        raise
    db.refresh(video)
    return video
