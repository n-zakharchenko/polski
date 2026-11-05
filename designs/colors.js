/*
 * Живой редактор цветов варианта дизайна (ТОЛЬКО localhost; грузит designs/switcher.js).
 *   PolskiColors.apply()  — применить сохранённые правки (вызывается сразу при загрузке)
 *   PolskiColors.toggle() — открыть/закрыть панель 🎛
 * Правки — инлайн-переменные на <html> (сильнее любых правил в CSS), хранятся в localStorage
 * отдельно для варианта и темы: polski.designColors.<вариант>.<light|dark>.
 * «Скопировать CSS» — готовый блок для файла варианта.
 * Цвета вариантов ответов и рамок (--y-*, --g-*, --b-*, --num) подбираются здесь; форму их не трогаем.
 */
(function () {
  'use strict';

  // [переменная, подпись]; строка вида [null, 'Заголовок'] — заголовок группы
  var GROUPS = [
    [null, 'Страница'],
    ['--bg', 'фон страницы'],
    ['--panel', 'блоки (панель, квадратики иконок)'],
    ['--card', 'карточки-контейнеры (тест, выбор)'],
    ['--card-border', 'рамки карточек'],
    ['--text', 'текст'],
    ['--muted', 'второстепенный текст'],
    ['--accent', 'акцент (терракота)'],
    ['--accent-ink', 'текст на акценте'],
    ['--accent-soft', 'светлый акцент (дорожка прогресса)'],
    ['--pc-1', 'карточка теста 1'],
    ['--pc-2', 'карточка теста 2'],
    ['--pc-3', 'карточка теста 3'],
    ['--pc-4', 'карточка теста 4'],
    ['--ok', 'верно'],
    ['--bad', 'ошибка'],
    ['--map-land', 'суша карты (пока грузится раскраска)'],
    [null, 'Задание'],
    ['--source-bg', 'блок «Zdanie» (исходное предложение)'],
    [null, 'Rzeczownik (жёлтые)'],
    ['--y-bg', 'фон варианта и рамки'],
    ['--y-border', 'обводка'],
    ['--y-text', 'текст'],
    [null, 'Czasownik (зелёные)'],
    ['--g-bg', 'фон варианта и рамки'],
    ['--g-border', 'обводка'],
    ['--g-text', 'текст'],
    [null, 'Liczebnik (синие)'],
    ['--b-bg', 'фон варианта и рамки'],
    ['--num', 'обводка и число словами'],
    ['--b-text', 'текст'],
    [null, 'Вердикты (кнопка 📌 — показать неподвижно)'],
    ['--verdict-ok', '«Dokładnie!»'],
    ['--verdict-bad', '«Prawie!»'],
    ['--verdict-fail', '«O kurde!»'],
  ];
  var TOKENS = GROUPS.filter(function (t) { return t[0]; });
  // переменные, которые должны повторять другую (в варианте 01 градиента нет: accent-2 = accent)
  var FOLLOW = { '--accent': ['--accent-2'] };

  var root = document.documentElement;
  var design = root.getAttribute('data-design');
  // стиль могут переключить на лету («Ustawienia → Styl») — правки должны быть от текущего
  function syncDesign() { design = root.getAttribute('data-design'); }

  function theme() {
    var t = root.getAttribute('data-theme');
    if (t === 'light' || t === 'dark') return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function key() { return 'polski.designColors.' + design + '.' + theme(); }
  function load() { try { return JSON.parse(localStorage.getItem(key())) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(key(), JSON.stringify(o)); } catch (e) { /* только до перезагрузки */ } }

  function setVar(name, value) {
    if (value) root.style.setProperty(name, value); else root.style.removeProperty(name);
    (FOLLOW[name] || []).forEach(function (n) {
      if (value) root.style.setProperty(n, value); else root.style.removeProperty(n);
    });
  }

  function apply() {
    syncDesign();
    TOKENS.forEach(function (t) { setVar(t[0], null); }); // снять правки прежнего стиля/темы
    if (!design) return;
    var o = load();
    Object.keys(o).forEach(function (n) { setVar(n, o[n]); });
  }

  // любой CSS-цвет → #rrggbb (для <input type=color>)
  var probe = document.createElement('canvas').getContext('2d');
  function toHex(c) {
    probe.fillStyle = '#000';
    probe.fillStyle = (c || '').trim() || '#000';
    var v = probe.fillStyle;
    if (v[0] === '#') return v;
    var m = v.match(/\d+(\.\d+)?/g) || [0, 0, 0];
    return '#' + m.slice(0, 3).map(function (x) { return ('0' + Math.round(+x).toString(16)).slice(-2); }).join('');
  }
  function current(name) { return toHex(getComputedStyle(root).getPropertyValue(name)); }

  var panel = null;

  function css() {
    var lines = TOKENS.map(function (t) { return '  ' + t[0] + ': ' + current(t[0]) + ';'; });
    var sel = theme() === 'dark'
      ? ':root[data-design="' + design + '"][data-theme="dark"]'
      : ':root[data-design="' + design + '"]';
    return '/* ' + design + ', тема: ' + theme() + ' */\n' + sel + ' {\n' + lines.join('\n') + '\n}';
  }

  function build() {
    panel = document.createElement('div');
    panel.setAttribute('style',
      'position:fixed;left:10px;bottom:52px;z-index:9999;width:min(300px,calc(100vw - 20px));max-height:70vh;overflow:auto;' +
      'padding:10px;border-radius:12px;background:#111827;color:#e5e7eb;font:12px system-ui;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.35)');
    var head = document.createElement('div');
    head.setAttribute('style', 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:700');
    head.innerHTML = '<span>🎛 Цвета · ' + design + ' · ' + (theme() === 'dark' ? 'тёмная' : 'светлая') + '</span>';
    var x = document.createElement('button');
    x.textContent = '×';
    x.setAttribute('style', 'background:none;border:none;color:#e5e7eb;font-size:16px;cursor:pointer');
    x.onclick = toggle;
    head.appendChild(x);
    panel.appendChild(head);

    var edits = load();
    GROUPS.forEach(function (t) {
      if (!t[0]) {
        var hd = document.createElement('div');
        hd.textContent = t[1];
        hd.setAttribute('style', 'margin:10px 0 2px;color:#fca5a5;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-size:10px');
        panel.appendChild(hd);
        return;
      }
      var row = document.createElement('label');
      row.setAttribute('style', 'display:grid;grid-template-columns:28px 64px 1fr;gap:6px;align-items:center;margin:3px 0');
      var pick = document.createElement('input');
      pick.type = 'color';
      pick.value = current(t[0]);
      pick.setAttribute('style', 'width:28px;height:22px;padding:0;border:none;background:none');
      var hex = document.createElement('input');
      hex.value = pick.value;
      hex.setAttribute('style', 'width:64px;font:11px ui-monospace,monospace;color:#e5e7eb;background:#1f2937;border:1px solid ' +
        (edits[t[0]] ? '#f87171' : '#4b5563') + ';border-radius:4px;padding:2px 3px');
      var name = document.createElement('span');
      name.textContent = t[1];
      name.title = t[0];
      function set(v) {
        var o = load();
        o[t[0]] = v;
        save(o);
        setVar(t[0], v);
        hex.style.borderColor = '#f87171'; // изменён относительно файла
      }
      pick.addEventListener('input', function () { hex.value = pick.value; set(pick.value); });
      hex.addEventListener('change', function () {
        if (/^#[0-9a-f]{6}$/i.test(hex.value.trim())) { pick.value = hex.value.trim(); set(pick.value); }
      });
      row.appendChild(pick);
      row.appendChild(hex);
      row.appendChild(name);
      panel.appendChild(row);
    });

    var out = document.createElement('textarea');
    out.readOnly = true;
    out.setAttribute('style', 'display:none;width:100%;height:120px;margin-top:8px;font:11px ui-monospace,monospace;' +
      'color:#e5e7eb;background:#0b1220;border:1px solid #374151;border-radius:6px');
    var btns = document.createElement('div');
    btns.setAttribute('style', 'display:flex;gap:6px;margin-top:8px');
    function btn(label, fn) {
      var b = document.createElement('button');
      b.textContent = label;
      b.setAttribute('style', 'flex:1;font:inherit;color:#e5e7eb;background:#1f2937;border:1px solid #4b5563;border-radius:6px;padding:5px;cursor:pointer');
      b.onclick = fn;
      btns.appendChild(b);
      return b;
    }
    btn('Скопировать CSS', function () {
      out.value = css();
      out.style.display = 'block';
      out.select();
      if (navigator.clipboard) navigator.clipboard.writeText(out.value).catch(function () {});
    });
    var pinBtn = btn(pinned ? '📌 Вердикты ✓' : '📌 Вердикты', function () {
      setPinned(!pinned);
      pinBtn.textContent = pinned ? '📌 Вердикты ✓' : '📌 Вердикты';
    });
    btn('Сбросить', function () {
      try { localStorage.removeItem(key()); } catch (e) { /* ничего */ }
      apply();
      panel.remove();
      panel = null;
      toggle(); // перерисовать с цветами из файла
    });
    panel.appendChild(btns);
    panel.appendChild(out);
    document.body.appendChild(panel);
  }

  function toggle() {
    if (panel) { panel.remove(); panel = null; } else build();
  }

  /*
   * 📌 Вердикты: плашки «Dokładnie! / Prawie! / O kurde!» обычно исчезают за 1,7 с.
   * Включено — вверху страницы три неподвижных образца на фоне варианта,
   * а настоящие плашки после ответа не исчезают (до следующего задания).
   */
  var pinned = false;
  var preview = null;
  var pinStyle = null;
  function setPinned(on) {
    pinned = on;
    if (on) {
      pinStyle = document.createElement('style');
      pinStyle.textContent = '.answer-area .verdict{animation:none!important;opacity:1!important;transform:translate(-50%,-50%)!important}';
      document.head.appendChild(pinStyle);
      preview = document.createElement('div');
      preview.setAttribute('style',
        'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9997;display:flex;flex-wrap:wrap;gap:8px;' +
        'justify-content:center;padding:10px;border-radius:16px;background:var(--panel, var(--card));' +
        'border:1px solid var(--card-border);max-width:calc(100vw - 16px)');
      [['ok', 'Dokładnie!'], ['bad', 'Prawie!'], ['fail', 'O kurde!']].forEach(function (v) {
        var s = document.createElement('div');
        s.className = 'verdict ' + v[0];
        s.textContent = v[1];
        // как настоящая плашка, только неподвижная и в ряд
        s.setAttribute('style', 'position:static;animation:none;opacity:1;transform:none;font-size:1.1rem;padding:8px 18px');
        preview.appendChild(s);
      });
      document.body.appendChild(preview);
    } else {
      if (pinStyle) pinStyle.remove();
      if (preview) preview.remove();
      pinStyle = preview = null;
    }
  }

  apply();
  // тема поменялась (шестерёнка «Motyw» или система) — правки другой темы
  new MutationObserver(function () {
    apply();
    if (panel) { panel.remove(); panel = null; } // панель показывала цвета другого стиля/темы
  }).observe(root, { attributes: true, attributeFilter: ['data-theme', 'data-design'] });
  if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);

  window.PolskiColors = { apply: apply, toggle: toggle, css: css };
})();
