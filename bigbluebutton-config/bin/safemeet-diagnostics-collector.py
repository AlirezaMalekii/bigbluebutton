#!/usr/bin/env python3
"""Bounded, local-only SafeMeet browser diagnostics collector."""

import argparse
import collections
import datetime
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


VERSION = "safemeet-diagnostics/v1"
LISTEN_HOST = "127.0.0.1"
LISTEN_PORT = 9089
LOG_PATH = "/var/log/bigbluebutton/safemeet-client-diagnostics.jsonl"
MAX_BODY_BYTES = 64 * 1024
MAX_EVENTS = 200
MAX_STRING_LENGTH = 4096
FORBIDDEN_KEYS = {
    "authtoken",
    "confname",
    "externuserid",
    "fullname",
    "logouturl",
    "requestertoken",
    "sdp",
    "sessiontoken",
    "token",
}
SECRET_QUERY_RE = re.compile(
    r"([?&](?:sessionToken|authToken|token|checksum|logoutURL)=)[^&#\s]*",
    re.IGNORECASE,
)
URL_RE = re.compile(r"https?://[^\s)]+", re.IGNORECASE)
WRITE_LOCK = threading.Lock()
RATE_LOCK = threading.Lock()
REQUEST_TIMESTAMPS = collections.deque()
MAX_REQUESTS_PER_MINUTE = 240
IDENTITY_FIELDS = {
    "meetingId",
    "requesterUserId",
    "clientSessionUUID",
    "clientBuild",
    "role",
}
DEVICE_FIELDS = {
    "userAgent",
    "platform",
    "touchPoints",
    "viewportWidth",
    "viewportHeight",
    "orientation",
}


def sanitize_string(value, limit=MAX_STRING_LENGTH):
    value = SECRET_QUERY_RE.sub(r"\1[redacted]", str(value))
    value = URL_RE.sub("[redacted-url]", value)
    return value[:limit]


def sanitize_mapping(value, depth=0):
    if not isinstance(value, dict) or depth > 2:
        return {}
    safe = {}
    for raw_key, raw_value in value.items():
        key = sanitize_string(raw_key, 128)
        if key.lower() in FORBIDDEN_KEYS:
            continue
        if isinstance(raw_value, bool) or raw_value is None:
            safe[key] = raw_value
        elif isinstance(raw_value, (int, float)):
            safe[key] = raw_value
        elif isinstance(raw_value, str):
            safe[key] = sanitize_string(raw_value)
        elif isinstance(raw_value, dict):
            safe[key] = sanitize_mapping(raw_value, depth + 1)
    return safe


def allowlisted_mapping(value, allowed_fields):
    if not isinstance(value, dict):
        return {}
    return sanitize_mapping({key: value[key] for key in allowed_fields if key in value})


def accept_request(now=None):
    """Bound total collector load; nginx always proxies from localhost."""
    current = time.monotonic() if now is None else now
    cutoff = current - 60
    with RATE_LOCK:
        while REQUEST_TIMESTAMPS and REQUEST_TIMESTAMPS[0] <= cutoff:
            REQUEST_TIMESTAMPS.popleft()
        if len(REQUEST_TIMESTAMPS) >= MAX_REQUESTS_PER_MINUTE:
            return False
        REQUEST_TIMESTAMPS.append(current)
    return True


def normalize_payload(payload):
    if not isinstance(payload, dict) or payload.get("version") != VERSION:
        raise ValueError("unsupported diagnostics envelope")

    identity = allowlisted_mapping(payload.get("identity"), IDENTITY_FIELDS)
    required = ("meetingId", "requesterUserId", "clientSessionUUID", "clientBuild")
    if any(not isinstance(identity.get(field), str) for field in required):
        raise ValueError("missing diagnostics identity")

    events = payload.get("events")
    if not isinstance(events, list) or not events or len(events) > MAX_EVENTS:
        raise ValueError("invalid diagnostics event batch")

    normalized_events = []
    for event in events:
        if not isinstance(event, dict):
            continue
        log_code = sanitize_string(event.get("logCode", ""), 128)
        timestamp = sanitize_string(event.get("timestamp", ""), 64)
        if not log_code or not timestamp:
            continue
        normalized_events.append({
            "timestamp": timestamp,
            "logCode": log_code,
            "data": sanitize_mapping(event.get("data")),
        })

    if not normalized_events:
        raise ValueError("empty diagnostics event batch")

    return {
        "receivedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "version": VERSION,
        "identity": identity,
        "device": allowlisted_mapping(payload.get("device"), DEVICE_FIELDS),
        "events": normalized_events,
    }


def append_payload(payload):
    line = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
    with WRITE_LOCK:
        descriptor = os.open(LOG_PATH, os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o640)
        try:
            os.write(descriptor, line.encode("utf-8"))
        finally:
            os.close(descriptor)


class DiagnosticsHandler(BaseHTTPRequestHandler):
    server_version = "SafeMeetDiagnostics/1"

    def do_POST(self):
        if self.path != "/ingest":
            self.send_error(404)
            return
        if not accept_request():
            self.send_error(429)
            return
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        if content_type != "application/json":
            self.send_error(415)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.send_error(400)
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self.send_error(413)
            return
        try:
            raw = self.rfile.read(length)
            payload = normalize_payload(json.loads(raw.decode("utf-8")))
            append_payload(payload)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            self.send_error(400)
            return
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        self.send_error(405)

    def log_message(self, message, *args):
        return


def serve():
    os.makedirs(os.path.dirname(LOG_PATH), mode=0o750, exist_ok=True)
    server = ThreadingHTTPServer((LISTEN_HOST, LISTEN_PORT), DiagnosticsHandler)
    server.serve_forever()


def parse_timestamp(value):
    if not value:
        return None
    return datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))


def tail(args):
    if not os.path.exists(LOG_PATH):
        return
    with open(LOG_PATH, "r", encoding="utf-8", errors="replace") as log_file:
        lines = collections.deque(log_file, maxlen=args.lines)
    since = parse_timestamp(args.since)
    for line in lines:
        try:
            payload = json.loads(line)
        except json.JSONDecodeError:
            continue
        identity = payload.get("identity", {})
        if args.meeting and identity.get("meetingId") != args.meeting:
            continue
        if args.user and identity.get("requesterUserId") != args.user:
            continue
        if args.session and identity.get("clientSessionUUID") != args.session:
            continue
        events = []
        for event in payload.get("events", []):
            if args.log_code and event.get("logCode") != args.log_code:
                continue
            if since:
                try:
                    if parse_timestamp(event.get("timestamp")) < since:
                        continue
                except (TypeError, ValueError):
                    continue
            events.append(event)
        if events:
            payload["events"] = events
            print(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("serve")
    tail_parser = subparsers.add_parser("tail")
    tail_parser.add_argument("--meeting")
    tail_parser.add_argument("--user")
    tail_parser.add_argument("--session")
    tail_parser.add_argument("--log-code")
    tail_parser.add_argument("--since")
    tail_parser.add_argument("--lines", type=int, default=1000)
    args = parser.parse_args()
    if args.command == "serve":
        serve()
    else:
        tail(args)


if __name__ == "__main__":
    main()
