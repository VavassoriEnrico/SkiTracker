from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

class SkiCustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    email: str | None = None
    profile_image_url: str | None = None
    name: str | None
    surname: str | None
    username: str | None
    sex: str | None
    birth_date: date | None
    level: int | None
    ability: int | None
    
    
class SkiCustomerUpdate(BaseModel):
    name: str | None = None
    surname: str | None = None
    username: str | None = None
    sex: str | None = None
    birth_date: date | None = None
    level: int | None = Field(default=None, ge=1, le=7) 
    ability: int | None = Field(default=None, ge=1, le=3)


class SkiCustomerCreate(SkiCustomerUpdate):
    name: str = Field(min_length=1, max_length=100)
    surname: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: SecretStr = Field(min_length=8, max_length=128)

    @field_validator("name", "surname", "email", mode="before")
    @classmethod
    def trim_required_text(cls, value):
        return value.strip() if isinstance(value, str) else value


class SkiCustomerPhoto(BaseModel):
    image_base64: str = Field(min_length=1, max_length=7 * 1024 * 1024)
