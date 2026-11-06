/*
 * Автообновление: открытая страница и установленное приложение (PWA) сами переходят на новую версию сайта.
 *
 * Зачем: GitHub Pages разрешает кэшировать HTML 10 минут, а iOS держит PWA в памяти — после публикации
 * человек мог долго видеть старую страницу (а она тянет старые скрипты со своей меткой ?v=).
 *
 * Как: при открытии и при каждом возвращении на экран (не чаще раза в CHECK_EVERY_MS) читаем version.json
 * в обход кэша (его пишет tools/bump-version.js). Версия на сайте новее нашей window.POLSKI_V —
 * перезагружаемся по адресу с ?_v=<новая>: новый адрес → браузер точно не возьмёт страницу из кэша.
 *   — посреди теста не перезагружаем (пропал бы прогресс): ui.js ставит Polski.busy, проверим позже;
 *   — на одну версию одна попытка (sessionStorage) — без зацикливания, если кэш упрямится;
 *   — после перезагрузки ?_v убираем из адресной строки;
 *   — на localhost и с file:// выключено (там dev-сервер без кэша).
 */
(function () {
  'use strict';

  var CHECK_EVERY_MS = 60 * 1000;
  var KEY = 'polski.reloadedTo';
  var cur = window.POLSKI_V || '';
  if (!cur || location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  // пришли по ?_v=… — убрать метку из адреса (страница уже свежая)
  try {
    var u = new URL(location.href);
    if (u.searchParams.has('_v')) {
      u.searchParams.delete('_v');
      history.replaceState(history.state, '', u.pathname + (u.search || '') + u.hash);
    }
  } catch (e) { /* старый браузер — оставим как есть */ }

  var lastCheck = 0, pending = null;

  function busy() { return !!(window.Polski && window.Polski.busy); }

  function reloadTo(v) {
    var tried = null;
    try { tried = sessionStorage.getItem(KEY); } catch (e) { /* без sessionStorage — одна попытка за загрузку */ }
    if (tried === v) return; // уже пробовали — не крутимся
    try { sessionStorage.setItem(KEY, v); } catch (e) { /* ничего */ }
    var url = new URL(location.href);
    url.searchParams.set('_v', v);
    location.replace(url.toString());
  }

  function check() {
    var now = Date.now();
    if (now - lastCheck < CHECK_EVERY_MS) return;
    lastCheck = now;
    fetch('version.json?t=' + now, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var v = d && d.v;
        if (!v || !(v > cur)) return; // метки ГГГГММДД-ЧЧММ сравниваются как строки
        if (busy()) { pending = v; return; } // идёт тест — после итога
        reloadTo(v);
      })
      .catch(function () { /* нет сети — проверим в следующий раз */ });
  }

  // тест закончился (ui.js снимает Polski.busy и шлёт событие) — если ждали новую версию, перезагрузимся
  document.addEventListener('polski:idle', function () { if (pending) reloadTo(pending); });

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { lastCheck = 0; check(); } }); // вернулись «назад» из кэша страниц
  check();
})();
