from sqlalchemy import BigInteger, Column, ForeignKey, Text, DateTime, Uuid, func

from app.db.session import Base

class SkiVideo(Base):
    __tablename__ = "ski_lesson_videos"
    
    id = Column(BigInteger, primary_key=True, index=True)
    lesson_id = Column(BigInteger, ForeignKey("ski_lessons.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    video_url = Column(Text, nullable=False)
    comment = Column(Text, nullable=True)
    customer_id = Column(Uuid, ForeignKey("ski_customers.id"), nullable=True)
    storage_path = Column(Text, nullable=True)
    skeleton_video_url = Column(Text, nullable=True)
    pose_data_url = Column(Text, nullable=True)
