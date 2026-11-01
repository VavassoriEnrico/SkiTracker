import unittest
from datetime import date
from uuid import uuid4

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.models.profile import Profile
from app.schemas.profile import ProfileRead, ProfileUpdate
from app.services import profile_service


class ProfileServiceTests(unittest.TestCase):
    def setUp(self):
        # Only this in-memory database is used; Supabase is never contacted.
        self.engine = create_engine("sqlite:///:memory:")
        Profile.__table__.create(self.engine)
        self.db = Session(self.engine)
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.db.close)
        self.user_id = uuid4()

    def test_create_from_authenticated_id_and_email(self):
        profile = profile_service.get_or_create_profile(
            self.db, user_id=self.user_id, email="student@example.com"
        )
        self.assertEqual(profile.id, self.user_id)
        self.assertEqual(profile.email, "student@example.com")
        self.assertEqual(profile.role, "student")
        self.assertIsNotNone(profile.created_at)
        self.assertEqual(ProfileRead.model_validate(profile).id, self.user_id)

    def test_existing_profile_is_reused(self):
        first = profile_service.get_or_create_profile(
            self.db, user_id=self.user_id, email="student@example.com"
        )
        second = profile_service.get_or_create_profile(
            self.db, user_id=self.user_id, email="other@example.com"
        )
        self.assertIs(first, second)
        self.assertEqual(second.email, "student@example.com")
        count = self.db.scalar(select(func.count()).select_from(Profile))
        self.assertEqual(count, 1)

    def test_partial_update_preserves_omitted_fields(self):
        profile_service.update_profile(
            self.db,
            user_id=self.user_id,
            name="Enrico", surname="Example", username="enrico",
            birth_date=date(2000, 5, 21),
        )
        updated = profile_service.update_profile(
            self.db, user_id=self.user_id, name="New name"
        )
        self.db.expire_all()
        persisted = self.db.get(Profile, self.user_id)
        self.assertEqual(persisted.name, "New name")
        self.assertEqual(persisted.surname, "Example")
        self.assertEqual(persisted.username, "enrico")
        self.assertEqual(persisted.birth_date, date(2000, 5, 21))
        self.assertIsInstance(updated.name, str)

    def test_none_preserves_existing_field(self):
        profile_service.update_profile(
            self.db, user_id=self.user_id,
            username="enrico", birth_date=date(2000, 5, 21),
        )
        updated = profile_service.update_profile(
            self.db, user_id=self.user_id,
            birth_date=None,
        )
        self.assertEqual(updated.birth_date, date(2000, 5, 21))
        self.assertEqual(updated.username, "enrico")

    def test_update_cannot_change_identity_role_or_email(self):
        updated = profile_service.update_profile(
            self.db, user_id=self.user_id, email="student@example.com",
            **ProfileUpdate.model_validate({
                "name": "Enrico", "role": "ski_instructor",
                "id": str(uuid4()), "email": "other@example.com",
            }).model_dump(exclude_unset=True),
        )
        self.assertEqual(updated.id, self.user_id)
        self.assertEqual(updated.role, "student")
        self.assertEqual(updated.email, "student@example.com")


if __name__ == "__main__":
    unittest.main()
