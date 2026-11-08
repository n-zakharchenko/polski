/*
 * Service worker: страницы сайта — всегда свежие.
 *
 * Зачем: GitHub Pages разрешает браузеру держать HTML в кэше 10 минут. После публикации телефон (особенно
 * установленное приложение) открывал старую страницу, а core/update.js потом резко перезагружал её на новую;
 * «назад» снова показывал старую. Здесь каждое открытие страницы идёт на сервер с проверкой (cache: 'no-cache':
 * не изменилась — короткий ответ 304, изменилась — новая). Скрипты и стили не трогаем: у них метка ?v=.
 * Без сети — обычный запрос (возьмёт что есть в кэше браузера). Ничего не сохраняет сам (Cache Storage не нужен).
 * Регистрирует core/update.js (не на localhost).
 */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.mode !== 'navigate' || req.method !== 'GET') return; // только открытие страниц
  e.respondWith(
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
      // переадресация (например, /polski → /polski/) — отдаём как переадресацию, иначе браузер откажется
      return res.redirected ? Response.redirect(res.url, 302) : res;
    }).catch(function () { return fetch(req); })
  );
});
