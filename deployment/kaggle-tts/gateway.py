"""Loopback-only Bearer gateway for the temporary Kaggle demo tunnel."""
from __future__ import annotations

import hmac
import http.client
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

MAX_PAYLOAD = 16 * 1024 * 1024


def make_handler(token: str, upstream_port: int = 8000) -> type[BaseHTTPRequestHandler]:
    if len(token) < 32 or not token.isascii() or any(char.isspace() for char in token):
        raise ValueError("VOICE_API_KEY must be at least 32 ASCII characters without whitespace")

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args: object) -> None:
            pass  # Never log request headers, credentials, text, or reference audio.

        def reply(self, status: int, body: bytes, content_type: str = "application/json") -> None:
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def forward(self) -> None:
            supplied = self.headers.get("Authorization", "")
            if not hmac.compare_digest(supplied.encode("utf-8"), f"Bearer {token}".encode("ascii")):
                self.reply(401, b'{"detail":"Unauthorized"}')
                return
            if (self.command, self.path) not in {("GET", "/health"), ("POST", "/")}:
                self.reply(404, b'{"detail":"Not found"}')
                return
            if self.headers.get("Transfer-Encoding"):
                self.reply(400, b'{"detail":"Use Content-Length"}')
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self.reply(400, b'{"detail":"Invalid Content-Length"}')
                return
            if length < 0 or length > MAX_PAYLOAD:
                self.reply(413, b'{"detail":"Payload too large"}')
                return
            if self.command == "POST" and not length:
                self.reply(400, b'{"detail":"JSON body required"}')
                return
            # Bound stalled uploads without changing inference request timeouts.
            self.connection.settimeout(30)
            try:
                body = self.rfile.read(length)
            except TimeoutError:
                self.reply(408, b'{"detail":"Upload timed out"}')
                return
            if len(body) != length:
                self.reply(400, b'{"detail":"Incomplete body"}')
                return
            connection = http.client.HTTPConnection("127.0.0.1", upstream_port, timeout=None)
            try:
                connection.request(self.command, self.path, body=body,
                                   headers={"Content-Type": "application/json"})
                response = connection.getresponse()
                self.reply(response.status, response.read(), response.getheader("Content-Type", "application/json"))
            except (OSError, http.client.HTTPException):
                self.reply(502, json.dumps({"detail": "Model server unavailable; check notebook logs"}).encode())
            finally:
                connection.close()

        do_GET = forward
        do_POST = forward

    return Handler


if __name__ == "__main__":
    handler = make_handler(os.environ["VOICE_API_KEY"])
    ThreadingHTTPServer(("127.0.0.1", 8001), handler).serve_forever()
