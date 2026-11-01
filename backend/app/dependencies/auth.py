import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Verify the access token with Supabase Auth and return the user."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(status_code=503, detail="Supabase Auth is not configured")

    request = Request(
        url=f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {credentials.credentials}",
            "apikey": settings.supabase_publishable_key,
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=10) as response:
            user = json.loads(response.read())
    except HTTPError as error:
        if error.code in (400, 401, 403):
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired access token",
                headers={"WWW-Authenticate": "Bearer"},
            ) from error
        raise HTTPException(status_code=503, detail="Supabase Auth is unavailable") from error
    except (URLError, OSError) as error:
        raise HTTPException(status_code=503, detail="Supabase Auth is unavailable") from error
    except (ValueError, UnicodeError) as error:
        raise HTTPException(status_code=503, detail="Invalid response from Supabase Auth") from error

    try:
        if not isinstance(user, dict):
            raise ValueError("Expected a user object")
        UUID(user["id"])
    except (KeyError, ValueError, TypeError, AttributeError) as error:
        raise HTTPException(status_code=503, detail="Invalid response from Supabase Auth") from error

    return user


def get_current_user_id(user: dict = Depends(get_current_user)) -> UUID:
    """Return the authenticated user's UUID for profile lookups."""
    return UUID(user["id"])
