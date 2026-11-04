import asyncio
import json
import unittest
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db_dependency import get_db
from app.dependency_auth import get_current_user
from app.main import app
from app.models.ski_instructor import SkiInstructor
from app.models.ski_customer import SkiCustomer


async def request(method, payload=None, path="/ski_instructor/me", query_string=b"", *, raw_body=None, content_type="application/json"):
    """Exercise FastAPI directly, without a server or HTTP client dependency."""
    body = raw_body if raw_body is not None else json.dumps(payload).encode() if payload is not None else b""
    messages = []

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        messages.append(message)

    await app({
        "type": "http", "asgi": {"version": "3.0"},
        "http_version": "1.1", "method": method,
        "scheme": "http", "path": path, "root_path": "",
        "query_string": query_string, "headers": [(b"content-type", content_type.encode())],
        "server": ("test", 80), "client": ("test", 1234),
    }, receive, send)
    status = next(m["status"] for m in messages if m["type"] == "http.response.start")
    content = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return status, json.loads(content) if content else None


class SkiInstructorRouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        SkiInstructor.__table__.create(self.engine)
        SkiCustomer.__table__.create(self.engine)
        self.user_id = str(uuid4())

        def test_db():
            with Session(self.engine) as db:
                yield db

        app.dependency_overrides[get_db] = test_db
        app.dependency_overrides[get_current_user] = lambda: {
            "id": self.user_id, "email": "instructor@example.com"
        }
        self.addCleanup(self.engine.dispose)
        self.addCleanup(app.dependency_overrides.clear)

    def test_get_creates_and_returns_own_instructor(self):
        status, body = asyncio.run(request("GET"))
        self.assertEqual(status, 200)
        self.assertEqual(body["id"], self.user_id)
        self.assertEqual(body["email"], "instructor@example.com")
        self.assertNotIn("role", body)

    def test_patch_preserves_omitted_fields(self):
        status, _ = asyncio.run(request("PATCH", {
            "name": "Enrico", "surname": "Example", "birth_date": "2000-05-21"
        }))
        self.assertEqual(status, 200)
        status, body = asyncio.run(request("PATCH", {"name": "New name"}))
        self.assertEqual(status, 200)
        self.assertEqual(body["name"], "New name")
        self.assertEqual(body["surname"], "Example")
        self.assertEqual(body["birth_date"], "2000-05-21")

    def test_invalid_date_is_rejected(self):
        status, _ = asyncio.run(request("PATCH", {"birth_date": "invalid"}))
        self.assertEqual(status, 422)

    def test_client_cannot_override_identity_or_email(self):
        status, body = asyncio.run(request("PATCH", {
            "id": str(uuid4()), "email": "other@example.com"
        }))
        self.assertEqual(status, 200)
        self.assertEqual(body["id"], self.user_id)
        self.assertNotIn("role", body)
        self.assertEqual(body["email"], "instructor@example.com")

    def test_authentication_required_for_both_routes(self):
        del app.dependency_overrides[get_current_user]
        for method, payload in (("GET", None), ("PATCH", {"name": "Enrico"})):
            with self.subTest(method=method):
                status, _ = asyncio.run(request(method, payload))
                self.assertEqual(status, 401)


if __name__ == "__main__":
    unittest.main()
