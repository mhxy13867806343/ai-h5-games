#!/usr/bin/env python3
"""
Simple HTTP server with COOP/COEP headers required for Godot 4 HTML5 games
(SharedArrayBuffer support).
"""
import http.server
import socketserver

PORT = 8772
DIRECTORY = "/Users/hooksvue/Desktop/traeWork-game/ninja-bomb"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Required for SharedArrayBuffer (Godot 4 HTML5 with threads)
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        # Cache static assets briefly
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        # Quieter logs
        pass

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.allow_reuse_address = True
        print(f"Ninja Bomb server: http://localhost:{PORT}/")
        httpd.serve_forever()
