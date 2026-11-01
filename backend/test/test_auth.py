import json
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError
from uuid import UUID

from fastapi import HTTPException

from app.core.config import settings
from app.dependency_auth import get_current_user, get_current_user_id

USER_ID = "ec9922fc-2912-4601-b997-53cbb15ac1aa"


def authenticate(header="Bearer test-token"):
    return get_current_user(header)


class AuthTests(unittest.TestCase):
    def setUp(self):
        for name, value in (
            ("supabase_url", "https://example.supabase.co"),
            ("supabase_publishable_key", "test-key"),
        ):
            patcher = patch.object(settings, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def test_missing_or_wrong_scheme_rejected_without_network(self):
        with patch("app.dependency_auth.urlopen") as call:
            for header in (None, "Basic abc", "Bearer "):
                with self.subTest(header=header):
                    with self.assertRaises(HTTPException) as raised:
                        authenticate(header)
                    self.assertEqual(raised.exception.status_code, 401)
            call.assert_not_called()

    def test_verified_user_id_and_request_headers(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({"id": USER_ID}).encode()
        with patch("app.dependency_auth.urlopen", return_value=response) as call:
            user = authenticate()
            user_id = get_current_user_id("Bearer test-token")
        self.assertEqual(user["id"], USER_ID)
        self.assertEqual(user_id, UUID(USER_ID))
        request = call.call_args.args[0]
        self.assertEqual(request.full_url, "https://example.supabase.co/auth/v1/user")
        self.assertEqual(request.get_header("Authorization"), "Bearer test-token")
        self.assertEqual(request.get_header("Apikey"), "test-key")
        self.assertEqual(call.call_args.kwargs["timeout"], 3)

    def test_invalid_token_is_unauthorized(self):
        error = HTTPError("https://example.supabase.co", 401, "Unauthorized", {}, None)
        with patch("app.dependency_auth.urlopen", side_effect=error):
            with self.assertRaises(HTTPException) as raised:
                authenticate()
        self.assertEqual(raised.exception.status_code, 401)

    def test_upstream_failures_are_service_unavailable(self):
        for error in (URLError("offline"), TimeoutError(), HTTPError(
            "https://example.supabase.co", 500, "Failure", {}, None
        )):
            with self.subTest(error=type(error).__name__):
                with patch("app.dependency_auth.urlopen", side_effect=error):
                    with self.assertRaises(HTTPException) as raised:
                        authenticate()
                self.assertEqual(raised.exception.status_code, 503)

    def test_invalid_upstream_payload_is_rejected(self):
        for payload in (b"not-json", b"[]", b"{}", b'{"id":"not-a-uuid"}'):
            with self.subTest(payload=payload):
                response = MagicMock()
                response.__enter__.return_value.read.return_value = payload
                with patch("app.dependency_auth.urlopen", return_value=response):
                    with self.assertRaises(HTTPException) as raised:
                        authenticate()
                self.assertEqual(raised.exception.status_code, 503)

    def test_missing_configuration_does_not_call_supabase(self):
        with patch.object(settings, "supabase_publishable_key", ""):
            with patch("app.dependency_auth.urlopen") as call:
                with self.assertRaises(HTTPException) as raised:
                    authenticate()
                self.assertEqual(raised.exception.status_code, 503)
                call.assert_not_called()


if __name__ == "__main__":
    unittest.main()
