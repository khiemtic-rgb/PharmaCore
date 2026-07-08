#!/usr/bin/env python3
"""Minimal SMS gateway stub for pilot — logs OTP POST body to stdout (journald).
Production should replace CustomerAppSms__HttpUrl with a real SMS vendor."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import sys


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _read_post_body(self) -> bytes:
        length = self.headers.get("Content-Length")
        if length is not None:
            return self.rfile.read(int(length))

        if self.headers.get("Transfer-Encoding", "").lower() == "chunked":
            parts: list[bytes] = []
            while True:
                line = self.rfile.readline()
                if not line:
                    break
                chunk_size = int(line.split(b";", 1)[0], 16)
                if chunk_size == 0:
                    self.rfile.readline()
                    break
                parts.append(self.rfile.read(chunk_size))
                self.rfile.readline()
            return b"".join(parts)

        return b""

    def do_POST(self):
        if self.headers.get("Expect", "").lower() == "100-continue":
            self.send_response(100)
            self.end_headers()

        raw_bytes = self._read_post_body()
        raw = raw_bytes.decode("utf-8", errors="replace")

        if not raw_bytes:
            print(
                "[SMS-STUB] empty body — "
                f"Content-Length={self.headers.get('Content-Length')} "
                f"Transfer-Encoding={self.headers.get('Transfer-Encoding')} "
                f"Expect={self.headers.get('Expect')}",
                flush=True,
            )

        try:
            payload = json.loads(raw) if raw else {}
            code = payload.get("code") or payload.get("Code") or "?"
            phone = payload.get("phone") or payload.get("Phone") or "?"
            print(f"[SMS-STUB] OTP {code} -> {phone}", flush=True)
            if raw:
                print(f"[SMS-STUB] body: {raw}", flush=True)
        except json.JSONDecodeError:
            print(f"[SMS-STUB] raw: {raw!r}", flush=True)

        body = b'{"ok":true}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9091
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()
