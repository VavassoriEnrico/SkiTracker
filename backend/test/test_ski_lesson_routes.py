import asyncio
import unittest
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db_dependency import get_db
from app.dependency_auth import get_current_user
from app.main import app
from app.models.ski_customer import SkiCustomer
from app.models.ski_instructor import SkiInstructor
from app.models.ski_lesson import SkiLesson
from test_ski_instructor_routes import request


class SkiLessonRouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        for model in (SkiInstructor, SkiCustomer):
            model.__table__.create(self.engine)
        # Define the database schema independently of the ORM mapping.
        with self.engine.begin() as connection:
            connection.exec_driver_sql("""
                CREATE TABLE ski_lessons (
                    id INTEGER PRIMARY KEY,
                    instructor_id CHAR(32) NOT NULL REFERENCES ski_instructors(id),
                    lesson_date DATE NOT NULL,
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL
                )
            """)
            connection.exec_driver_sql("""
                CREATE TABLE ski_lesson_customers (
                    lesson_id BIGINT NOT NULL REFERENCES ski_lessons(id) ON DELETE CASCADE,
                    customer_id CHAR(32) NOT NULL REFERENCES ski_customers(id),
                    PRIMARY KEY (lesson_id, customer_id)
                )
            """)
        self.instructor_id = uuid4()
        self.customer_id = uuid4()
        with Session(self.engine) as db:
            db.add(SkiInstructor(id=self.instructor_id))
            db.add(SkiCustomer(id=self.customer_id, name="Client"))
            db.commit()
        def test_db():
            with Session(self.engine) as db:
                yield db
        app.dependency_overrides[get_db] = test_db
        app.dependency_overrides[get_current_user] = lambda: {"id": str(self.instructor_id)}
        self.addCleanup(self.engine.dispose)
        self.addCleanup(app.dependency_overrides.clear)

    def create(self, **changes):
        payload = {"customer_ids": [str(self.customer_id)], "lesson_date": "2030-01-15", "start_time": "08:30:00", "end_time": "09:30:00"}
        payload.update(changes)
        return asyncio.run(request("POST", payload, path="/ski_lesson"))

    def test_create_and_read_saved_lesson_using_token_instructor(self):
        status, body = self.create(instructor_id=str(uuid4()))
        self.assertEqual(status, 201)
        self.assertIsInstance(body["id"], int)
        self.assertEqual(body["instructor_id"], str(self.instructor_id))
        self.assertEqual(body["start_time"], "08:30:00")
        self.assertEqual(body["customer_ids"], [str(self.customer_id)])
        status, lessons = asyncio.run(request("GET", path="/ski_lesson/instructor/me"))
        self.assertEqual(status, 200)
        self.assertEqual(lessons[0]["id"], body["id"])
        with Session(self.engine) as db:
            self.assertEqual(str(db.get(SkiLesson, body["id"]).instructor_id), str(self.instructor_id))

    def test_rejects_invalid_time_intervals(self):
        for changes in ({"end_time": "08:00:00"}, {"end_time": "08:30:00"}, {"start_time": "08:15:00"}, {"end_time": "09:30:01"}, {"start_time": "08:30:00+01:00"}):
            with self.subTest(changes=changes):
                status, _ = self.create(**changes)
                self.assertEqual(status, 422)

    def test_missing_client_is_404(self):
        status, _ = self.create(customer_ids=[str(uuid4())])
        self.assertEqual(status, 404)

    def test_customer_cannot_create_lessons(self):
        app.dependency_overrides[get_current_user] = lambda: {"id": str(self.customer_id)}
        status, _ = self.create()
        self.assertEqual(status, 403)

    def test_authentication_required(self):
        del app.dependency_overrides[get_current_user]
        status, _ = self.create()
        self.assertEqual(status, 401)

    def test_group_lesson_is_returned_for_each_participant(self):
        other_id = uuid4()
        with Session(self.engine) as db:
            db.add(SkiCustomer(id=other_id, name="Second client"))
            db.commit()
        status, body = self.create(customer_ids=[str(self.customer_id), str(other_id)])
        self.assertEqual(status, 201)
        self.assertCountEqual(body["customer_ids"], [str(self.customer_id), str(other_id)])
        for customer_id in (self.customer_id, other_id):
            app.dependency_overrides[get_current_user] = lambda value=customer_id: {"id": str(value)}
            status, lessons = asyncio.run(request("GET", path="/ski_lesson/customer/me"))
            self.assertEqual(status, 200)
            self.assertEqual([lesson["id"] for lesson in lessons], [body["id"]])
        app.dependency_overrides[get_current_user] = lambda: {"id": str(self.instructor_id)}
        status, lessons = asyncio.run(request("GET", path=f"/ski_lesson/instructor/me/customer/{other_id}"))
        self.assertEqual(status, 200)
        self.assertEqual([lesson["id"] for lesson in lessons], [body["id"]])

    def test_participant_list_rejects_empty_duplicates_and_unknown_clients(self):
        for ids in ([], [str(self.customer_id), str(self.customer_id)]):
            with self.subTest(ids=ids):
                status, _ = self.create(customer_ids=ids)
                self.assertEqual(status, 422)
        status, _ = self.create(customer_ids=[str(self.customer_id), str(uuid4())])
        self.assertEqual(status, 404)
        with Session(self.engine) as db:
            self.assertEqual(db.query(SkiLesson).count(), 0)

    def test_exact_partial_and_contained_overlaps_are_rejected(self):
        self.assertEqual(self.create()[0], 201)
        for start, end in (("08:30:00", "09:30:00"), ("09:00:00", "10:00:00"), ("08:00:00", "09:00:00"), ("08:00:00", "10:00:00"), ("09:00:00", "09:30:00")):
            with self.subTest(start=start, end=end):
                status, body = self.create(start_time=start, end_time=end)
                self.assertEqual(status, 409)
                self.assertIn("already have a lesson", body["detail"])
        with Session(self.engine) as db:
            self.assertEqual(db.query(SkiLesson).count(), 1)

    def test_adjacent_lessons_are_allowed(self):
        self.assertEqual(self.create()[0], 201)
        self.assertEqual(self.create(start_time="07:30:00", end_time="08:30:00")[0], 201)
        self.assertEqual(self.create(start_time="09:30:00", end_time="10:30:00")[0], 201)

    def test_other_days_and_instructors_can_use_same_times(self):
        self.assertEqual(self.create()[0], 201)
        self.assertEqual(self.create(lesson_date="2030-01-16")[0], 201)
        other_instructor = uuid4()
        with Session(self.engine) as db:
            db.add(SkiInstructor(id=other_instructor))
            db.commit()
        app.dependency_overrides[get_current_user] = lambda: {"id": str(other_instructor)}
        self.assertEqual(self.create()[0], 201)
        status, lessons = asyncio.run(request("GET", path="/ski_lesson/instructor/me"))
        self.assertEqual(status, 200)
        self.assertEqual(len(lessons), 1)

    def test_database_exclusion_violation_returns_conflict_and_rolls_back(self):
        from unittest.mock import patch
        from sqlalchemy.exc import IntegrityError
        class ExclusionViolation(Exception):
            sqlstate = "23P01"
        error = IntegrityError("INSERT", {}, ExclusionViolation())
        with patch("app.services.ski_lesson_service.ski_lesson_repository.create", side_effect=error):
            status, body = self.create()
        self.assertEqual(status, 409)
        self.assertIn("already have a lesson", body["detail"])
        with Session(self.engine) as db:
            self.assertEqual(db.query(SkiLesson).count(), 0)

    def test_delete_lesson_removes_participants_preserves_clients_and_frees_time(self):
        from app.models.ski_lesson_customer import SkiLessonCustomer
        second_customer = uuid4()
        with Session(self.engine) as db:
            db.add(SkiCustomer(id=second_customer, name="Second client"))
            db.commit()
        ids = [str(self.customer_id), str(second_customer)]
        status, first = self.create(customer_ids=ids)
        self.assertEqual(status, 201)
        status, second = self.create(customer_ids=ids, start_time="09:30:00", end_time="10:30:00")
        self.assertEqual(status, 201)
        status, body = asyncio.run(request("DELETE", path=f"/ski_lesson/{first['id']}"))
        self.assertEqual(status, 204)
        self.assertIsNone(body)
        with Session(self.engine) as db:
            self.assertIsNone(db.get(SkiLesson, first["id"]))
            self.assertEqual(db.query(SkiLessonCustomer).filter(SkiLessonCustomer.lesson_id == first["id"]).count(), 0)
            self.assertEqual(db.query(SkiLessonCustomer).filter(SkiLessonCustomer.lesson_id == second["id"]).count(), 2)
            self.assertEqual(db.query(SkiCustomer).count(), 2)
        status, lessons = asyncio.run(request("GET", path="/ski_lesson/instructor/me"))
        self.assertEqual(status, 200)
        self.assertEqual([lesson["id"] for lesson in lessons], [second["id"]])
        self.assertEqual(self.create(customer_ids=ids)[0], 201)

    def test_delete_another_instructors_lesson_is_rejected(self):
        status, lesson = self.create()
        self.assertEqual(status, 201)
        other_instructor = uuid4()
        with Session(self.engine) as db:
            db.add(SkiInstructor(id=other_instructor))
            db.commit()
        app.dependency_overrides[get_current_user] = lambda: {"id": str(other_instructor)}
        status, _ = asyncio.run(request("DELETE", path=f"/ski_lesson/{lesson['id']}"))
        self.assertEqual(status, 404)
        with Session(self.engine) as db:
            self.assertIsNotNone(db.get(SkiLesson, lesson["id"]))

    def test_customer_cannot_delete_a_lesson(self):
        status, lesson = self.create()
        self.assertEqual(status, 201)
        app.dependency_overrides[get_current_user] = lambda: {"id": str(self.customer_id)}
        status, _ = asyncio.run(request("DELETE", path=f"/ski_lesson/{lesson['id']}"))
        self.assertEqual(status, 403)
        with Session(self.engine) as db:
            self.assertIsNotNone(db.get(SkiLesson, lesson["id"]))

    def test_delete_missing_lesson_is_404(self):
        status, _ = asyncio.run(request("DELETE", path="/ski_lesson/99999"))
        self.assertEqual(status, 404)

    def test_delete_lesson_requires_authentication(self):
        del app.dependency_overrides[get_current_user]
        status, _ = asyncio.run(request("DELETE", path="/ski_lesson/1"))
        self.assertEqual(status, 401)
