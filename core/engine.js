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
