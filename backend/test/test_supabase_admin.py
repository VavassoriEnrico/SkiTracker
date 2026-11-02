import io
import json
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError
from uuid import uuid4

from fastapi import HTTPException

from app.core.config import settings
from app.services import supabase_admin


class SupabaseAdminTests(unittest.TestCase):
    def setUp(self):
        for name, value in (("supabase_url", "https://example.supabase.co"), ("supabase_secret_key", "sb_secret_test")):
            patcher = patch.object(settings, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_create_uses_server_api_key_and_returns_auth_uuid(self):
        user_id = uuid4()
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({"id": str(user_id)}).encode()
        with patch("app.services.supabase_admin.urlopen", return_value=response) as call:
            actual_id = supabase_admin.create_user("client@example.com", "TestPassword123")
        self.assertEqual(actual_id, user_id)
        request = call.call_args.args[0]
        self.assertEqual(request.full_url, "https://example.supabase.co/auth/v1/admin/users")
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.get_header("Apikey"), "sb_secret_test")
        self.assertIsNone(request.get_header("Authorization"))
        self.assertEqual(json.loads(request.data), {"email": "client@example.com", "password": "TestPassword123", "email_confirm": True})

    def test_missing_key_fails_without_network_request(self):
        with patch.object(settings, "supabase_secret_key", ""), patch("app.services.supabase_admin.urlopen") as call:
            with self.assertRaises(HTTPException) as raised:
                supabase_admin.create_user("client@example.com", "TestPassword123")
        self.assertEqual(raised.exception.status_code, 503)
        call.assert_not_called()

    def test_duplicate_email_codes_in_both_response_formats(self):
        for body in ({"code": "email_exists"}, {"code": 422, "error_code": "email_exists"}):
            with self.subTest(body=body):
                error = HTTPError("https://example.supabase.co", 422, "Failed", {}, io.BytesIO(json.dumps(body).encode()))
                with patch("app.services.supabase_admin.urlopen", side_effect=error):
                    with self.assertRaises(HTTPException) as raised:
                        supabase_admin.create_user("client@example.com", "TestPassword123")
                self.assertEqual(raised.exception.status_code, 409)

    def test_network_errors_are_service_unavailable(self):
        with patch("app.services.supabase_admin.urlopen", side_effect=URLError("offline")):
            with self.assertRaises(HTTPException) as raised:
                supabase_admin.create_user("client@example.com", "TestPassword123")
        self.assertEqual(raised.exception.status_code, 503)

    def test_delete_handles_empty_success_response(self):
        user_id = uuid4()
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b""
        with patch("app.services.supabase_admin.urlopen", return_value=response) as call:
            supabase_admin.delete_user(user_id)
        request = call.call_args.args[0]
        self.assertEqual(request.method, "DELETE")
        self.assertTrue(request.full_url.endswith(f"/{user_id}"))
