/*
 * Podróż — малюх едет по маршруту Polski.route; набранные очки = пробег.
 *
 *   Polski.journey.segments()      — отрезки: { from, to, km, tier, cost, start }, .total — весь круг в очках
 *   Polski.journey.locate(dist)    — где малюх: { seg, t (0..1 на отрезке), left, reached, done }
 *   Polski.journey.advance(dist, earned) — пробег после теста (не дальше следующего города)
 *   Polski.journey.showCity(name, uid, { finish }) — поп-ап о городе, один раз на город
 *
 * Карта рисуется на главной в <section id="journey">:
 *   без входа — карта приглушена, поверх «Zacznij podróż» → вход через Google;
 *   после входа — очки из Firestore (core/progress.js), малюх доезжает с последнего увиденного места.
 * Стоимость отрезков и тип по расстоянию — в core/balance.js.
 */
(function () {
  'use strict';

  var segs = null;

  function haversineKm(a, b) {
    var R = 6371, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  // отрезки маршрута; seg.seenBefore — сколько разных городов пройдено до начала отрезка (город-повтор не считается)
  function segments() {
    if (segs) return segs;
    var c = Polski.route.cities;
    var count = Polski.route.loop ? c.length : c.length - 1;
    var start = 0;
    var seen = {};
    var unique = 0;
    segs = [];
    for (var i = 0; i < count; i++) {
      var a = c[i], b = c[(i + 1) % c.length];
      if (!seen[a.name]) { seen[a.name] = true; unique += 1; }
      var km = Math.round(haversineKm(a, b));
      var tier = a.tier || Polski.balance.tierOf(km);
      var cost = Polski.balance.segmentCost(tier);
      segs.push({ index: i, from: a, to: b, km: km, tier: tier, cost: cost, start: start, seenBefore: unique });
      start += cost;
    }
    segs.total = start;
    segs.cities = unique + (seen[c[count % c.length].name] ? 0 : 1);
    return segs;
  }

  function locate(points) {
    var s = segments();
    points = Math.max(0, points || 0);
    if (points >= s.total) {
      return { done: true, seg: s[s.length - 1], t: 1, left: 0, reached: s.cities, cities: s.cities, total: s.total };
    }
    for (var i = 0; i < s.length; i++) {
      var seg = s[i];
      if (points < seg.start + seg.cost) {
        return {
          done: false, seg: seg, t: (points - seg.start) / seg.cost,
          left: seg.start + seg.cost - points,
          reached: seg.seenBefore, cities: s.cities, total: s.total,
        };
      }
    }
  }

  /**
   * Пробег после теста: dist + earned, но не дальше citiesPerTest городов от текущего места
   * (малюх посреди отрезка — «следующий город» это конец текущего отрезка).
   */
  function advance(dist, earned) {
    var s = segments();
    dist = Math.max(0, dist || 0);
    var cap = dist;
    var n = (Polski.balance.config.citiesPerTest || 1);
    for (var k = 0; k < n && cap < s.total; k++) {
      var loc = locate(cap);
      cap = loc.seg.start + loc.seg.cost;
    }
    return Math.min(dist + Math.max(0, earned || 0), Math.max(cap, dist));
  }

  function fmt(n) { return Math.round(n).toLocaleString('pl-PL'); }

  /* ---------- карта ---------- */

  var NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, children) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] != null) node.setAttribute(k, attrs[k]); });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c != null) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  // равнопромежуточная проекция с поправкой на широту Польши
  var K = Math.cos(52 * Math.PI / 180), SCALE = 100, PAD = 34;
  /*
   * Малюх — лента из 32 изометрических кадров (journey/maluch.webp): рендер 3D-модели
   * «Polski Fiat (Fiat 126p)», autor Martin Trafas, CC BY 4.0 (автор указан в privacy.html).
   * angles — куда на экране смотрит нос в каждом кадре (0° — вправо, 90° — вниз);
   * anchor — точка, где машина касается земли, в пикселях кадра.
   */
  var MALUCH = {
    src: 'journey/maluch.webp', size: 200, cols: 8, rows: 4,
    angles: [0, 353.45, 346.55, 338.9, 330, 319.17, 305.66, 289.01, 270, 250.99, 234.34, 220.83, 210, 201.1,
      193.45, 186.55, 180, 173.45, 166.55, 158.9, 150, 139.17, 125.66, 109.01, 90, 70.99, 54.34, 40.83, 30,
      21.1, 13.45, 6.55],
    anchor: [100, 118.8],
    units: 90,    // ширина кадра на карте, единицы viewBox (машина ≈ 52): на телефоне ≈ 26 px
    turn: 0.8,    // с этой доли отрезка начинаем доворачивать на следующий
  };

  function angleDiff(a, b) { return ((b - a + 540) % 360) - 180; }

  function frameFor(deg) {
    var best = 0, bestD = 360;
    MALUCH.angles.forEach(function (a, k) {
      var d = Math.abs(angleDiff(a, deg));
      if (d < bestD) { bestD = d; best = k; }
    });
    return best;
  }

  function buildMap() {
    var outline = Polski.polandOutline;
    var minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    outline.forEach(function (p) {
      minLon = Math.min(minLon, p[0]); maxLon = Math.max(maxLon, p[0]);
      minLat = Math.min(minLat, p[1]); maxLat = Math.max(maxLat, p[1]);
    });
    function proj(lon, lat) {
      return [(lon - minLon) * K * SCALE + PAD, (maxLat - lat) * SCALE + PAD];
    }
    var W = (maxLon - minLon) * K * SCALE + PAD * 2;
    var H = (maxLat - minLat) * SCALE + PAD * 2;

    var land = outline.map(function (p, i) {
      var q = proj(p[0], p[1]);
      return (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1);
    }).join('') + 'Z';

    // картинки-слои (раскраска, рельеф) покрывают весь viewBox
    var full = { x: 0, y: 0, width: W.toFixed(1), height: H.toFixed(1), preserveAspectRatio: 'none' };

    // реки (journey/rivers.js): толщина по рангу Natural Earth — Одра и Висла толще притоков
    var rivers = (Polski.rivers || []).map(function (rv) {
      var rank = rv[0];
      var d = rv[1].map(function (p, i) {
        var q = proj(p[0], p[1]);
        return (i ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1);
      }).join('');
      return s('path', { class: 'map-river', d: d, 'stroke-width': rank <= 4 ? 2.4 : rank <= 5 ? 2 : rank <= 8 ? 1.5 : 1 });
    });

    var cities = Polski.route.cities;
    var P = cities.map(function (c) { return proj(c.lon, c.lat); });
    var sg = segments();
    // точки ломаной маршрута на карте (для круга последняя — снова первый город)
    var pts = sg.map(function (seg) { return P[seg.index]; });
    pts.push(P[(sg[sg.length - 1].index + 1) % cities.length]);
    // серый маршрут: отрезок, по которому едем второй раз (Radom — Warszawa), рисуем один раз,
    // иначе два пунктира с разным шагом сливаются в грязную линию
    var drawn = {};
    var routeD = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    sg.forEach(function (seg, i) {
      var key = [seg.from.name, seg.to.name].sort().join('|');
      var q = pts[i + 1];
      routeD += (drawn[key] ? 'M' : 'L') + q[0].toFixed(1) + ',' + q[1].toFixed(1);
      drawn[key] = true;
    });

    var done = s('path', { class: 'map-done', d: '' });
    // одна точка на город, даже если маршрут проходит через него дважды
    var places = [];
    var byName = {};
    cities.forEach(function (c, i) {
      if (byName[c.name]) { byName[c.name].idx.push(i); return; }
      var q = P[i];
      var pos = c.label || 'right';
      var dx = pos === 'left' ? -9 : pos === 'right' ? 9 : 0;
      var dy = pos === 'top' ? -9 : pos === 'bottom' ? 21 : 6;
      var anchor = pos === 'left' ? 'end' : pos === 'right' ? 'start' : 'middle';
      var label = s('text', { class: 'map-label', x: (q[0] + dx).toFixed(1), y: (q[1] + dy).toFixed(1), 'text-anchor': anchor });
      label.textContent = c.name;
      var place = {
        city: c, idx: [i], label: label,
        dot: s('circle', { class: 'map-city', cx: q[0].toFixed(1), cy: q[1].toFixed(1), r: c.major ? 4.5 : 3.2 }),
      };
      byName[c.name] = place;
      places.push(place);
    });
    var dots = places.map(function (p) { return p.dot; });
    var labels = places.map(function (p) { return p.label; });
    // окно в ленту кадров: viewBox сдвигаем на нужный кадр
    var frame = s('svg', { width: MALUCH.units, height: MALUCH.units, viewBox: '0 0 200 200', overflow: 'hidden' }, [
      s('image', { href: Polski.withVersion(MALUCH.src), width: MALUCH.size * MALUCH.cols, height: MALUCH.size * MALUCH.rows }),
    ]);
    var car = s('g', { class: 'map-car' }, [s('g', { class: 'car-body' }, [frame])]);
    var shownFrame = -1;

    function segAngle(i) {
      var a = pts[i], b = pts[i + 1];
      return Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
    }
    // направление малюха: по отрезку, а под конец плавно доворачиваем на следующий
    function heading(i, t) {
      var h = segAngle(i);
      if (t > MALUCH.turn && i + 1 < sg.length) {
        h += angleDiff(h, segAngle(i + 1)) * (t - MALUCH.turn) / (1 - MALUCH.turn);
      }
      return (h + 360) % 360;
    }

    var svg = s('svg', {
      class: 'journey-map', viewBox: '0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0),
      role: 'img', 'aria-label': 'Mapa podróży po Polsce',
    }, [
      s('defs', {}, [
        s('clipPath', { id: 'journey-poland' }, [s('path', { d: land })]),
        // сепия «как гравюра» для стиля «Gazeta»: SVG-фильтр, потому что CSS grayscale()/sepia()
        // Safari к элементам внутри SVG не применяет (CSS: filter: url(#journey-sepia))
        s('filter', { id: 'journey-sepia', 'color-interpolation-filters': 'sRGB' }, [
          s('feColorMatrix', {
            type: 'matrix',
            values: '0.2445 0.8225 0.0830 0 0.01  0.2296 0.7724 0.0780 0 0.01  0.2041 0.6866 0.0693 0 0.01  0 0 0 1 0',
          }),
        ]),
      ]),
      s('path', { class: 'map-land', d: land }), // запасной цвет суши, пока картинки грузятся
      // пастельная физическая карта: лес, вода, горы (journey/terrain-*.webp) — своя для каждой темы
      s('image', Object.assign({ class: 'map-terrain map-terrain-light', href: Polski.withVersion('journey/terrain-light.webp') }, full)),
      s('image', Object.assign({ class: 'map-terrain map-terrain-dark', href: Polski.withVersion('journey/terrain-dark.webp') }, full)),
      // рельеф: серая отмывка (128 — без изменений), накладывается режимом смешивания
      s('image', Object.assign({ class: 'map-relief', href: Polski.withVersion('journey/relief.webp') }, full)),
      s('g', { class: 'map-rivers', 'clip-path': 'url(#journey-poland)' }, rivers),
      s('path', { class: 'map-border', d: land }),
      s('path', { class: 'map-route', d: routeD }),
      done,
      s('g', {}, dots),
      s('g', {}, labels),
      car,
    ]);

    /** поставить малюха и закрасить маршрут для points очков */
    function set(points) {
      var loc = locate(points);
      var i = loc.seg.index;
      var a = pts[i], b = pts[i + 1];
      var x = a[0] + (b[0] - a[0]) * loc.t, y = a[1] + (b[1] - a[1]) * loc.t;
      var k = MALUCH.units / MALUCH.size;
      car.setAttribute('transform', 'translate(' + (x - MALUCH.anchor[0] * k).toFixed(1) + ',' + (y - MALUCH.anchor[1] * k).toFixed(1) + ')');
      var f = frameFor(heading(i, loc.t));
      if (f !== shownFrame) {
        shownFrame = f;
        frame.setAttribute('viewBox', (f % MALUCH.cols) * MALUCH.size + ' ' + Math.floor(f / MALUCH.cols) * MALUCH.size + ' ' + MALUCH.size + ' ' + MALUCH.size);
      }
      // пройденная часть — та же ломаная до малюха: пунктир с тем же шагом, штрихи совпадают с серыми
      var d = pts.slice(0, i + 1).concat([[x, y]]).map(function (q, k) {
        return (k ? 'L' : 'M') + q[0].toFixed(1) + ',' + q[1].toFixed(1);
      }).join('');
      done.setAttribute('d', d);
      // город k пройден, если до него доехали (первый — точка старта)
      function reachedAt(k) { return k === 0 || points >= sg[k - 1].start + sg[k - 1].cost; }
      // подписи: всегда — крупные города, из маленьких — только следующий
      var nextName = loc.done ? null : loc.seg.to.name;
      places.forEach(function (pl) {
        var isNext = pl.city.name === nextName;
        var show = pl.city.major || isNext;
        pl.dot.setAttribute('class', 'map-city' + (pl.idx.some(reachedAt) ? ' reached' : '') + (isNext ? ' next' : ''));
        pl.label.setAttribute('class', 'map-label' + (isNext ? ' next' : '') + (show ? '' : ' off'));
      });
      return loc;
    }

    return { svg: svg, set: set, car: car };
  }

  /* ---------- поп-ап «Nowe miasto» (тексты — journey/cities.js) ---------- */

  function shownKey(uid) { return 'polski.cities.' + (uid || 'anon'); }

  /**
   * Показать поп-ап о городе — один раз на город для этого аккаунта (помним в localStorage).
   * opts.finish — малюх вернулся на старт: «Meta!». Возвращает true, если поп-ап показан.
   */
  function showCity(name, uid, opts) {
    var info = Polski.cityInfo && Polski.cityInfo[name];
    if (!info) return false;
    var finish = !!(opts && opts.finish);
    var key = shownKey(uid);
    var id = finish ? name + '#meta' : name; // финиш в Варшаве — свой поп-ап, хоть Варшава и старт
    var shown = [];
    try { shown = JSON.parse(window.localStorage.getItem(key)) || []; } catch (e) { shown = []; }
    if (shown.indexOf(id) !== -1 && !(opts && opts.force)) return false; // force — для дебаг-панели
    if (shown.indexOf(id) === -1) shown.push(id);
    try { window.localStorage.setItem(key, JSON.stringify(shown)); } catch (e) { /* покажем, но не запомним */ }

    var dlg = h('dialog', { class: 'rule-dialog city-dialog', 'aria-label': name });
    function close() {
      if (typeof dlg.close === 'function' && dlg.open) dlg.close();
      dlg.remove();
    }
    dlg.appendChild(h('div', { class: 'rule-inner' }, [
      h('p', { class: 'city-kicker', text: finish ? '🎉 Meta! Cała Polska objechana' : '🏁 Nowe miasto!' }),
      h('h2', { class: 'city-name', text: name }),
      h('p', { class: 'city-woj', text: 'województwo ' + info.woj }),
      h('p', { class: 'city-text', text: info.text }),
      h('button', { class: 'btn btn-wide', type: 'button', text: finish ? 'Super!' : 'Jedziemy dalej!', onclick: close }),
    ]));
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); }); // клик по фону
    dlg.addEventListener('close', function () { dlg.remove(); });                // Esc
    document.body.appendChild(dlg);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    if (Polski.haptic) Polski.haptic('city'); // вибрация на телефоне (core/haptics.js)
    return true;
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mount(section) {
    var acc = window.PolskiAccount;
    if (!acc || !acc.supported || !Polski.polandOutline) { section.hidden = true; return; }

    var map = buildMap();
    var info = h('div', { class: 'journey-info' });
    var overlay = h('div', { class: 'journey-overlay' });
    section.replaceChildren(
      h('p', { class: 'journey-lead', text: 'Rozwiązuj testy i zdobywaj punkty, żeby objechać całą Polskę.' }),
      h('div', { class: 'journey-frame' }, [map.svg, overlay]),
      info
    );
    section.hidden = false;
    map.set(0);
    // пришли по «Zobacz mapę» с итога теста (index.html#journey): карта появилась только сейчас — докручиваем
    if (location.hash === '#journey') {
      setTimeout(function () { section.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' }); }, 50);
    }

    var mode = null; // 'locked' | 'user'
    var anim = 0;

    function seenKey(uid) { return 'polski.journey.seen.' + uid; }
    function readSeen(uid) {
      try { return Number(window.localStorage.getItem(seenKey(uid))) || 0; } catch (e) { return 0; }
    }
    // «последний водитель» в этом браузере: { uid, dist, points } — чтобы до восстановления входа
    // (Firebase грузится 1–2 с) малюх сразу стоял на своём месте, а не на старте
    var LAST_KEY = 'polski.journey.last';
    function readLast() {
      try { return JSON.parse(window.localStorage.getItem(LAST_KEY)) || null; } catch (e) { return null; }
    }
    function writeSeen(uid, p, points) {
      try {
        window.localStorage.setItem(seenKey(uid), String(p));
        window.localStorage.setItem(LAST_KEY, JSON.stringify({ uid: uid, dist: p, points: points }));
      } catch (e) { /* не страшно */ }
    }

    // в этом браузере уже входили — рисуем малюха там, где он стоял, не дожидаясь Firebase
    var last = null;
    try { if (window.localStorage.getItem('polski.account') === '1') last = readLast(); } catch (e) { last = null; }
    if (last && typeof last.dist === 'number') {
      section.classList.remove('locked');
      renderInfo(typeof last.points === 'number' ? last.points : null, map.set(last.dist));
    }

    // points — счёт игрока (null — ещё грузится), loc — где малюх по пробегу (dist)
    function renderInfo(points, loc) {
      info.replaceChildren(
        h('div', { class: 'journey-stats' }, [
          h('span', { class: 'journey-points' }, [Polski.fuelIcon(), ' ', h('strong', { text: points == null ? '…' : fmt(points) }), ' pkt']),
          h('span', { class: 'journey-cities' }, [Polski.pinIcon(), ' ' + loc.reached + ' / ' + loc.cities + ' miast']),
        ]),
        loc.done
          ? h('p', { class: 'journey-next', text: 'Podróż ukończona! 🎉 Cała Polska objechana.' })
          : h('p', { class: 'journey-next' }, [
            'Następny przystanek: ', h('strong', { text: loc.seg.to.name }),
            // «zostało …» — всегда своей строкой: пока малюх едет, число меняется, и перенос не прыгает
            h('br'), 'zostało ' + fmt(loc.left) + ' pkt',
          ])
      );
    }

    // малюх едет по пробегу from → to; points — счёт, который показываем рядом
    function drive(from, to, points, done) {
      cancelAnimationFrame(anim);
      if (reduceMotion || to <= from) { renderInfo(points, map.set(to)); if (done) done(); return; }
      var dur = Math.min(3500, 1200 + (to - from) / 2);
      var t0 = null;
      map.car.classList.add('driving');
      function frame(now) {
        if (t0 == null) t0 = now;
        var k = Math.min(1, (now - t0) / dur);
        var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        renderInfo(points, map.set(from + (to - from) * e));
        if (k < 1) anim = requestAnimationFrame(frame);
        else { map.car.classList.remove('driving'); if (done) done(); }
      }
      anim = requestAnimationFrame(frame);
    }

    function showLocked() {
      mode = 'locked';
      cancelAnimationFrame(anim);
      map.set(0);
      section.classList.add('locked');
      info.replaceChildren(h('p', { class: 'journey-alt', text: 'albo ćwicz bez logowania — bez punktów i podróży ↑' }));
      overlay.replaceChildren(h('div', { class: 'journey-cta' }, [
        h('p', { class: 'journey-cta-title', text: 'Objedź Polskę maluchem!' }),
        h('p', { class: 'journey-cta-text', text: 'Za poprawne odpowiedzi zdobywasz punkty, a punkty napędzają malucha.' }),
        h('button', {
          class: 'btn', type: 'button', text: 'Zacznij podróż',
          onclick: function () {
            var box = h('div', { class: 'journey-login' });
            overlay.firstChild.replaceChildren(box);
            acc.mountLogin(box, 'Zaloguj się, żeby zbierać punkty i ruszyć w trasę.');
          },
        }),
      ]));
    }

    function showUser(u) {
      mode = 'user';
      section.classList.remove('locked');
      overlay.replaceChildren();
      var seen = readSeen(u.uid); // пробег, на котором малюх стоял при прошлом визите
      // очки с прошлого раза (тот же водитель) — вместо «…», пока грузятся свежие
      var shown = last && last.uid === u.uid && typeof last.points === 'number' ? last.points : null;
      renderInfo(shown, map.set(seen));
      Polski.progress.load().then(function (c) {
        if (mode !== 'user' || !c) return;
        // нет dist (старая запись или старый progress.js из кэша) — пробег = очки
        var dist = c.dist != null ? c.dist : (c.points || 0);
        drive(Math.min(seen, dist), dist, c.points, function () { writeSeen(u.uid, dist, c.points); });
      }, function () {
        info.replaceChildren(h('p', { class: 'account-error', text: 'Nie udało się wczytać punktów. Odśwież stronę.' }));
      });
    }

    // крючок для локальной дебаг-панели (dev/debug.js грузится только на localhost с ?debug):
    // двигает малюха и переключает вид — только на экране, в базу ничего не пишет
    Polski.journey._debug = {
      set: function (dist) {
        mode = 'debug';
        cancelAnimationFrame(anim);
        map.car.classList.remove('driving');
        renderInfo(dist, map.set(dist));
      },
      drive: function (from, to, done) { mode = 'debug'; drive(from, to, to, done); },
      locked: function () { showLocked(); },
      unlocked: function () { mode = 'debug'; section.classList.remove('locked'); overlay.replaceChildren(); },
    };

    function forgetLast() {
      last = null;
      try { window.localStorage.removeItem(LAST_KEY); } catch (e) { /* ничего */ }
    }

    acc.ready().then(function (u) {
      if (u) showUser(u); else { showLocked(); forgetLast(); } // входа уже нет — «последнего водителя» не держим
      acc.onChange(function (user) {
        if (user && mode !== 'user') showUser(user);
        else if (!user && mode !== 'locked') showLocked();
        // вышел (или удалил аккаунт) — «последнего водителя» забываем, чтобы следующему не мелькнул чужой малюх
        if (!user) forgetLast();
      });
    });
  }

  window.Polski = window.Polski || {};
  Polski.journey = { segments: segments, locate: locate, advance: advance, showCity: showCity, fmt: fmt };

  function init() {
    var section = document.getElementById('journey');
    if (section) mount(section); // на страницах разделов секцию убирает index.html
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
