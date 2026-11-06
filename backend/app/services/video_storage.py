import json
from pathlib import Path
from shutil import copyfileobj
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import HTTPException

from app.core.config import settings

BUCKET = "lesson-videos"


def upload(path: str, content: bytes, content_type: str) -> str:
    if not settings.supabase_secret_key:
        raise HTTPException(status_code=503, detail="Supabase secret key is missing.")
    request = Request(
        f"{settings.supabase_url}/storage/v1/object/{BUCKET}/{path}",
        data=content,
        headers={"apikey": settings.supabase_secret_key, "Content-Type": content_type},
        method="POST",
    )
    try:
        with urlopen(request, timeout=120):
            pass
    except (HTTPError, URLError, TimeoutError):
        raise HTTPException(status_code=503, detail="Unable to upload file. Check the lesson-videos bucket, file size limit and allowed file types (video/mp4 and application/json).") from None
    return f"{settings.supabase_url}/storage/v1/object/public/{BUCKET}/{path}"


def download(path: str, destination: Path) -> None:
    request = Request(
        f"{settings.supabase_url}/storage/v1/object/{BUCKET}/{path}",
        headers={"apikey": settings.supabase_secret_key},
    )
    try:
        with urlopen(request, timeout=120) as response, destination.open("wb") as file:
            copyfileobj(response, file)
    except (HTTPError, URLError, TimeoutError):
        raise HTTPException(status_code=503, detail="Unable to download the original video. Try again.") from None


def delete_url(url: str | None) -> None:
    prefix = f"{settings.supabase_url}/storage/v1/object/public/{BUCKET}/"
    if url and url.startswith(prefix):
        delete(url.removeprefix(prefix))


def delete(path: str) -> None:
    request = Request(
        f"{settings.supabase_url}/storage/v1/object/{BUCKET}",
        data=json.dumps({"prefixes": [path]}).encode(),
        headers={"apikey": settings.supabase_secret_key, "Content-Type": "application/json"},
        method="DELETE",
    )
    try:
        with urlopen(request, timeout=15):
            pass
    except (HTTPError, URLError, TimeoutError):
        raise HTTPException(status_code=503, detail="Unable to delete the video from storage. Try again.") from None
