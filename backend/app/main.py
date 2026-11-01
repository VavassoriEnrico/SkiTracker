from fastapi import FastAPI

from app.api.routers import profile
from app.api.routers import level
from app.api.routers import level_abilities

app = FastAPI(title="SkiTracker")

app.include_router(profile.router)
app.include_router(level.router)
app.include_router(level_abilities.router)
