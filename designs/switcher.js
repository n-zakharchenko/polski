/*
 * Панель отладки стилей — внизу слева. ТОЛЬКО localhost (грузит core/settings.js).
 *   🎨 список — стиль, как в «Ustawienia → Styl»: встроенные (Pastelowy / Prosty / Gazeta) переключаются
 *              на лету и запоминаются; пробные варианты из designs/list.js — перезагрузкой с ?design=<id>
 *   ⧉ — страница сравнения designs/compare.html
 *   🎛 — живой редактор цветов текущего стиля (designs/colors.js), для любого стиля
 * Панель всегда следует за стилем из настроек — вводить ?design не нужно.
 */
(function () {
  'use strict';
  var list = window.POLSKI_DESIGNS || [];
  if (!list.length) return;
  var root = document.documentElement;

  function current() { return root.getAttribute('data-design') || 'none'; }
  function builtIn(id) {
    var S = window.PolskiSettings && window.PolskiSettings.styles;
    return !!S && S.some(function (s) { return s.id === id; });
  }

  function build() {
    var box = document.createElement('div');
    box.setAttribute('style',
      'position:fixed;left:10px;bottom:10px;z-index:9998;display:flex;gap:6px;align-items:center;' +
      'padding:4px 6px;border-radius:999px;background:rgba(17,24,39,.85);color:#fff;' +
      'font:12px system-ui;box-shadow:0 4px 14px rgba(0,0,0,.25)');
    var sel = document.createElement('select');
    sel.setAttribute('style', 'font:inherit;color:#fff;background:transparent;border:none;max-width:200px');
    list.forEach(function (d) {
      var o = document.createElement('option');
      o.value = d.id;
      o.textContent = d.title;
      o.style.color = '#111';
      sel.appendChild(o);
    });
    sel.value = current();
    sel.addEventListener('change', function () {
      if (builtIn(sel.value)) {
        window.PolskiSettings.setStyle(sel.value); // как в настройках: сразу и запомнить
      } else {
        var u = new URL(location.href);            // пробный вариант — его файлы подгрузит settings.js
        u.searchParams.set('design', sel.value);
        location.href = u.toString();
      }
    });
    // стиль сменили в «Ustawienia → Styl» — список следом
    document.addEventListener('polski:style', function (e) { sel.value = e.detail || 'none'; });

    var cmp = document.createElement('a');
    cmp.href = 'designs/compare.html';
    cmp.textContent = '⧉';
    cmp.title = 'Сравнить все варианты';
    cmp.setAttribute('style', 'color:#fff;text-decoration:none;padding:0 4px');

    var tune = document.createElement('button');
    tune.textContent = '🎛';
    tune.title = 'Цвета текущего стиля — менять вживую';
    tune.setAttribute('style', 'font:inherit;background:none;border:none;color:#fff;cursor:pointer;padding:0 2px');
    tune.onclick = function () { if (window.PolskiColors) window.PolskiColors.toggle(); };

    box.appendChild(document.createTextNode('🎨'));
    box.appendChild(sel);
    box.appendChild(cmp);
    box.appendChild(tune);
    document.body.appendChild(box);
  }

  // редактор цветов — всегда: правки применяются сразу при загрузке
  var s = document.createElement('script');
  s.src = 'designs/colors.js?t=' + Date.now();
  document.head.appendChild(s);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
