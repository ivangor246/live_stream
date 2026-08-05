from unittest import TestCase

from starlette.responses import Response

from app.api.routes import _set_sensitive_response_headers


class SensitiveResponseHeadersTests(TestCase):
    def test_sensitive_responses_disable_caching(self) -> None:
        response = Response()

        _set_sensitive_response_headers(response)

        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertEqual(response.headers["pragma"], "no-cache")
