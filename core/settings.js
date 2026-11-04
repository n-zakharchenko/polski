/*
 * Polski — настройки (общие для всех страниц).
 * Подключается в <head>, до отрисовки: сразу применяет тему, чтобы не мигала светлая.
 * После загрузки страницы добавляет шестерёнку в правый верхний угол и окно «Ustawienia».
 *
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
      '<div class="chooser-label">Motyw</div>' +
      '<div class="seg" role="group" aria-label="Motyw"></div>' +
      '</section></div>';

    var seg = dlg.querySelector('.seg');
    mountPoint = dlg.querySelector('.rule-inner');
    sections.forEach(mountSection);

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

    document.body.appendChild(btn);
    document.body.appendChild(dlg);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();

  window.PolskiSettings = { readTheme: readTheme, applyTheme: applyTheme, addSection: addSection };
})();
