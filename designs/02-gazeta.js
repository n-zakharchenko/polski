/*
 * Стиль «Gazeta» — шапка на главной, как у старой газеты:
 *
 *   Wydanie poranne · Rok 2026                   ← выпуск по времени суток; текущий год
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *            Rajd Polskiej Gramatyki             ← h1, нарядным шрифтом
 *   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *   Nr 309 │ Warszawa, czwartek, 5 listopada 2026 │ Cena: 2 złote
 *
 * Номер выпуска — порядковый день года (каждый день новый), дата — сегодняшняя, цена — шуточная.
 * Только главная (index.html без ?g=); на тесте и экране выбора — обычный заголовок.
 * Шапка появляется и исчезает на лету, когда в настройках меняют «Styl» (событие polski:style).
 */
(function () {
  'use strict';

  var ID = '02-gazeta';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function isHome() {
    return /(^|\/)(index\.html)?$/.test(location.pathname) && !new URLSearchParams(location.search).get('g');
  }

  function build() {
    var h1 = document.getElementById('title');
    if (!h1 || !isHome() || document.querySelector('.gz-masthead')) return;

    var now = new Date();
    var hour = now.getHours();
    var edition = hour < 12 ? 'Wydanie poranne' : hour < 18 ? 'Wydanie popołudniowe' : 'Wydanie wieczorne';
    var dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    var date = now.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    var head = el('header', 'gz-masthead');
    head.appendChild(el('div', 'gz-top', edition + ' · Rok ' + now.getFullYear()));
    head.appendChild(el('div', 'gz-rule'));
    h1.parentNode.insertBefore(head, h1);
    head.appendChild(h1);
    head.appendChild(el('div', 'gz-rule gz-rule-flip'));
    var meta = el('div', 'gz-meta');
    meta.appendChild(el('span', 'gz-no', 'Nr ' + dayOfYear));
    meta.appendChild(el('span', 'gz-date', 'Warszawa, ' + date));
    meta.appendChild(el('span', 'gz-price', 'Cena: 2 złote'));
    head.appendChild(meta);
    head.appendChild(el('div', 'gz-rule gz-rule-thin'));
  }

  // другой стиль — вернуть заголовок на место и убрать шапку
  function teardown() {
    var head = document.querySelector('.gz-masthead');
    if (!head) return;
    var h1 = head.querySelector('h1');
    if (h1) head.parentNode.insertBefore(h1, head);
    head.remove();
  }

  function sync() {
    if (document.documentElement.getAttribute('data-design') === ID) build();
    else teardown();
  }

  document.addEventListener('polski:style', function () { if (document.body) sync(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();
})();
