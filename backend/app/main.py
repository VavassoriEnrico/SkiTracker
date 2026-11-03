from fastapi import FastAPI

from app.api.routers import ski_instructor
from app.api.routers import ski_customer
from app.api.routers import ski_lesson
from app.api.routers import level
from app.api.routers import level_abilities


app = FastAPI(title="SkiTracker")

app.include_router(ski_instructor.router)
app.include_router(ski_customer.router)
app.include_router(ski_lesson.router)
app.include_router(level.router)
app.include_router(level_abilities.router)
