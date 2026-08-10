#!/usr/bin/env python3
"""
All-in-one static HTTP server for the H5 game collection.

Adds the COOP/COEP headers required by Cocos Creator (SharedArrayBuffer),
EmulatorJS threads and Godot 4 HTML5 builds.

Usage:
    python3 server.py            # serve on 0.0.0.0:8000
    python3 server.py 9000       # custom port
"""
import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Required for SharedArrayBuffer (Cocos Creator / Godot 4 / EJS threads)
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
        print(f"H5 Game Server: http://localhost:{PORT}/")
        print(f"  - http://localhost:{PORT}/happy-farm.html")
        print(f"  - http://localhost:{PORT}/samurai-shodown.html")
        print(f"  - http://localhost:{PORT}/cao-cao-chuan.html")
        print(f"  - http://localhost:{PORT}/ninja-bomb/index.html")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
