"""
Локальный сервер для разработки: отдаёт файлы проекта и запрещает браузеру кэш
(Cache-Control: no-store), чтобы после правок не показывались старые копии страниц.

Запуск из корня проекта:  python3 tools/dev-server.py [порт] [--lan]     (по умолчанию 8000)
  без --lan — слушает только localhost (этот компьютер);
  --lan     — слушает всю локальную сеть (Wi-Fi), чтобы открыть сайт с телефона: http://<IP компьютера>:<порт>.
              Сайт тогда видят все в этой сети — запускать только дома и останавливать после проверки.
              Скрытые файлы и папки (.git, .claude, .scratch, …) в этом режиме не отдаются (403).
              Вход Google по IP-адресу не работает (его нет в разрешённых доменах Firebase), установка PWA —
              тоже (нужен HTTPS): так можно проверить вёрстку и окно «Zainstaluj aplikację».
Остановка: Ctrl+C.
"""
import http.server
import os
import socket
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
LAN = '--lan' in sys.argv[1:]
PORT = int(ARGS[0]) if ARGS else 8000


class NoCache(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_head(self):
        # в сети не отдаём скрытое: .git (вся история), .claude, .scratch и т. п.
        if LAN:
            path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
            if any(part.startswith('.') for part in path.split('/') if part):
                self.send_error(403, 'hidden')
                return None
        return super().send_head()


def lan_ip():
    # адрес компьютера в локальной сети (пакеты никуда не уходят — только выбор интерфейса)
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('192.168.0.1', 9))
        return s.getsockname()[0]
    except OSError:
        return '<IP компьютера>'
    finally:
        s.close()


if __name__ == '__main__':
    if LAN:
        print('serving', ROOT, 'for the local network: http://%s:%d (no cache, hidden files blocked)' % (lan_ip(), PORT), flush=True)
        http.server.ThreadingHTTPServer(('0.0.0.0', PORT), NoCache).serve_forever()
    else:
        print('serving', ROOT, 'on http://localhost:%d (no cache)' % PORT, flush=True)
        http.server.ThreadingHTTPServer(('localhost', PORT), NoCache).serve_forever()
