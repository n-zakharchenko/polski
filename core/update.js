/*
 * Автообновление: открытая страница и установленное приложение (PWA) сами переходят на новую версию сайта.
 *
 * Зачем: GitHub Pages разрешает кэшировать HTML 10 минут, а iOS держит PWA в памяти — после публикации
 * человек мог долго видеть старую страницу (а она тянет старые скрипты со своей меткой ?v=).
 *
 * Как:
 *   1) sw.js (регистрируем здесь) — при каждом открытии страницы берёт HTML с сервера, а не из 10-минутного кэша;
 *   2) при открытии и при каждом возвращении на экран (не чаще раза в CHECK_EVERY_MS) читаем version.json
 *      в обход кэша (его пишет tools/bump-version.js). Версия на сайте новее нашей window.POLSKI_V —
 *      перезагружаемся по адресу с ?_v=<новая>: новый адрес → браузер точно не возьмёт страницу из кэша;
 *   3) самую новую известную версию помним (localStorage 'polski.latestV'): если открылась страница старее
 *      (например, «назад» восстановил старую), прячем её и перезагружаем сразу, ещё до отрисовки — без мигания.
 *      Поэтому скрипт подключён в <head> без defer.
 *   — посреди теста не перезагружаем (пропал бы прогресс): ui.js ставит Polski.busy, проверим после итога;
 *   — одна попытка на версию ДЛЯ КАЖДОЙ СТРАНИЦЫ (sessionStorage) — без зацикливания, если кэш упрямится
 *     (раньше попытка была одна на весь сеанс — и раздел после теста оставался старым);
 *   — после перезагрузки ?_v убираем из адресной строки;
 *   — на localhost и с file:// выключено (там dev-сервер без кэша).
 */
(function () {
  'use strict';

  var CHECK_EVERY_MS = 60 * 1000;
  var KEY = 'polski.reloadedTo';    // + адрес страницы: на какую версию её уже перезагружали
  var LATEST = 'polski.latestV';    // самая новая версия, о которой знаем
  var cur = window.POLSKI_V || '';
  if (!cur || location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;

  // страницы — всегда свежие с сервера (см. sw.js)
  if ('serviceWorker' in navigator) {
    try { navigator.serviceWorker.register('sw.js').catch(function () { /* без него — проверка ниже */ }); } catch (e) { /* ничего */ }
  }

  /** адрес страницы без ?_v — ключ «уже пробовали» у каждой страницы свой */
  function pageKey() {
    try {
      var u = new URL(location.href);
      u.searchParams.delete('_v');
      return KEY + ':' + u.pathname + u.search;
    } catch (e) { return KEY + ':' + location.pathname; }
  }

  // пришли по ?_v=… — убрать метку из адреса (страница уже свежая)
  try {
    var u0 = new URL(location.href);
    if (u0.searchParams.has('_v')) {
      u0.searchParams.delete('_v');
      history.replaceState(history.state, '', u0.pathname + (u0.search || '') + u0.hash);
    }
  } catch (e) { /* старый браузер — оставим как есть */ }

  function known() { try { return localStorage.getItem(LATEST) || ''; } catch (e) { return ''; } }
  function remember(v) { try { if (v > known()) localStorage.setItem(LATEST, v); } catch (e) { /* ничего */ } }

  var lastCheck = 0, pending = null;

  function busy() { return !!(window.Polski && window.Polski.busy); }

  /** перезагрузиться на версию v; false — для этой страницы уже пробовали (не зацикливаемся) */
  function reloadTo(v) {
    var key = pageKey(), tried = null;
    try { tried = sessionStorage.getItem(key); } catch (e) { /* без sessionStorage — одна попытка за загрузку */ }
    if (tried === v) return false;
    try { sessionStorage.setItem(key, v); } catch (e) { /* ничего */ }
    var url = new URL(location.href);
    url.searchParams.set('_v', v);
    location.replace(url.toString());
    return true;
  }

  /** уже знаем, что есть версия новее этой страницы — прячем её и перезагружаем до отрисовки */
  function early() {
    var k = known();
    if (!(k > cur) || busy()) return;
    var root = document.documentElement;
    root.style.visibility = 'hidden';
    if (!reloadTo(k)) root.style.visibility = ''; // уже пробовали — показываем как есть, проверка ниже
  }

  function check() {
    var now = Date.now();
    if (now - lastCheck < CHECK_EVERY_MS) return;
    lastCheck = now;
    fetch('version.json?t=' + now, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var v = d && d.v;
        if (!v) return;
        remember(v);
        if (!(v > cur)) return; // метки ГГГГММДД-ЧЧММ сравниваются как строки
        if (busy()) { pending = v; return; } // идёт тест — после итога
        reloadTo(v);
      })
      .catch(function () { /* нет сети — проверим в следующий раз */ });
  }

  remember(cur);
  early();

  // тест закончился (ui.js снимает Polski.busy и шлёт событие) — если ждали новую версию, перезагрузимся
  document.addEventListener('polski:idle', function () { if (pending) reloadTo(pending); });

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') check(); });
  // вернулись «назад» из кэша страниц — сразу сверяемся с известной версией, потом с сайтом
  window.addEventListener('pageshow', function (e) { if (e.persisted) { early(); lastCheck = 0; check(); } });
  check();
})();
