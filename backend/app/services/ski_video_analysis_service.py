import logging
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.graphs.video_analysis_execution import video_analysis_graph
from app.models.ski_videos import SkiVideo
from app.repositories import ski_videos_repository
from app.services import ski_videos_service, video_storage


def analyze_video(db: Session, video_id: int, instructor_id: UUID) -> SkiVideo:
    video = ski_videos_service.get_video(db, video_id, instructor_id)
    if video.skeleton_video_url and video.pose_data_url:
        return video
    if not video.storage_path:
        raise HTTPException(status_code=400, detail="Please upload this video before analyzing it.")

    prefix = f"analysis/{video.id}/{uuid4()}"
    uploaded = []

    try:
        with TemporaryDirectory() as directory:
            source = Path(directory) / "original.mp4"
            video_storage.download(video.storage_path, source)
            result = video_analysis_graph.invoke({
                "video_path": str(source),
                "output_dir": str(Path(directory) / "results"),
            })

            skeleton_path = f"{prefix}/skeleton_only.mp4"
            skeleton_url = video_storage.upload(
                skeleton_path, Path(result["skeleton_path"]).read_bytes(), "video/mp4",
            )
            uploaded.append(skeleton_path)

            pose_path = f"{prefix}/pose_results.json"
            pose_url = video_storage.upload(
                pose_path, Path(result["pose_data_path"]).read_bytes(), "application/json",
            )
            uploaded.append(pose_path)

            ski_videos_repository.save_analysis(db, video, skeleton_url, pose_url)
            db.commit()
    except Exception as error:
        db.rollback()
        for path in uploaded:
            try:
                video_storage.delete(path)
            except HTTPException:
                logging.getLogger(__name__).warning("Unable to clean up an unsuccessful analysis upload.")
        if isinstance(error, HTTPException):
            raise
        logging.getLogger(__name__).exception("Video analysis failed.")
        raise HTTPException(status_code=503, detail="Unable to analyze this video. Please try again.") from None

    db.refresh(video)
    return video
