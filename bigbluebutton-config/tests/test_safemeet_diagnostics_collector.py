import importlib.util
import http.client
import json
import pathlib
import tempfile
import threading
import unittest


MODULE_PATH = pathlib.Path(__file__).parents[1] / "bin" / "safemeet-diagnostics-collector.py"
SPEC = importlib.util.spec_from_file_location("safemeet_diagnostics_collector", MODULE_PATH)
COLLECTOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COLLECTOR)


class DiagnosticsCollectorTest(unittest.TestCase):
    def setUp(self):
        COLLECTOR.REQUEST_TIMESTAMPS.clear()

    def valid_payload(self):
        return {
            "version": COLLECTOR.VERSION,
            "identity": {
                "meetingId": "meeting-1",
                "requesterUserId": "w_user-1",
                "clientSessionUUID": "session-1",
                "clientBuild": "build-1",
                "unknown": "drop-me",
            },
            "device": {"platform": "iPhone", "unknown": "drop-me"},
            "events": [{
                "timestamp": "2026-08-29T10:00:00Z",
                "logCode": "runtime_error",
                "data": {
                    "message": "failed https://example.test/path?sessionToken=secret",
                    "sessionToken": "secret",
                },
            }],
            "unknown": "drop-me",
        }

    def test_normalizes_allowlisted_envelope_and_redacts_secrets(self):
        normalized = COLLECTOR.normalize_payload(self.valid_payload())
        self.assertNotIn("unknown", normalized)
        self.assertNotIn("unknown", normalized["identity"])
        self.assertNotIn("unknown", normalized["device"])
        event_data = normalized["events"][0]["data"]
        self.assertNotIn("sessionToken", event_data)
        self.assertNotIn("example.test", event_data["message"])
        self.assertNotIn("secret", event_data["message"])

    def test_rejects_missing_identity_and_oversized_batch(self):
        payload = self.valid_payload()
        del payload["identity"]["meetingId"]
        with self.assertRaises(ValueError):
            COLLECTOR.normalize_payload(payload)

        payload = self.valid_payload()
        payload["events"] *= COLLECTOR.MAX_EVENTS + 1
        with self.assertRaises(ValueError):
            COLLECTOR.normalize_payload(payload)

    def test_rate_limit_recovers_after_window(self):
        for request_index in range(COLLECTOR.MAX_REQUESTS_PER_MINUTE):
            self.assertTrue(COLLECTOR.accept_request(now=float(request_index) / 1000))
        self.assertFalse(COLLECTOR.accept_request(now=1.0))
        self.assertTrue(COLLECTOR.accept_request(now=61.0))

    def test_http_collector_accepts_json_and_writes_jsonl(self):
        original_log_path = COLLECTOR.LOG_PATH
        with tempfile.TemporaryDirectory() as temp_dir:
            COLLECTOR.LOG_PATH = str(pathlib.Path(temp_dir) / "diagnostics.jsonl")
            server = COLLECTOR.ThreadingHTTPServer(("127.0.0.1", 0), COLLECTOR.DiagnosticsHandler)
            server_thread = threading.Thread(target=server.serve_forever, daemon=True)
            server_thread.start()
            try:
                body = json.dumps(self.valid_payload()).encode("utf-8")
                connection = http.client.HTTPConnection("127.0.0.1", server.server_port, timeout=2)
                connection.request(
                    "POST",
                    "/ingest",
                    body=body,
                    headers={"Content-Type": "application/json", "Content-Length": str(len(body))},
                )
                self.assertEqual(connection.getresponse().status, 204)
                connection.close()

                written = pathlib.Path(COLLECTOR.LOG_PATH).read_text(encoding="utf-8").splitlines()
                self.assertEqual(len(written), 1)
                self.assertEqual(json.loads(written[0])["version"], COLLECTOR.VERSION)
            finally:
                server.shutdown()
                server.server_close()
                server_thread.join(timeout=2)
                COLLECTOR.LOG_PATH = original_log_path


if __name__ == "__main__":
    unittest.main()
