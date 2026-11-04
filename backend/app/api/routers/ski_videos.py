from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from sqlalchemy.orm import Session

from app.db_dependency import get_db
from app.dependency_auth import get_current_user
from app.schemas.ski_videos import SkiVideoCreate, SkiVideoRead, SkiVideoUpdate
from app.services import ski_videos_service

router = APIRouter(prefix="/ski_videos", tags=["ski_videos"])


@router.get("", response_model=list[SkiVideoRead])
def get_lesson_videos(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ski_videos_service.get_videos_by_lesson(db, lesson_id, UUID(current_user["id"]))


@router.post("", response_model=SkiVideoRead, status_code=201)
def create_video(
    payload: SkiVideoCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ski_videos_service.create_video(db, instructor_id=UUID(current_user["id"]), **payload.model_dump())


@router.post("/upload", response_model=SkiVideoRead, status_code=201)
def upload_video(
    lesson_id: int = Form(...),
    file: UploadFile = File(...),
    customer_id: UUID | None = Form(None),
    comment: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ski_videos_service.upload_video(
        db, instructor_id=UUID(current_user["id"]), lesson_id=lesson_id,
        file=file, customer_id=customer_id, comment=comment,
    )


@router.patch("/{video_id}", response_model=SkiVideoRead)
def update_video(
    video_id: int,
    payload: SkiVideoUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    return ski_videos_service.update_video(db, video_id, UUID(current_user["id"]), payload)


@router.delete("/{video_id}", status_code=204)
def delete_video(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    ski_videos_service.delete_video(db, video_id, UUID(current_user["id"]))
    return Response(status_code=204)
