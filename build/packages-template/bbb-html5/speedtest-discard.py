#!/usr/bin/env python3
"""Read and discard HTTP POST bodies, then 204. Used by nginx speed-test upload."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BIND = ('127.0.0.1', 31417)
READ_CHUNK = 65536


class DiscardHandler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    close_connection = True

    def do_POST(self):
        self._discard_body()
        self.send_response(204)
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_PUT(self):
        self.do_POST()

    def _discard_body(self):
        length_header = self.headers.get('Content-Length')
        if length_header:
            remaining = max(0, int(length_header))
            while remaining > 0:
                chunk = self.rfile.read(min(READ_CHUNK, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
            return
        if self.headers.get('Transfer-Encoding', '').lower() == 'chunked':
            while True:
                line = self.rfile.readline()
                if not line:
                    break
                size = int(line.split(b';', 1)[0].strip() or b'0', 16)
                if size == 0:
                    self.rfile.readline()
                    break
                remaining = size
                while remaining > 0:
                    chunk = self.rfile.read(min(READ_CHUNK, remaining))
                    if not chunk:
                        return
                    remaining -= len(chunk)
                self.rfile.readline()

    def log_message(self, format, *args):  # noqa: A003
        return


if __name__ == '__main__':
    ThreadingHTTPServer(BIND, DiscardHandler).serve_forever()
