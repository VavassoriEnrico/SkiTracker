from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    name: str | None
    surname: str | None
    username: str | None
    email: str | None
    role: str
    birth_date: date | None
    
    
class ProfileUpdate(BaseModel):
    name: str | None = None
    surname: str | None = None
    username: str | None = None
    birth_date: date | None = None