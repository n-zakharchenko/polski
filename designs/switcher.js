/*
 * Переключатель вариантов дизайна — маленький 🎨 внизу слева. Только localhost (грузит core/settings.js).
 * Выбор → перезагрузка страницы с ?design=<id> (запоминается для всех страниц).
 */
(function () {
  'use strict';
  var list = window.POLSKI_DESIGNS || [];
  if (!list.length) return;
  var current = document.documentElement.getAttribute('data-design') || 'none';

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
      if (d.id === current) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      var u = new URL(location.href);
      u.searchParams.set('design', sel.value);
      location.href = u.toString();
    });
    var cmp = document.createElement('a');
    cmp.href = 'designs/compare.html';
    cmp.textContent = '⧉';
    cmp.title = 'Сравнить все варианты';
    cmp.setAttribute('style', 'color:#fff;text-decoration:none;padding:0 4px');
    box.appendChild(document.createTextNode('🎨'));
    box.appendChild(sel);
    box.appendChild(cmp);
    if (current !== 'none') {
      // живой редактор цветов варианта (designs/colors.js); правки применяются сразу при загрузке
      var tune = document.createElement('button');
      tune.textContent = '🎛';
      tune.title = 'Цвета варианта — менять вживую';
      tune.setAttribute('style', 'font:inherit;background:none;border:none;color:#fff;cursor:pointer;padding:0 2px');
      tune.onclick = function () { if (window.PolskiColors) window.PolskiColors.toggle(); };
      box.appendChild(tune);
    }
    document.body.appendChild(box);
  }

  if (current !== 'none') {
    var s = document.createElement('script');
    s.src = 'designs/colors.js?t=' + Date.now();
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
