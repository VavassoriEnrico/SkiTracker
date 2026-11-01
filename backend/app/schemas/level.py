from pydantic import BaseModel, ConfigDict


class LevelRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    level_number: int
    name: str | None = None
    explanation: str | None = None
    technical_goal: str | None = None
    video_url: str | None = None
