#!/usr/bin/env python3
"""
Standalone static HTTP server for the indienova GameDB - Game Boy Advance (GBA) page.

Adds the COOP/COEP headers required by SharedArrayBuffer (used by mGBA-WASM /
EmulatorJS in the browser).

Usage:
    python3 server.py            # serve on 0.0.0.0:8770
    python3 server.py 9000       # custom port
"""
import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8770
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
        print(f"indienova GameDB (GBA) Server: http://localhost:{PORT}/")
        print(f"  - http://localhost:{PORT}/index.html")
        print(f"  - http://localhost:{PORT}/game.html?slug=pokemon-firered-version")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
