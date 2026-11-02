import json
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID

from fastapi import HTTPException

from app.core.config import settings


def _request(method: str, path: str, payload: dict | None = None) -> dict:
    key = settings.supabase_secret_key
    if not key or not settings.supabase_url:
        raise HTTPException(status_code=503, detail="Customer creation is not configured. Add SUPABASE_SECRET_KEY to the backend environment.")
    headers = {"apikey": key, "Content-Type": "application/json"}
    request = Request(
        f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers=headers,
        method=method,
    )
    try:
        with urlopen(request, timeout=5) as response:
            body = response.read()
            return json.loads(body) if body else {}
    except HTTPError as error:
        try:
            body = json.loads(error.read())
            code = body.get("error_code") or body.get("code")
        except (ValueError, AttributeError):
            code = None
        if code in ("email_exists", "user_already_exists") or error.code == 409:
            raise HTTPException(status_code=409, detail="An account with this email already exists.") from None
        if code == "weak_password":
            raise HTTPException(status_code=400, detail="Choose a stronger password for the client.") from None
        if error.code in (400, 422):
            raise HTTPException(status_code=400, detail="Supabase could not create the account. Check the email and password requirements.") from None
        raise HTTPException(status_code=503, detail="Supabase account administration is unavailable. Check the backend secret key and try again.") from None
    except (URLError, OSError, ValueError):
        raise HTTPException(status_code=503, detail="Unable to reach Supabase account administration. Try again.") from None


def create_user(email: str, password: str) -> UUID:
    user = _request("POST", "", {"email": email, "password": password, "email_confirm": True})
    try:
        return UUID(user["id"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status_code=503, detail="Invalid response from Supabase account administration.") from None


def delete_user(user_id: UUID) -> None:
    _request("DELETE", f"/{user_id}")


def upload_customer_photo(customer_id: UUID, photo: bytes) -> str:
    key = settings.supabase_secret_key
    if not key:
        raise HTTPException(status_code=503, detail="Profile photo upload is not configured.")
    path = f"customers-images/{customer_id}/profile.jpg"
    base_url = settings.supabase_url.rstrip("/")
    request = Request(
        f"{base_url}/storage/v1/object/{path}",
        data=photo,
        headers={"apikey": key, "Content-Type": "image/jpeg", "x-upsert": "true", "Cache-Control": "max-age=0"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5):
            pass
    except (HTTPError, URLError, OSError):
        raise HTTPException(status_code=503, detail="Unable to upload the photo. Check Supabase Storage and the customers-images bucket.") from None
    return f"{base_url}/storage/v1/object/public/{path}?v={time.time_ns()}"
