/*
 * Polski — настройки (общие для всех страниц).
 * Подключается в <head>, до отрисовки: сразу применяет тему, чтобы не мигала светлая.
 * После загрузки страницы добавляет шестерёнку в правый верхний угол и окно «Ustawienia».
 *
 * Styl: «Pastelowy» (по умолчанию) / «Gazeta» — см. блок STYLES ниже.
 * Motyw: «Jak na urządzeniu» (как в системе) / «Dzień» / «Noc».
 *   Хранится в localStorage 'polski.theme' ('light' | 'dark'; нет ключа — как в системе).
 *   Применяется атрибутом <html data-theme="light|dark"> — см. style.css.
 */
(function () {
  'use strict';

  var KEY = 'polski.theme';
  var THEMES = [
    { id: 'system', title: 'Jak na urządzeniu' },
    { id: 'light', title: 'Dzień' },
    { id: 'dark', title: 'Noc' },
  ];

  function readTheme() {
    try {
      var v = window.localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch (e) {
      return 'system';
    }
  }

  function saveTheme(theme) {
    try {
      if (theme === 'system') window.localStorage.removeItem(KEY);
      else window.localStorage.setItem(KEY, theme);
    } catch (e) { /* без хранилища тема действует до перезагрузки */ }
  }

  function applyTheme(theme) {
    var root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }

  applyTheme(readTheme()); // до отрисовки

  /*
   * Styl — оформление сайта: «Pastelowy» (по умолчанию) или «Gazeta».
   *   Оба файла (designs/01-retro-pastel.css, designs/02-gazeta.css) подключены в <head> каждой страницы
   *   и ограничены атрибутом <html data-design="…">, поэтому стиль включается до первой отрисовки,
   *   а переключение в настройках — мгновенное. Выбор — localStorage 'polski.style'.
   *
   * Только на localhost (пробы новых вариантов):
   *   ?design=ID   — включить вариант (и запомнить); незнакомый ID — подгрузить designs/ID.css(+.js)
   *   ?design=none — старый базовый дизайн (style.css без вариантов)
   *   &compare     — для страницы сравнения: выбор не запоминать, переключатель не показывать
   */
  var STYLES = [
    { id: '01-retro-pastel', title: 'Pastelowy' },
    { id: '02-gazeta', title: 'Gazeta' },
  ];
  var DEFAULT_STYLE = STYLES[0].id;
  var STYLE_KEY = 'polski.style';
  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var params = new URLSearchParams(location.search);
  var compareMode = LOCAL && params.has('compare');

  function isBuiltIn(id) { return STYLES.some(function (s) { return s.id === id; }); }

  function readStyle() {
    var d = LOCAL ? params.get('design') : null;
    if (d !== null && /^[\w-]+$/.test(d)) {
      if (!compareMode) saveStyle(d);
      return d;
    }
    var v = null;
    try { v = window.localStorage.getItem(STYLE_KEY); } catch (e) { v = null; }
    if (v && (isBuiltIn(v) || (LOCAL && /^[\w-]+$/.test(v)))) return v;
    return DEFAULT_STYLE;
  }

  function saveStyle(id) {
    try { window.localStorage.setItem(STYLE_KEY, id); } catch (e) { /* только до перезагрузки */ }
  }

  function applyStyle(id) {
    var root = document.documentElement;
    if (id === 'none') root.removeAttribute('data-design');
    else root.setAttribute('data-design', id);
    document.dispatchEvent(new CustomEvent('polski:style', { detail: id }));
  }

  var design = readStyle();
  applyStyle(design); // до отрисовки

  // localhost: вариант, которого нет среди подключённых в <head>, — подгружаем его файлы
  if (LOCAL && design !== 'none' && !isBuiltIn(design)) {
    // без мигания старого дизайна:
    //  - страница невидима, пока не загрузились файл варианта и его шрифты (предел — 2 с);
    //  - плавные переходы выключены, иначе кнопки «доезжают» из цветов основного дизайна;
    //  - фон окна — запомненный цвет этого варианта, он ставится сразу (visibility фон не прячет).
    var themeNow = document.documentElement.getAttribute('data-theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var bgKey = 'polski.designBg.' + design + '.' + themeNow;
    var savedBg = null;
    try { savedBg = window.localStorage.getItem(bgKey); } catch (e) { /* без хранилища — без цвета заранее */ }
    var veil = document.createElement('style');
    veil.textContent = 'html{visibility:hidden' + (savedBg ? ';background:' + savedBg : '') + '}';
    var noMotion = document.createElement('style');
    noMotion.textContent = '*,*::before,*::after{transition:none!important}';
    document.head.appendChild(veil);
    document.head.appendChild(noMotion);
    var revealed = false;
    var reveal = function () {
      if (revealed) return;
      revealed = true;
      try {
        var bg = window.getComputedStyle(document.body || document.documentElement).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)') window.localStorage.setItem(bgKey, bg);
      } catch (e) { /* не страшно */ }
      if (veil.parentNode) veil.parentNode.removeChild(veil);
      // переходы — обратно через пару кадров, когда всё уже нарисовано в цветах варианта
      var motionBack = function () { if (noMotion.parentNode) noMotion.parentNode.removeChild(noMotion); };
      requestAnimationFrame(function () { requestAnimationFrame(motionBack); });
      setTimeout(motionBack, 300); // фоновая вкладка кадры не рисует
    };
    setTimeout(reveal, 2000);
    // показываем, когда готовы три вещи: файл стилей варианта, его необязательный скрипт
    // (designs/<id>.js — например, шапка газеты с датой) и сама страница; потом ждём шрифты
    var pending = 3;
    var settle = function () {
      pending -= 1;
      if (pending > 0) return;
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(reveal, reveal);
      else reveal();
    };
    var stamp = Date.now(); // всегда свежие файлы: варианты правим часто
    var designLink = document.createElement('link');
    designLink.rel = 'stylesheet';
    designLink.href = 'designs/' + design + '.css?t=' + stamp;
    designLink.onload = settle;
    designLink.onerror = settle;
    document.head.appendChild(designLink);
    var designScript = document.createElement('script');
    designScript.src = 'designs/' + design + '.js?t=' + stamp;
    designScript.onload = settle;
    designScript.onerror = settle; // скрипта у варианта может и не быть
    document.head.appendChild(designScript);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', settle);
    else settle();
  }
  if (LOCAL && !compareMode) {
    // переключатель вариантов (🎨 внизу слева): сначала список, потом сам переключатель
    var addScript = function (src, then) {
      var s = document.createElement('script');
      s.src = src + '?t=' + Date.now();
      if (then) s.onload = then;
      document.head.appendChild(s);
    };
    addScript('designs/list.js', function () { addScript('designs/switcher.js'); });
  }

  var GEAR_SVG =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/>' +
    '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 ' +
    '1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 ' +
    '0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 ' +
    '1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 ' +
    '1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 ' +
    '0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

  /*
   * Дополнительные секции окна (например, «Konto» из core/account.js):
   *   PolskiSettings.addSection({ title, render(body), onOpen() })
   * render вызывается один раз при создании окна, onOpen — при каждом открытии.
   */
  var sections = [];
  var mountPoint = null;

  function mountSection(def) {
    var sec = document.createElement('section');
    sec.className = 'settings-section';
    var label = document.createElement('div');
    label.className = 'chooser-label';
    label.textContent = def.title;
    var body = document.createElement('div');
    sec.appendChild(label);
    sec.appendChild(body);
    mountPoint.appendChild(sec);
    if (def.render) def.render(body);
  }

  function addSection(def) {
    sections.push(def);
    if (mountPoint) mountSection(def);
  }

  function build() {
    var btn = document.createElement('button');
    btn.className = 'settings-btn';
    btn.type = 'button';
    btn.title = 'Ustawienia';
    btn.setAttribute('aria-label', 'Ustawienia');
    btn.innerHTML = GEAR_SVG;

    // то же оформление, что у окна правила (.rule-dialog)
    var dlg = document.createElement('dialog');
    dlg.className = 'rule-dialog settings-dialog';
    dlg.setAttribute('aria-label', 'Ustawienia');
    dlg.innerHTML =
      '<div class="rule-inner">' +
      '<div class="rule-head"><h2 class="rule-title">Ustawienia</h2>' +
      '<button class="rule-close" type="button" aria-label="Zamknij">×</button></div>' +
      '<section class="settings-section">' +
      '<div class="chooser-label">Styl</div>' +
      '<div class="seg seg-style" role="group" aria-label="Styl"></div>' +
      '</section>' +
      '<section class="settings-section">' +
      '<div class="chooser-label">Motyw</div>' +
      '<div class="seg seg-theme" role="group" aria-label="Motyw"></div>' +
      '</section></div>';

    var seg = dlg.querySelector('.seg-theme');
    var segStyle = dlg.querySelector('.seg-style');
    mountPoint = dlg.querySelector('.rule-inner');
    sections.forEach(mountSection);

    function renderStyles() {
      var current = document.documentElement.getAttribute('data-design') || 'none';
      segStyle.innerHTML = '';
      STYLES.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'seg-btn' + (s.id === current ? ' active' : '');
        b.setAttribute('aria-pressed', s.id === current ? 'true' : 'false');
        b.textContent = s.title;
        b.addEventListener('click', function () {
          saveStyle(s.id);
          applyStyle(s.id);
          renderStyles();
        });
        segStyle.appendChild(b);
      });
    }

    function renderThemes() {
      var current = readTheme();
      seg.innerHTML = '';
      THEMES.forEach(function (t) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'seg-btn' + (t.id === current ? ' active' : '');
        b.setAttribute('aria-pressed', t.id === current ? 'true' : 'false');
        b.textContent = t.title;
        b.addEventListener('click', function () {
          saveTheme(t.id);
          applyTheme(t.id);
          renderThemes();
        });
        seg.appendChild(b);
      });
    }

    function open() {
      renderStyles();
      renderThemes();
      sections.forEach(function (s) { if (s.onOpen) s.onOpen(); });
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    }
    function close() {
      if (typeof dlg.close === 'function') dlg.close();
      else dlg.removeAttribute('open');
    }

    btn.addEventListener('click', open);
    dlg.querySelector('.rule-close').addEventListener('click', close);
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); }); // клик по фону

    // кнопка — внутри <main>: в основном дизайне она всё равно в углу страницы (main не позиционирован),
    // а варианты дизайна могут привязать её к углу панели (main { position: relative })
    (document.querySelector('main') || document.body).appendChild(btn);
    document.body.appendChild(dlg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();

  window.PolskiSettings = {
    readTheme: readTheme, applyTheme: applyTheme, addSection: addSection,
    styles: STYLES, readStyle: readStyle, applyStyle: applyStyle,
  };
})();
