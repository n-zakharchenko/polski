/*
 * Блок «Twoje statystyki» на главной — ТОЛЬКО для вошедших (без входа секция скрыта, Firebase не грузится).
 *   Polski.stats.mount(section)   — следит за входом/выходом и рисует блок
 *   Polski.stats.render(section, data) — нарисовать по данным (data — как из Polski.progress.load())
 * Данные — users/{uid} (core/progress.js). Пробег в километрах, топливо, города и воеводства считаются
 * из маршрута (journey/route.js, journey/cities.js) и баланса (core/balance.js), отдельно не хранятся.
 */
(function () {
  'use strict';

  var DAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  var WEAK_PCT = 80;  // «Do poprawy»: средний результат последних попыток ниже — тест в списке
  var WEAK_MAX = 3;   // не больше строк

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c != null) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function fmt(n) { return Math.round(n).toLocaleString('pl-PL'); }

  // польское множественное: 1 test, 2–4 testy (кроме 12–14), 5+ testów
  function plural(n, one, few, many) {
    if (n === 1) return one;
    var d = n % 10, dd = n % 100;
    return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? few : many;
  }
  function tests(n) { return n + ' ' + plural(n, 'test', 'testy', 'testów'); }
  function errors(n) { return n + ' ' + plural(n, 'błąd', 'błędy', 'błędów'); }

  function duration(sec) {
    var min = Math.round(sec / 60);
    if (sec > 0 && min < 1) return '< 1 min';
    if (min < 60) return min + ' min';
    return Math.floor(min / 60) + ' h ' + (min % 60) + ' min';
  }

  /** расход на отрезке, л/100 км (коэффициенты — Polski.balance.config.fuel) */
  function fuelRate(s) {
    var f = Polski.balance.config.fuel;
    var lat = (s.from.lat + s.to.lat) / 2;
    var hills = Math.max(0, Math.min(1, (f.hillsLat - lat) / f.hillsSpan));
    var noise = Math.sin((s.index + 1) * 12.9898) * 43758.5453;
    noise = noise - Math.floor(noise) - 0.5; // −0,5…0,5, у каждого отрезка свой и постоянный
    var rate = f.base + f.hills * hills
      + (s.from.major || s.to.major ? f.city : 0)
      + (s.tier === 1 ? f.short : s.tier === 3 ? f.long : 0)
      + noise * 2 * f.jitter;
    return Math.max(f.min, Math.min(f.max, rate)); // правдоподобно для малюха, что бы ни накрутили выше
  }

  /** что видно из маршрута при пробеге dist: километры, топливо, города и воеводства */
  function route(dist) {
    var J = Polski.journey, segs = J.segments(), cities = Polski.route.cities;
    var km = 0, totalKm = 0, litres = 0;
    segs.forEach(function (s) {
      totalKm += s.km;
      var part = dist >= s.start + s.cost ? 1 : dist > s.start ? (dist - s.start) / s.cost : 0;
      if (!part) return;
      km += s.km * part;
      litres += s.km * part * fuelRate(s) / 100;
    });
    var info = Polski.cityInfo || {};
    var allWoj = {}, wojSeen = {};
    cities.forEach(function (c, k) {
      var w = info[c.name] && info[c.name].woj;
      if (!w) return;
      allWoj[w] = true;
      var reached = k === 0 || dist >= segs[k - 1].start + segs[k - 1].cost;
      if (reached) wojSeen[w] = true;
    });
    return {
      km: km, totalKm: totalKm, litres: litres, loc: J.locate(dist),
      nowRate: fuelRate(J.locate(dist).seg), // расход на отрезке, по которому едем сейчас (меняется от города к городу)
      woj: Object.keys(wojSeen).length, wojTotal: Object.keys(allWoj).length,
    };
  }

  function tile(label, value, sub) {
    return h('div', { class: 'stat' }, [
      h('div', { class: 'stat-label', text: label }),
      h('div', { class: 'stat-value', text: value }),
      sub ? h('div', { class: 'stat-sub', text: sub }) : null,
    ]);
  }

  function week(data) {
    var P = Polski.progress, now = new Date();
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    var today = P.dayKey(now), sum = 0;
    var days = DAYS.map(function (name, i) {
      var key = P.dayKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
      var n = data.week[key] || 0;
      sum += n;
      return h('div', { class: 'week-day' + (key === today ? ' today' : '') }, [
        h('span', { class: 'week-dot' + (n ? ' on' : ''), text: n ? String(n) : '' }),
        h('span', { class: 'week-name', text: name }),
      ]);
    });
    return [
      h('div', { class: 'stats-sub', text: 'Ten tydzień · ' + tests(sum) }),
      h('div', { class: 'stats-week' }, days),
    ];
  }

  /** ссылка «Powtórz»: старые id режимов Imiesłowy (imieslowy-mix-ab …) → новые (imieslowy-mix); теста нет — без кнопки */
  function testHref(id) {
    var real = id.replace(/^(imieslowy-(?:cz|bi|mix))-(?:a|b|ab)$/, '$1');
    if (Polski.findPath && Polski.manifest && Polski.manifest.length && !Polski.findPath(real)) return null;
    return 'test.html?id=' + encodeURIComponent(real);
  }

  function weak(data) {
    var rows = Object.keys(data.byTest).map(function (id) {
      var e = data.byTest[id] || {}, last = e.last || [];
      if (!last.length) return null;
      var avg = last.reduce(function (a, b) { return a + b; }, 0) / last.length;
      return { id: id, e: e, last: last, avg: avg };
    }).filter(function (r) { return r && r.avg < WEAK_PCT; })
      .sort(function (a, b) { return a.avg - b.avg || (b.e.err || 0) - (a.e.err || 0); })
      .slice(0, WEAK_MAX);
    var head = h('div', { class: 'stats-sub' }, ['Do poprawy', h('span', { class: 'stats-sub-note', text: ' · ostatnie wyniki' })]);
    if (!rows.length) {
      // блок виден всегда: пока данных нет — что тут будет; всё хорошо — похвала
      return [head, h('p', { class: 'stats-empty', text: Object.keys(data.byTest).length
        ? 'Nic do poprawy — w ostatnich podejściach wszystkie testy idą świetnie 👏'
        : 'Tu pojawią się testy, w których mylisz się najczęściej — po pierwszych podejściach.' })];
    }
    return [
      head,
      h('div', { class: 'stats-weak' }, rows.map(function (r) {
        return h('div', { class: 'weak-row' }, [
          h('div', { class: 'weak-text' }, [
            h('div', { class: 'weak-title', text: r.e.t || r.id }),
            h('div', { class: 'weak-err', text: errors(r.e.err || 0) + ' łącznie' }),
          ]),
          h('div', { class: 'weak-results', 'aria-label': 'Ostatnie wyniki' }, r.last.map(function (p) {
            return h('span', { class: 'res ' + (p < 60 ? 'low' : p < 85 ? 'mid' : 'good'), title: p + '%', text: String(p) });
          })),
          testHref(r.id) ? h('a', { class: 'btn btn-sm btn-secondary', href: testHref(r.id), text: 'Powtórz' }) : null,
        ]);
      })),
    ];
  }

  /* ---------- «Dziś / Cały czas» ---------- */

  var RANGE_KEY = 'polski.stats.range'; // 'today' | 'all' (по умолчанию — за всё время)
  function readRange() {
    try { return window.localStorage.getItem(RANGE_KEY) === 'today' ? 'today' : 'all'; } catch (e) { return 'all'; }
  }
  function saveRange(v) {
    try { window.localStorage.setItem(RANGE_KEY, v); } catch (e) { /* только до перезагрузки */ }
  }

  /** итоги за сегодня: data.today (core/progress.js); тестов сегодня не было — нули; known — есть ли подробности */
  function todayOf(data) {
    var key = Polski.progress.dayKey(new Date());
    if (data.today && data.today.d === key) return { t: data.today, known: true };
    // тесты сегодня были, но до появления итогов за день — знаем только их число (week)
    var n = data.week[key] || 0;
    return { t: { t: n, p: 0, a: 0, c: 0, s: 0, pf: 0, d0: data.dist }, known: n === 0 };
  }

  function tilesAll(data, r) {
    var avgPerTest = data.tests ? data.points / data.tests : 0;
    var need = r.loc.done ? 0 : Math.max(1, Math.ceil(r.loc.left / (avgPerTest || 1)));
    var timed = Object.keys(data.byTest).reduce(function (s, id) { return s + ((data.byTest[id] || {}).n || 0); }, 0);
    var streak = Polski.progress.dayStreakNow(data);
    return [
      tile('Punkty', fmt(data.points),
        r.loc.done ? 'Podróż ukończona 🎉'
          : avgPerTest ? r.loc.seg.to.name + ' za ~' + tests(need)
          : 'następny przystanek: ' + r.loc.seg.to.name),
      tile('Testy', fmt(data.tests), 'bezbłędne: ' + fmt(data.perfect)),
      tile('Celność', data.answered ? Math.round((data.correct / data.answered) * 100) + '%' : '—',
        data.answered ? fmt(data.correct) + ' z ' + fmt(data.answered) : 'liczymy od następnego testu'),
      tile('Seria dni', String(streak), 'rekord: ' + Math.max(streak, data.bestDayStreak)),
      tile('Przejechane', fmt(r.km) + ' km', 'z ' + fmt(r.totalKm) + ' km trasy'),
      // с точкой, как на приборке: 62.4 l, 7.0 l/100 km
      tile('Paliwo', r.litres.toFixed(1) + ' l', 'spalanie ' + r.nowRate.toFixed(1) + ' l/100 km'),
      tile('Czas nauki', data.seconds ? duration(data.seconds) : '—',
        timed ? 'średnio ' + duration(data.seconds / timed) + ' na test' : 'liczymy od następnego testu'),
      tile('Województwa', r.woj + ' / ' + r.wojTotal, 'miasta: ' + r.loc.reached + ' / ' + r.loc.cities),
    ];
  }

  function tilesToday(data, r) {
    var td = todayOf(data), t = td.t;
    var r0 = route(t.d0); // где малюх был в начале дня
    var streak = Polski.progress.dayStreakNow(data);
    var later = 'liczymy od następnego testu';
    var newCities = Math.max(0, r.loc.reached - r0.loc.reached);
    return [
      tile('Punkty', td.known ? fmt(t.p) : '—', 'łącznie: ' + fmt(data.points)),
      tile('Testy', fmt(t.t), td.known ? 'bezbłędne: ' + fmt(t.pf) : later),
      tile('Celność', t.a ? Math.round((t.c / t.a) * 100) + '%' : '—',
        t.a ? fmt(t.c) + ' z ' + fmt(t.a) : td.known ? 'dziś jeszcze bez odpowiedzi' : later),
      tile('Seria dni', String(streak), 'rekord: ' + Math.max(streak, data.bestDayStreak)),
      tile('Przejechane', td.known ? fmt(r.km - r0.km) + ' km' : '—', 'łącznie: ' + fmt(r.km) + ' km'),
      tile('Paliwo', td.known ? (r.litres - r0.litres).toFixed(1) + ' l' : '—', 'spalanie ' + r.nowRate.toFixed(1) + ' l/100 km'),
      tile('Czas nauki', t.s ? duration(t.s) : '—',
        t.s && t.t ? 'średnio ' + duration(t.s / t.t) + ' na test' : td.known ? 'dziś jeszcze bez testów' : later),
      tile('Nowe miasta', td.known ? String(newCities) : '—', 'województwa: ' + r.woj + ' / ' + r.wojTotal),
    ];
  }

  function rangeSwitch(section, data, range) {
    return h('div', { class: 'seg seg-sm stats-range', role: 'group', 'aria-label': 'Zakres statystyk' },
      [['today', 'Dziś'], ['all', 'Cały czas']].map(function (o) {
        var b = h('button', {
          class: 'seg-btn' + (o[0] === range ? ' active' : ''), type: 'button',
          'aria-pressed': o[0] === range ? 'true' : 'false', text: o[1],
        });
        b.addEventListener('click', function () { saveRange(o[0]); render(section, data); });
        return b;
      }));
  }

  function render(section, data) {
    var r = route(data.dist);
    var range = readRange();
    section.replaceChildren.apply(section, [
      h('div', { class: 'stats-head' }, [
        h('h2', { class: 'stats-title', text: 'Twoje statystyki' }),
        rangeSwitch(section, data, range),
      ]),
      h('div', { class: 'stats-grid' }, range === 'today' ? tilesToday(data, r) : tilesAll(data, r)),
    ].concat(week(data), weak(data)));
    section.hidden = false;
  }

  function mount(section) {
    var acc = window.PolskiAccount;
    if (!acc || !acc.supported || !Polski.progress || !Polski.journey) { section.hidden = true; return; }
    var shownFor = null;

    // в этом браузере уже входили — рисуем по снимку сразу (core/progress.js), свежие данные заменят его
    var snap = Polski.progress.peek ? Polski.progress.peek() : null;
    if (snap) render(section, snap.data);

    function show(u) {
      shownFor = u.uid;
      Polski.progress.load().then(function (data) {
        if (shownFor !== u.uid || !data) return;
        render(section, data);
      }, function () {
        if (!snap || snap.uid !== u.uid) section.hidden = true; // ошибку чтения покажет карта выше; снимок оставляем
      });
    }
    function hide() { shownFor = null; section.hidden = true; section.replaceChildren(); }

    acc.ready().then(function (u) {
      if (u) show(u); else hide();
      acc.onChange(function (user) {
        if (user && user.uid !== shownFor) show(user);
        else if (!user) hide();
      });
    });
  }

  window.Polski = window.Polski || {};
  Polski.stats = { mount: mount, render: render };

  function init() {
    var section = document.getElementById('stats');
    if (section) mount(section); // на страницах разделов секцию убирает index.html
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
