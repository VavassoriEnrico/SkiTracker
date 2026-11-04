from uuid import UUID

from sqlalchemy.orm import Session

from app.models.ski_videos import SkiVideo


def get_videos_by_lesson(db: Session, lesson_id: int) -> list[SkiVideo]:
    return db.query(SkiVideo).filter(SkiVideo.lesson_id == lesson_id).order_by(SkiVideo.created_at).all()

def create(
    db: Session,
    *,
    lesson_id: int,
    video_url: str,
    comment: str | None = None,
    customer_id: UUID | None = None,
    storage_path: str | None = None,
) -> SkiVideo:
    ski_Video = SkiVideo(
        lesson_id = lesson_id,
        video_url = video_url,
        comment = comment,
        customer_id = customer_id,
        storage_path = storage_path,
    ) 
    
    db.add(ski_Video)
    db.flush()
    return ski_Video
    

def delete(db: Session, video: SkiVideo) -> None: 
    db.delete(video)


def get_by_id(db: Session, video_id: int) -> SkiVideo | None:
    return db.query(SkiVideo).filter(SkiVideo.id == video_id).first()


def update_comment(db: Session, video: SkiVideo, comment: str | None) -> SkiVideo:
    video.comment = comment
    db.add(video)
    return video
    
