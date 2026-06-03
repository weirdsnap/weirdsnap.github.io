#!/usr/bin/env python3
"""
Dev server with live reload.
Usage: python3 serve.py
Save any file → browser auto-refreshes.
"""
import os
import sys
import http.server
import socketserver

PORT = 8080
EXCLUDE_DIRS = {'.git', '.venv', '__pycache__', '.kimi'}

# Live reload script injected into every HTML response
RELOAD_SCRIPT = b'''<script>
(function(){
    var last=0;
    function check(){
        fetch('/__live_reload__')
            .then(function(r){return r.text();})
            .then(function(ts){
                var t=parseFloat(ts);
                if(last && t>last) location.reload();
                last=t;
            }).catch(function(){});
    }
    check();
    setInterval(check,800);
})();
</script>'''


def get_max_mtime():
    """Return the newest mtime among all files under project root."""
    max_mtime = 0
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            path = os.path.join(root, f)
            try:
                mtime = os.path.getmtime(path)
                if mtime > max_mtime:
                    max_mtime = mtime
            except OSError:
                pass
    return max_mtime


class LiveReloadHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__live_reload__':
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(str(get_max_mtime()).encode())
            return
        super().do_GET()

    def copyfile(self, source, outputfile):
        """Intercept HTML responses to inject the live-reload script."""
        path = self.translate_path(self.path)
        if path.endswith(('.html', '.htm')):
            content = source.read()
            if b'</body>' in content:
                content = content.replace(b'</body>', RELOAD_SCRIPT + b'</body>')
            else:
                content += RELOAD_SCRIPT
            outputfile.write(content)
        else:
            super().copyfile(source, outputfile)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()


def run():
    with socketserver.TCPServer(("", PORT), LiveReloadHandler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        print("Live reload enabled — save any file and browser will auto-refresh.")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            sys.exit(0)


if __name__ == '__main__':
    run()
