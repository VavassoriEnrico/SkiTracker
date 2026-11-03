from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from uuid import UUID
from datetime import date, time

class SkiLessonRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    lesson_date: date
    start_time: time
    end_time: time
    instructor_id: UUID
    customer_ids: list[UUID] = Field(min_length=1)
    

class SkiLessonUpdate(BaseModel):
    lesson_date: date
    start_time: time
    end_time: time
    instructor_id: UUID
    customer_ids: list[UUID] = Field(min_length=1)
    
    
    

class SkiLessonCreate(BaseModel):
    lesson_date: date
    start_time: time
    end_time: time
    customer_ids: list[UUID] = Field(min_length=1)

    @field_validator("customer_ids")
    @classmethod
    def unique_customers(cls, values):
        if len(values) != len(set(values)):
            raise ValueError("Choose each client only once.")
        return values

    @model_validator(mode="after")
    def validate_times(self):
        for value in (self.start_time, self.end_time):
            if value.tzinfo is not None:
                raise ValueError("Use local times without a timezone offset.")
            if value.minute not in (0, 30) or value.second or value.microsecond:
                raise ValueError("Choose times in 30-minute intervals.")
        if self.end_time <= self.start_time:
            raise ValueError("End time must be after start time.")
        return self
