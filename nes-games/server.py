"""
nes-games 静态服务器 + Nostalgist 模拟器代理。
支持 COOP/COEP 头（同源代理以避免 credentialless 跨域问题）。
"""
import http.server
import socketserver
import os
import urllib.request
import urllib.parse
import urllib.error

PORT = 8011
ROOT = os.path.dirname(os.path.abspath(__file__))
NOSTALGIST_HOST = "https://mp-game-dos.lxyong.com"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # 使用 unsafe-none 模式，避免 Nostalgist 子资源 COEP 限制
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'unsafe-none')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        # 代理 /nostalgist/...
        import sys
        print(f"[REQ] path={self.path!r} cmd={self.command}", file=sys.stderr, flush=True)
        if "/nostalgist" in self.path:
            self.proxy_nostalgist()
            return
        return super().do_GET()

    def proxy_nostalgist(self):
        target = NOSTALGIST_HOST + self.path
        try:
            req = urllib.request.Request(target, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                body = resp.read()
                status = resp.status
                ctype = resp.headers.get("Content-Type", "text/html")
            self.send_response(status)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            # 代理时也用 unsafe-none 模式
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "unsafe-none")
            self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
            self.end_headers()
            self.wfile.write(body)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.end_headers()
            self.wfile.write(str(e).encode())
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(f"Proxy error: {e}".encode())

    def log_message(self, format, *args):
        pass

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

if __name__ == "__main__":
    os.chdir(ROOT)
    with ReusableTCPServer(("", PORT), Handler) as httpd:
        print(f"nes-games server: http://localhost:{PORT}/", flush=True)
        print(f"Nostalgist proxy: {NOSTALGIST_HOST}", flush=True)
        httpd.serve_forever()

