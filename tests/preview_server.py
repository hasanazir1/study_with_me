"""Local UI-only preview. Never packaged into APK. No native audio or Android simulation."""
from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
import json,mimetypes,sys
ROOT=Path(__file__).resolve().parents[1]
class Preview(BaseHTTPRequestHandler):
    def do_GET(self):
        path=self.path.split('?')[0]
        if path in ['/', '/index.html']:
            catalog=(ROOT/'assets/scenes.json').read_text(encoding='utf-8')
            scripts='<script src="/test/catalog.js"></script><script src="/test/prayer-fixture.js"></script><script src="/test/browser-bridge.js"></script><script src="app.js"></script>'
            body=(ROOT/'assets/index.html').read_text(encoding='utf-8').replace('<script src="app.js"></script>',scripts).encode('utf-8')
            mime='text/html'
        elif path=='/test/catalog.js':
            body=('window.SAKIN_AUDIO_CATALOG='+(ROOT/'assets/scenes.json').read_text(encoding='utf-8')+';').encode('utf-8');mime='application/javascript'
        else:
            folder=ROOT/('tests' if path.startswith('/test/') else 'assets')
            target=(folder/path.removeprefix('/test/').lstrip('/')).resolve()
            if not target.is_relative_to(folder.resolve()) or not target.is_file():self.send_error(404);return
            body=target.read_bytes();mime=mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
        self.send_response(200);self.send_header('Content-Type',mime);self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def log_message(self,*args):pass
if __name__=='__main__':
    port=int(sys.argv[1]) if len(sys.argv)>1 else 8765
    print('UI preview only: http://127.0.0.1:'+str(port),flush=True)
    ThreadingHTTPServer(('127.0.0.1',port),Preview).serve_forever()
