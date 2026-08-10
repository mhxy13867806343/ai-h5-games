#!/usr/bin/env python3
"""
Standalone static HTTP server for the 口袋妖怪：黑暗升起（秩序毁灭） page.

Adds the COOP/COEP headers required by SharedArrayBuffer (used by mGBA-WASM /
EmulatorJS in the browser).

Usage:
    python3 server.py            # serve on 0.0.0.0:8765
    python3 server.py 9000       # custom port
"""
import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Required for SharedArrayBuffer (mGBA / EJS / Godot 4 / Cocos)
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        # Avoid stale caches while developing
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        # Quieter logs
        pass


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with ReusableTCPServer(("", PORT), Handler) as httpd:
        print(f"Pokemon Dark Rising Server: http://localhost:{PORT}/")
        print(f"  - http://localhost:{PORT}/pokemon-dark-rising.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
