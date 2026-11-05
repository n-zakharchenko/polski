"""
Локальный сервер для разработки: отдаёт файлы проекта и запрещает браузеру кэш
(Cache-Control: no-store), чтобы после правок не показывались старые копии страниц.

Запуск из корня проекта:  python3 tools/dev-server.py [порт]     (по умолчанию 8000)
Слушает только localhost. Остановка: Ctrl+C.
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class NoCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    print('serving', ROOT, 'on http://localhost:%d (no cache)' % PORT, flush=True)
    http.server.ThreadingHTTPServer(('localhost', PORT), NoCache).serve_forever()
