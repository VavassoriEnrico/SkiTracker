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
from app.services.ski_customer_service import get_or_create_customer
from test_ski_instructor_routes import request


class SkiCustomerRouteTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        SkiCustomer.__table__.create(self.engine)
        SkiInstructor.__table__.create(self.engine)
        self.user_id = uuid4()
        self.other_id = uuid4()
        with Session(self.engine) as db:
            get_or_create_customer(db, user_id=self.user_id, name="Customer", surname="Example", level=2, ability=1)
            get_or_create_customer(db, user_id=self.other_id, name="Other customer")

        def test_db():
            with Session(self.engine) as db:
                yield db

        app.dependency_overrides[get_db] = test_db
        app.dependency_overrides[get_current_user] = lambda: {"id": str(self.user_id)}
        self.addCleanup(self.engine.dispose)
        self.addCleanup(app.dependency_overrides.clear)

    def call(self, method, payload=None):
        return asyncio.run(request(method, payload, path="/ski_customer/me"))

    def test_get_returns_authenticated_customer_with_numeric_fields(self):
        status, body = self.call("GET")
        self.assertEqual(status, 200)
        self.assertEqual(body["id"], str(self.user_id))
        self.assertEqual(body["name"], "Customer")
        self.assertEqual(body["level"], 2)
        self.assertEqual(body["ability"], 1)

    def test_partial_update_preserves_other_fields_and_persists_date(self):
        status, body = self.call("PATCH", {"birth_date": "2000-05-21", "level": 3})
        self.assertEqual(status, 200)
        self.assertEqual(body["birth_date"], "2000-05-21")
        self.assertEqual(body["level"], 3)
        self.assertEqual(body["ability"], 1)
        self.assertEqual(body["surname"], "Example")
        status, saved = self.call("GET")
        self.assertEqual(status, 200)
        self.assertEqual(saved["birth_date"], "2000-05-21")

    def test_payload_cannot_select_another_customer(self):
        status, body = self.call("PATCH", {"id": str(self.other_id), "name": "New name"})
        self.assertEqual(status, 200)
        self.assertEqual(body["id"], str(self.user_id))
        with Session(self.engine) as db:
            self.assertEqual(db.get(SkiCustomer, self.other_id).name, "Other customer")

    def test_missing_profile_is_not_created_by_get_or_patch(self):
        missing_id = uuid4()
        app.dependency_overrides[get_current_user] = lambda: {"id": str(missing_id)}
        for method, payload in (("GET", None), ("PATCH", {"name": "New"})):
            with self.subTest(method=method):
                status, _ = self.call(method, payload)
                self.assertEqual(status, 404)
        with Session(self.engine) as db:
            self.assertIsNone(db.get(SkiCustomer, missing_id))

    def test_invalid_date_or_numbers_are_rejected(self):
        for payload in ({"birth_date": "invalid"}, {"level": 0}, {"level": 8}, {"ability": 0}, {"ability": 4}):
            with self.subTest(payload=payload):
                status, _ = self.call("PATCH", payload)
                self.assertEqual(status, 422)

    def test_customer_cannot_become_instructor_by_visiting_instructor_route(self):
        for method, payload in (("GET", None), ("PATCH", {"name": "New"})):
            with self.subTest(method=method):
                status, _ = asyncio.run(request(method, payload, path="/ski_instructor/me"))
                self.assertEqual(status, 403)
        with Session(self.engine) as db:
            self.assertIsNone(db.get(SkiInstructor, self.user_id))

    def test_authentication_required_for_both_routes(self):
        del app.dependency_overrides[get_current_user]
        for method, payload in (("GET", None), ("PATCH", {"name": "New"})):
            with self.subTest(method=method):
                status, _ = self.call(method, payload)
                self.assertEqual(status, 401)

    def as_instructor(self):
        instructor_id = uuid4()
        with Session(self.engine) as db:
            db.add(SkiInstructor(id=instructor_id, email="teacher@example.com"))
            db.commit()
        app.dependency_overrides[get_current_user] = lambda: {"id": str(instructor_id)}
        return instructor_id

    def post_client(self, **overrides):
        payload = {"name": "New", "surname": "Skier", "email": "new@example.com", "password": "TestPassword123", "level": 2, "ability": 1}
        payload.update(overrides)
        return asyncio.run(request("POST", payload, path="/ski_customer"))

    def test_instructor_creates_auth_account_and_matching_customer(self):
        from unittest.mock import patch
        instructor_id = self.as_instructor()
        created_id = uuid4()
        with patch("app.services.ski_customer_service.supabase_admin.create_user", return_value=created_id) as create:
            status, body = self.post_client()
        self.assertEqual(status, 201)
        self.assertEqual(body["id"], str(created_id))
        self.assertEqual(body["level"], 2)
        self.assertEqual(body["ability"], 1)
        self.assertNotIn("password", body)
        self.assertEqual(body["email"], "new@example.com")
        create.assert_called_once_with("new@example.com", "TestPassword123")
        with Session(self.engine) as db:
            self.assertIsNotNone(db.get(SkiCustomer, created_id))
            self.assertIsNone(db.get(SkiCustomer, instructor_id))

    def test_customer_cannot_create_another_account(self):
        from unittest.mock import patch
        with patch("app.services.ski_customer_service.supabase_admin.create_user") as create:
            status, _ = self.post_client()
        self.assertEqual(status, 403)
        create.assert_not_called()

    def test_creation_requires_authentication(self):
        from unittest.mock import patch
        del app.dependency_overrides[get_current_user]
        with patch("app.services.ski_customer_service.supabase_admin.create_user") as create:
            status, _ = self.post_client()
        self.assertEqual(status, 401)
        create.assert_not_called()

    def test_invalid_creation_fields_do_not_call_auth_admin(self):
        from unittest.mock import patch
        self.as_instructor()
        for payload in ({"name": " "}, {"email": "invalid"}, {"password": "short"}, {"level": 8}, {"ability": 4}):
            with self.subTest(payload=payload):
                with patch("app.services.ski_customer_service.supabase_admin.create_user") as create:
                    status, _ = self.post_client(**payload)
                self.assertEqual(status, 422)
                create.assert_not_called()

    def test_duplicate_email_does_not_create_customer(self):
        from fastapi import HTTPException
        from unittest.mock import patch
        from sqlalchemy import func, select
        self.as_instructor()
        with patch("app.services.ski_customer_service.supabase_admin.create_user", side_effect=HTTPException(409, "Email already exists")):
            status, _ = self.post_client()
        self.assertEqual(status, 409)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(SkiCustomer)), 2)

    def test_database_failure_removes_only_new_auth_account(self):
        from sqlalchemy.exc import SQLAlchemyError
        from unittest.mock import patch
        self.as_instructor()
        new_id = uuid4()
        with patch("app.services.ski_customer_service.supabase_admin.create_user", return_value=new_id), \
             patch("app.services.ski_customer_service.ski_customer_repository.create", side_effect=SQLAlchemyError("DB failed")), \
             patch("app.services.ski_customer_service.supabase_admin.delete_user") as delete:
            status, body = self.post_client()
        self.assertEqual(status, 503)
        self.assertIn("No new account was kept", body["detail"])
        delete.assert_called_once_with(new_id)
        with Session(self.engine) as db:
            self.assertIsNone(db.get(SkiCustomer, new_id))

    def test_cleanup_failure_is_reported(self):
        from fastapi import HTTPException
        from sqlalchemy.exc import SQLAlchemyError
        from unittest.mock import patch
        self.as_instructor()
        with patch("app.services.ski_customer_service.supabase_admin.create_user", return_value=uuid4()), \
             patch("app.services.ski_customer_service.ski_customer_repository.create", side_effect=SQLAlchemyError("DB failed")), \
             patch("app.services.ski_customer_service.supabase_admin.delete_user", side_effect=HTTPException(503, "Unavailable")):
            status, body = self.post_client()
        self.assertEqual(status, 503)
        self.assertIn("Check Supabase Auth before retrying", body["detail"])

    def test_directory_searches_name_surname_username_and_email(self):
        from urllib.parse import urlencode
        self.as_instructor()
        with Session(self.engine) as db:
            client = db.get(SkiCustomer, self.user_id)
            client.name = "Anna"
            client.surname = "Rossi"
            client.username = "ski_anna"
            client.email = "anna@example.com"
            db.commit()
        for query in ("anna", "ROSSI", "Anna Rossi", "ski_anna", "ANNA@EXAMPLE.COM", "_anna"):
            with self.subTest(query=query):
                status, body = asyncio.run(request("GET", path="/ski_customer", query_string=urlencode({"q": query}).encode()))
                self.assertEqual(status, 200)
                self.assertEqual([client["id"] for client in body], [str(self.user_id)])
        status, body = asyncio.run(request("GET", path="/ski_customer", query_string=b"q=%25"))
        self.assertEqual(status, 200)
        self.assertEqual(body, [])

    def test_directory_returns_all_clients_and_empty_search_results(self):
        self.as_instructor()
        status, body = asyncio.run(request("GET", path="/ski_customer"))
        self.assertEqual(status, 200)
        self.assertEqual(len(body), 2)
        status, body = asyncio.run(request("GET", path="/ski_customer", query_string=b"q=not-found"))
        self.assertEqual(status, 200)
        self.assertEqual(body, [])

    def test_instructor_opens_client_details(self):
        self.as_instructor()
        status, body = asyncio.run(request("GET", path=f"/ski_customer/{self.user_id}"))
        self.assertEqual(status, 200)
        self.assertEqual(body["id"], str(self.user_id))
        status, _ = asyncio.run(request("GET", path=f"/ski_customer/{uuid4()}"))
        self.assertEqual(status, 404)

    def test_customer_cannot_list_or_open_other_clients(self):
        for path in ("/ski_customer", f"/ski_customer/{self.other_id}"):
            with self.subTest(path=path):
                status, _ = asyncio.run(request("GET", path=path))
                self.assertEqual(status, 403)

    def test_photo_is_uploaded_and_url_is_persisted(self):
        import base64
        from unittest.mock import patch
        self.as_instructor()
        image = b"\xff\xd8jpeg-test\xff\xd9"
        url = "https://example.supabase.co/photo.jpg"
        with patch("app.services.ski_customer_service.supabase_admin.upload_customer_photo", return_value=url) as upload:
            status, body = asyncio.run(request("POST", {"image_base64": base64.b64encode(image).decode()}, path=f"/ski_customer/{self.user_id}/photo"))
        self.assertEqual(status, 200)
        self.assertEqual(body["profile_image_url"], url)
        upload.assert_called_once_with(self.user_id, image)
        with Session(self.engine) as db:
            self.assertEqual(db.get(SkiCustomer, self.user_id).profile_image_url, url)

    def test_invalid_photo_does_not_upload(self):
        import base64
        from unittest.mock import patch
        self.as_instructor()
        for image in ("not base64", base64.b64encode(b"not a JPEG").decode()):
            with self.subTest(image=image):
                with patch("app.services.ski_customer_service.supabase_admin.upload_customer_photo") as upload:
                    status, _ = asyncio.run(request("POST", {"image_base64": image}, path=f"/ski_customer/{self.user_id}/photo"))
                self.assertEqual(status, 400)
                upload.assert_not_called()

    def test_large_photo_is_rejected(self):
        import base64
        from unittest.mock import patch
        self.as_instructor()
        image = base64.b64encode(b"\xff\xd8" + b"x" * (5 * 1024 * 1024)).decode()
        with patch("app.services.ski_customer_service.supabase_admin.upload_customer_photo") as upload:
            status, _ = asyncio.run(request("POST", {"image_base64": image}, path=f"/ski_customer/{self.user_id}/photo"))
        self.assertEqual(status, 413)
        upload.assert_not_called()

    def test_customer_cannot_upload_another_clients_photo(self):
        import base64
        from unittest.mock import patch
        with patch("app.services.ski_customer_service.supabase_admin.upload_customer_photo") as upload:
            status, _ = asyncio.run(request("POST", {"image_base64": base64.b64encode(b"\xff\xd8image").decode()}, path=f"/ski_customer/{self.other_id}/photo"))
        self.assertEqual(status, 403)
        upload.assert_not_called()

    def test_instructor_updates_client_and_preserves_omitted_fields(self):
        self.as_instructor()
        status, body = asyncio.run(request("PATCH", {"name": "Updated", "level": 5, "birth_date": "2001-03-14"}, path=f"/ski_customer/{self.user_id}"))
        self.assertEqual(status, 200)
        self.assertEqual(body["name"], "Updated")
        self.assertEqual(body["surname"], "Example")
        self.assertEqual(body["level"], 5)
        self.assertEqual(body["ability"], 1)
        self.assertEqual(body["birth_date"], "2001-03-14")
        with Session(self.engine) as db:
            self.assertEqual(db.get(SkiCustomer, self.user_id).name, "Updated")
            self.assertEqual(db.get(SkiCustomer, self.other_id).name, "Other customer")

    def test_instructor_can_clear_optional_fields(self):
        from datetime import date
        self.as_instructor()
        with Session(self.engine) as db:
            customer = db.get(SkiCustomer, self.user_id)
            customer.username = "existing_username"
            customer.birth_date = date(2000, 1, 1)
            customer.sex = "F"
            db.commit()
        status, body = asyncio.run(request("PATCH", {"username": None, "birth_date": None, "sex": None, "level": None, "ability": None}, path=f"/ski_customer/{self.user_id}"))
        self.assertEqual(status, 200)
        for field in ("username", "birth_date", "sex", "level", "ability"):
            self.assertIsNone(body[field])
        self.assertEqual(body["name"], "Customer")

    def test_instructor_patch_ignores_identity_and_login_fields(self):
        self.as_instructor()
        with Session(self.engine) as db:
            customer = db.get(SkiCustomer, self.user_id)
            customer.email = "original@example.com"
            customer.profile_image_url = "https://example.com/original.jpg"
            db.commit()
        status, body = asyncio.run(request("PATCH", {"id": str(self.other_id), "email": "changed@example.com", "password": "ChangedPassword", "profile_image_url": "https://example.com/changed.jpg", "name": "Updated"}, path=f"/ski_customer/{self.user_id}"))
        self.assertEqual(status, 200)
        self.assertEqual(body["id"], str(self.user_id))
        self.assertEqual(body["email"], "original@example.com")
        self.assertEqual(body["profile_image_url"], "https://example.com/original.jpg")
        self.assertNotIn("password", body)

    def test_instructor_patch_missing_client_is_404(self):
        self.as_instructor()
        status, _ = asyncio.run(request("PATCH", {"name": "Updated"}, path=f"/ski_customer/{uuid4()}"))
        self.assertEqual(status, 404)

    def test_instructor_patch_validates_date_level_and_ability(self):
        self.as_instructor()
        for payload in ({"birth_date": "2000-02-30"}, {"level": 8}, {"ability": 4}):
            with self.subTest(payload=payload):
                status, _ = asyncio.run(request("PATCH", payload, path=f"/ski_customer/{self.user_id}"))
                self.assertEqual(status, 422)

    def test_customer_cannot_use_instructor_patch(self):
        status, _ = asyncio.run(request("PATCH", {"name": "Changed"}, path=f"/ski_customer/{self.other_id}"))
        self.assertEqual(status, 403)
        with Session(self.engine) as db:
            self.assertEqual(db.get(SkiCustomer, self.other_id).name, "Other customer")

    def test_instructor_patch_requires_authentication(self):
        del app.dependency_overrides[get_current_user]
        status, _ = asyncio.run(request("PATCH", {"name": "Changed"}, path=f"/ski_customer/{self.other_id}"))
        self.assertEqual(status, 401)
