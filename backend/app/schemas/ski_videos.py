from pydantic import BaseModel, ConfigDict

from uuid import UUID


class SkiVideoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    lesson_id: int
    video_url: str
    comment: str | None = None
    customer_id: UUID | None = None
    skeleton_video_url: str | None = None
    pose_data_url: str | None = None
    

class SkiVideoUpdate(BaseModel):
    comment: str | None = None
    customer_id: UUID | None = None

class SkiVideoCreate(BaseModel):
    lesson_id: int
    video_url: str
    comment: str | None = None
    customer_id: UUID | None = None
