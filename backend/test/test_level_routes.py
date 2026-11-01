import asyncio
import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool
from app.db_dependency import get_db
from app.main import app
from app.models.level import Level
from test_profile_routes import request


class LevelRouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Level.__table__.create(self.engine)
        with Session(self.engine) as db:
            db.add(Level(id=101, level_number=1, name="First level", explanation="Example"))
            db.add(Level(id=102, level_number=2, technical_goal="Example goal", video_url="https://example.com/video.mp4"))
            db.commit()
        def test_db():
            with Session(self.engine) as db:
                yield db
        app.dependency_overrides[get_db] = test_db
        self.addCleanup(self.engine.dispose)
        self.addCleanup(app.dependency_overrides.clear)

    def get(self, query):
        return asyncio.run(request("GET", path="/level", query_string=query.encode()))

    def test_lookup_uses_level_number_and_accepts_null_fields(self):
        status, body = self.get("level_number=1")
        self.assertEqual(status, 200)
        self.assertEqual(body["id"], 101)
        self.assertEqual(body["level_number"], 1)
        self.assertEqual(body["name"], "First level")
        self.assertIsNone(body["video_url"])
        self.assertIsNone(body["technical_goal"])

    def test_returns_goal_and_video_with_nullable_name(self):
        status, body = self.get("level_number=2")
        self.assertEqual(status, 200)
        self.assertIsNone(body["name"])
        self.assertEqual(body["technical_goal"], "Example goal")
        self.assertEqual(body["video_url"], "https://example.com/video.mp4")

    def test_missing_level_returns_404(self):
        status, body = self.get("level_number=7")
        self.assertEqual(status, 404)
        self.assertIn("not been added", body["detail"])

    def test_rejects_invalid_or_missing_level_number(self):
        for query in ("level_number=0", "level_number=8", "level_number=abc", ""):
            with self.subTest(query=query):
                status, _ = self.get(query)
                self.assertEqual(status, 422)
