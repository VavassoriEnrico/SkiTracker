import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID

from fastapi import Header, HTTPException

from app.core.config import settings


def _read_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="missing authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="invalid bearer token")
    return token.strip()


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    token = _read_bearer_token(authorization)

    supabase_url = settings.supabase_url.rstrip("/")
    supabase_api_key = settings.supabase_publishable_key
    if not supabase_url or not supabase_api_key:
        raise HTTPException(status_code=503, detail="supabase auth config missing")

    request = Request(
        url=f"{supabase_url}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": supabase_api_key,
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=3) as response:
            body = response.read()
    except HTTPError as error:
        if error.code in (400, 401, 403):
            raise HTTPException(status_code=401, detail="invalid or expired token")
        raise HTTPException(status_code=503, detail="supabase auth unavailable")
    except (URLError, OSError):
        raise HTTPException(status_code=503, detail="supabase auth unavailable")

    try:
        user = json.loads(body)
        if not isinstance(user, dict):
            raise ValueError("invalid user")
        UUID(user["id"])
    except (ValueError, KeyError, TypeError, AttributeError, UnicodeError):
        raise HTTPException(status_code=503, detail="invalid response from supabase auth")

    return user


def get_current_user_id(authorization: str | None = Header(default=None)) -> UUID:
    user = get_current_user(authorization)
    return UUID(user["id"])
