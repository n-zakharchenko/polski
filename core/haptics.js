/*
 * Polski — тактильный отклик (вибрация) на телефонах.
 *   Polski.haptic('tap' | 'ok' | 'err' | 'city')
 *     tap  — слово легло в рамку
 *     ok   — верный ответ
 *     err  — ошибка (на Android — двойной импульс)
 *     city — малюх доехал до нового города (поп-ап «Nowe miasto»)
 *   Polski.haptic.touch(кнопка)   — iOS: щелчок при касании этой кнопки (см. ниже); на остальных — ничего
 *   Polski.haptic.untouch(кнопка) — снять
 *   Polski.haptic.supported — есть ли отклик на этом устройстве
 *
 * Android (и другие браузеры с navigator.vibrate) — рисунок вибрации из PATTERNS.
 * iPhone/iPad (iOS 18+) — navigator.vibrate там нет; системный щелчок даёт переключатель
 *   <input type="checkbox" switch>. На iOS 27 (проверено) щелчок бывает, только если переключатель
 *   «нажал» палец — программный label.click() молчит. Поэтому touch() вкладывает в кнопку невидимую подпись
 *   (.haptic-hit во всю кнопку) со скрытым переключателем: палец касается подписи — iOS щёлкает, а click
 *   всплывает до кнопки как обычно. Отсюда ограничения iOS: щелчок — в момент касания, один на касание
 *   (верно/ошибка не различить), а где касания нет (поп-ап города) — пробуем программно, на iOS 27 тишина.
 *   Приём неофициальный: если Apple его закроет, отклика просто не будет, ничего не сломается.
 *   Если в iOS выключена «Системная тактильная отдача», щелчка тоже нет — узнать об этом страница не может.
 * Браузеры дают вибрацию только после нажатия пользователя, поэтому вызовы стоят в обработчиках кликов.
 * Подключается в <head> без defer — touch() нужен уже первому заданию.
 *
 * Выключить — Ustawienia → Wibracje (localStorage 'polski.haptics' = '0'; нет ключа — включено).
 * Секция в настройках есть, только если отклик поддерживается.
 * localhost: ?haptics — считать, что поддерживается, и писать вызовы в консоль (проверка на компьютере);
 *   ?haptics=ios — режим iPhone (подписи в кнопках) — проверить, что кнопки нажимаются по одному разу.
 */
(function () {
  'use strict';

  var Polski = (window.Polski = window.Polski || {});
  var KEY = 'polski.haptics';
  var ua = navigator.userAgent || '';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var forcedParam = LOCAL ? new URLSearchParams(location.search).get('haptics') : null;
  var forced = forcedParam !== null;

  // iPad в режиме «как на компьютере» представляется Маком — выдаёт его сенсорный экран
  var iOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  function iosVersion() {
    var m = ua.match(/ OS (\d+)_/) || ua.match(/Version\/(\d+)/);
    return m ? Number(m[1]) : 0;
  }
  // на компьютере navigator.vibrate в Chrome есть, но ничего не делает — нужен сенсорный экран
  var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  var mode = forced ? (forcedParam === 'ios' ? 'ios' : 'log')
    : iOS ? (iosVersion() >= 18 ? 'ios' : null)
    : (typeof navigator.vibrate === 'function' && coarse ? 'vibrate' : null);

  // Android: мс вибрации / паузы / вибрации …
  var PATTERNS = { tap: [10], ok: [18], err: [30, 80, 30], city: [25, 70, 25, 70, 60] };
  // iOS: щелчки без касания (программные) — только там, где кнопки под пальцем нет
  var IOS_TAPS = { city: 3 };

  function enabled() {
    try { return window.localStorage.getItem(KEY) !== '0'; } catch (e) { return true; }
  }
  function setEnabled(on) {
    try {
      if (on) window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, '0');
    } catch (e) { /* без хранилища — до перезагрузки не запомнится */ }
  }

  function iosTick() {
    var label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.display = 'none';
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    label.appendChild(input);
    // наши щелчки не должны доходить до обработчиков страницы (подсказки и т.п.)
    label.addEventListener('click', function (e) { e.stopPropagation(); });
    (document.body || document.documentElement).appendChild(label);
    label.click();
    label.remove();
  }

  function haptic(kind) {
    if (!mode || !enabled()) return;
    try {
      if (mode === 'vibrate') {
        navigator.vibrate(PATTERNS[kind] || PATTERNS.tap);
      } else if (mode === 'ios') {
        var n = IOS_TAPS[kind] || 0; // tap/ok/err на iOS щёлкает сама кнопка (touch)
        if (n) iosTick();
        for (var i = 1; i < n; i++) setTimeout(iosTick, i * 110);
      } else {
        console.log('[haptic]', kind); // eslint-disable-line no-console
      }
    } catch (e) { /* отклик — украшение: молча пропускаем */ }
  }
  /** iOS: невидимая подпись переключателя во всю кнопку — касание пальцем даёт системный щелчок */
  function touch(el, opts) {
    if (mode !== 'ios' || !el || hitOf(el)) return el;
    var always = !!(opts && opts.always);
    var label = document.createElement('label');
    label.className = 'haptic-hit';
    label.setAttribute('aria-hidden', 'true');
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    input.tabIndex = -1;
    input.style.display = 'none';
    // подпись «нажимает» переключатель вторым click — кнопке он не нужен (иначе обработчик сработал бы дважды)
    input.addEventListener('click', function (e) { e.stopPropagation(); });
    // выключено в настройках — гасим переключение, а с ним и щелчок (click кнопки при этом идёт как обычно)
    label.addEventListener('click', function (e) { if (!always && !enabled()) e.preventDefault(); });
    label.appendChild(input);
    el.classList.add('haptic-host');
    el.appendChild(label);
    return el;
  }
  function hitOf(el) {
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) if (c.classList.contains('haptic-hit')) return c;
    return null;
  }
  function untouch(el) {
    var hit = el && hitOf(el);
    if (hit) hit.remove();
  }

  haptic.supported = !!mode;
  haptic.touch = touch;
  haptic.untouch = untouch;
  Polski.haptic = haptic;

  /* ---------- Ustawienia → Wibracje (только если отклик есть) ---------- */

  if (!mode || !window.PolskiSettings) return;
  var seg = null;
  function renderSeg() {
    if (!seg) return;
    var on = enabled();
    seg.innerHTML = '';
    [{ on: true, title: 'Włączone' }, { on: false, title: 'Wyłączone' }].forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn' + (o.on === on ? ' active' : '');
      b.setAttribute('aria-pressed', o.on === on ? 'true' : 'false');
      b.textContent = o.title;
      b.addEventListener('click', function () {
        setEnabled(o.on);
        renderSeg();
        if (o.on) haptic('ok'); // сразу почувствовать, как это (Android)
      });
      if (o.on) touch(b, { always: true }); // iOS: щелчок при касании «Włączone»
      seg.appendChild(b);
    });
  }
  window.PolskiSettings.addSection({
    title: 'Wibracje',
    render: function (body) {
      seg = document.createElement('div');
      seg.className = 'seg';
      seg.setAttribute('role', 'group');
      seg.setAttribute('aria-label', 'Wibracje');
      body.appendChild(seg);
      renderSeg();
    },
    onOpen: renderSeg,
  });
})();
