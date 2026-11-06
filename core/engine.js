/*
 * Polski — ядро: реестр тестов, рандом, проверка ответов, загрузка бандлов.
 * Не трогает DOM при загрузке, поэтому годится и для страницы, и для проверки в Node.
 * Работает с file:// (без fetch и ES-модулей) — бандлы подключаются обычными <script>.
 */
(function (root) {
  'use strict';

  var Polski = (root.Polski = root.Polski || {});
  Polski.tests = Polski.tests || {};   // id -> описание теста (из бандла)
  Polski.data = Polski.data || {};     // общие данные бандлов (базы слов и т.п.)
  Polski.manifest = Polski.manifest || [];

  /* ---------- Реестр ---------- */

  Polski.register = function (def) {
    if (!def || !def.id) throw new Error('Polski.register: нужен id');
    // soon: true — заглушка: карточка видна, но тест ещё не готов
    if (!def.soon && typeof def.generate !== 'function') {
      throw new Error('Polski.register(' + def.id + '): нужна функция generate(rng)');
    }
    Polski.tests[def.id] = Object.assign(
      { title: def.id, desc: '', icon: '?', rounds: 10 },
      def
    );
  };

  /* ---------- Рандом (mulberry32, с сидом — можно воспроизвести) ---------- */

  Polski.createRng = function (seed) {
    if (seed === undefined || seed === null) {
      seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
    }
    var a = seed >>> 0;

    function float() {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    return {
      seed: seed,
      float: float,
      /** целое от min до max включительно */
      int: function (min, max) { return min + Math.floor(float() * (max - min + 1)); },
      /** случайный элемент массива */
      pick: function (arr) { return arr[Math.floor(float() * arr.length)]; },
      /** перемешанная копия массива */
      shuffle: function (arr) {
        var r = arr.slice();
        for (var i = r.length - 1; i > 0; i--) {
          var j = Math.floor(float() * (i + 1));
          var tmp = r[i]; r[i] = r[j]; r[j] = tmp;
        }
        return r;
      },
      /** n разных случайных элементов */
      sample: function (arr, n) { return this.shuffle(arr).slice(0, n); },
      /** true с вероятностью p */
      chance: function (p) { return float() < p; },
    };
  };

  /**
   * Перемешанная последовательность меток длины n: метки встречаются примерно поровну,
   * одна метка не идёт подряд больше opts.maxRun раз (по умолчанию 3),
   * и последовательность не чередуется строго (A B A B …).
   */
  Polski.mixedSequence = function (rng, labels, n, opts) {
    var maxRun = (opts && opts.maxRun) || 3;
    var base = Math.floor(n / labels.length);
    var extra = rng.sample(labels, n - base * labels.length);
    var bag = [];
    labels.forEach(function (l) {
      var count = base + (extra.indexOf(l) === -1 ? 0 : 1);
      for (var i = 0; i < count; i++) bag.push(l);
    });

    function good(seq) {
      var run = 1, longest = 1;
      for (var i = 1; i < seq.length; i++) {
        run = seq[i] === seq[i - 1] ? run + 1 : 1;
        if (run > maxRun) return false;
        if (run > longest) longest = run;
      }
      return seq.length < 4 || longest >= 2; // хотя бы один повтор — не строгое чередование
    }

    var seq = rng.shuffle(bag);
    for (var attempt = 0; attempt < 500 && !good(seq); attempt++) seq = rng.shuffle(bag);
    return seq;
  };

  /* ---------- Сравнение ответов ---------- */

  var DIACRITICS = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };

  Polski.stripDiacritics = function (s) {
    return String(s).replace(/[ąćęłńóśźż]/g, function (ch) { return DIACRITICS[ch]; });
  };

  /** нижний регистр, без лишних пробелов; { diacritics: false } — ещё и без ą/ę/ł… */
  Polski.normalize = function (s, opts) {
    var r = String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');
    if (opts && opts.diacritics === false) r = Polski.stripDiacritics(r);
    return r;
  };

  /**
   * Проверка ответа. Возвращает { ok: boolean, hint?: string }.
   * Если в бандле есть check(task, answer) — используется он (может вернуть boolean или объект).
   * Иначе ответ сравнивается с task.answer (строка или массив допустимых вариантов).
   * Ответ без польских букв засчитывается как неверный, но с подсказкой.
   */
  Polski.checkAnswer = function (test, task, answer) {
    if (typeof test.check === 'function') {
      var r = test.check(task, answer);
      return typeof r === 'boolean' ? { ok: r } : r;
    }
    // 'slots': answer = { имяРамки: выбранноеСлово }; результат по каждой рамке в res.slots
    if (task.type === 'slots') {
      var per = {};
      var allOk = true;
      Object.keys(task.slots).forEach(function (name) {
        per[name] = Polski.normalize(answer && answer[name]) === Polski.normalize(task.slots[name].answer);
        allOk = allOk && per[name];
      });
      return { ok: allOk, slots: per };
    }
    var accepted = [].concat(task.answer);
    var given = Polski.normalize(answer);
    for (var i = 0; i < accepted.length; i++) {
      if (Polski.normalize(accepted[i]) === given) return { ok: true };
    }
    var givenPlain = Polski.normalize(answer, { diacritics: false });
    for (var k = 0; k < accepted.length; k++) {
      if (Polski.normalize(accepted[k], { diacritics: false }) === givenPlain) {
        return { ok: false, hint: 'Prawie! Uważaj na polskie znaki.' };
      }
    }
    return { ok: false };
  };

  /* ---------- Загрузка бандлов (только в браузере) ---------- */

  /**
   * Защита от кэша: к нашим файлам добавляем метку версии сайта (window.POLSKI_V — в <head> каждой страницы,
   * её меняет tools/bump-version.js перед публикацией). Новая версия — новые адреса, старый кэш не смешивается.
   */
  Polski.withVersion = function (url) {
    var v = root.POLSKI_V;
    return v ? url + (url.indexOf('?') === -1 ? '?' : '&') + 'v=' + v : url;
  };

  /**
   * Канистра у очков — встроенный SVG (вектор в полном разрешении на любом экране; CSS-маска на телефонах
   * мылилась). Цвет — currentColor = --fuel стиля (.ico-fuel в style.css). Контур тот же, что в icons/canister.svg.
   */
  var FUEL_PATH = 'M8.9 1.8H17a3.2 3.2 0 0 1 3.2 3.2v15.1a2 2 0 0 1-2 2H5.9a2 2 0 0 1-2-2V7.7c0-.6.2-1.1.6-1.5L8 2.3c.3-.3.6-.5.9-.5Z' +
    'M12.35 3.5H15.65A1.15 1.15 0 0 1 15.65 5.8H12.35A1.15 1.15 0 0 1 12.35 3.5Z' +
    'M9.05 12.95L6.84 10.74A0.78 0.78 0 0 1 7.94 9.64L10.15 11.85L13.95 11.85L16.16 9.64A0.78 0.78 0 0 1 17.26 10.74' +
    'L15.05 12.95L15.05 16.75L17.26 18.96A0.78 0.78 0 0 1 16.16 20.06L13.95 17.85L10.15 17.85L7.94 20.06' +
    'A0.78 0.78 0 0 1 6.84 18.96L9.05 16.75Z' +
    'M10.6 13.4H13.5V16.3H10.6Z' +
    'M3.27 5.67L6.67 2.27A0.95 0.95 0 0 0 5.33 0.93L1.93 4.33A0.95 0.95 0 0 0 3.27 5.67Z';
  Polski.fuelIcon = function () {
    var NS = 'http://www.w3.org/2000/svg';
    var span = document.createElement('span');
    span.className = 'ico-fuel';
    span.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('d', FUEL_PATH);
    svg.appendChild(path);
    span.appendChild(svg);
    return span;
  };

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = Polski.withVersion(src);
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Nie udało się wczytać: ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* ---------- Манифест: дерево разделов и тестов ---------- */

  /** раздел — запись с items; тест — запись с files */
  Polski.isGroup = function (entry) { return Array.isArray(entry.items); };

  /** Путь от корня до записи с данным id: [раздел, …, запись] или null. */
  Polski.findPath = function (id, list, path) {
    list = list || Polski.manifest;
    path = path || [];
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.id === id) return path.concat(e);
      if (Polski.isGroup(e)) {
        var r = Polski.findPath(id, e.items, path.concat(e));
        if (r) return r;
      }
    }
    return null;
  };

  /** Загрузить файлы тестов из переданных записей (разделы пропускаются). base — путь до корня сайта. */
  Polski.loadBundles = function (base, entries) {
    var srcs = [];
    entries.forEach(function (e) {
      if (Polski.isGroup(e)) return;
      (e.files || []).forEach(function (f) {
        var src = (base || '') + 'tests/' + f;
        if (srcs.indexOf(src) === -1) srcs.push(src);
      });
    });
    // по очереди: данные и бандлы, от которых зависит тест, — раньше него
    return srcs.reduce(function (p, src) {
      return p.then(function () { return loadScript(src); });
    }, Promise.resolve());
  };
})(typeof window !== 'undefined' ? window : globalThis);
