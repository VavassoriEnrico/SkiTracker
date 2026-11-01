from fastapi import FastAPI

from app.api.routers import profile

app = FastAPI(title="SkiTracker")

app.include_router(profile.router)
