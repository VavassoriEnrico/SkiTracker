import unittest
from datetime import date
from uuid import uuid4

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.models.ski_instructor import SkiInstructor
from app.models.ski_customer import SkiCustomer
from app.schemas.ski_instructor import SkiInstructorRead, SkiInstructorUpdate
from app.services import ski_instructor_service


class SkiInstructorServiceTests(unittest.TestCase):
    def setUp(self):
        # Only this in-memory database is used; Supabase is never contacted.
        self.engine = create_engine("sqlite:///:memory:")
        SkiInstructor.__table__.create(self.engine)
        SkiCustomer.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        self.user_id = uuid4()

    def test_create_from_authenticated_id_and_email(self):
        instructor = ski_instructor_service.get_or_create_instructor(
            self.db, user_id=self.user_id, email="instructor@example.com"
        )
        self.assertEqual(instructor.id, self.user_id)
        self.assertEqual(instructor.email, "instructor@example.com")
        self.assertNotIn("role", SkiInstructorRead.model_validate(instructor).model_dump())
        self.assertIsNotNone(instructor.created_at)
        self.assertEqual(SkiInstructorRead.model_validate(instructor).id, self.user_id)

    def test_existing_instructor_is_reused(self):
        first = ski_instructor_service.get_or_create_instructor(
            self.db, user_id=self.user_id, email="instructor@example.com"
        )
        second = ski_instructor_service.get_or_create_instructor(
            self.db, user_id=self.user_id, email="other@example.com"
        )
        self.assertIs(first, second)
        self.assertEqual(second.email, "instructor@example.com")
        count = self.db.scalar(select(func.count()).select_from(SkiInstructor))
        self.assertEqual(count, 1)

    def test_partial_update_preserves_omitted_fields(self):
        ski_instructor_service.update_instructor(
            self.db,
            user_id=self.user_id,
            name="Enrico", surname="Example", username="enrico",
            birth_date=date(2000, 5, 21),
        )
        updated = ski_instructor_service.update_instructor(
            self.db, user_id=self.user_id, name="New name"
        )
        self.db.expire_all()
        persisted = self.db.get(SkiInstructor, self.user_id)
        self.assertEqual(persisted.name, "New name")
        self.assertEqual(persisted.surname, "Example")
        self.assertEqual(persisted.username, "enrico")
        self.assertEqual(persisted.birth_date, date(2000, 5, 21))
        self.assertIsInstance(updated.name, str)

    def test_none_preserves_existing_field(self):
        ski_instructor_service.update_instructor(
            self.db, user_id=self.user_id,
            username="enrico", birth_date=date(2000, 5, 21),
        )
        updated = ski_instructor_service.update_instructor(
            self.db, user_id=self.user_id,
            birth_date=None,
        )
        self.assertEqual(updated.birth_date, date(2000, 5, 21))
        self.assertEqual(updated.username, "enrico")

    def test_update_cannot_change_identity_or_email(self):
        updated = ski_instructor_service.update_instructor(
            self.db, user_id=self.user_id, email="instructor@example.com",
            **SkiInstructorUpdate.model_validate({
                "name": "Enrico",
                "id": str(uuid4()), "email": "other@example.com",
            }).model_dump(exclude_unset=True),
        )
        self.assertEqual(updated.id, self.user_id)
        self.assertEqual(updated.email, "instructor@example.com")


if __name__ == "__main__":
    unittest.main()
