/*
 * Imiesłowy przymiotnikowe — тест: Czynne / Bierne / Mix × Przekształć / Uzupełnij / Wszystko.
 *
 * Виды заданий (тип 'slots', одна оранжевая рамка «Imiesłów»):
 *   A «Przekształć» — сверху исходное предложение с подчёркнутым «który …»,
 *                     ниже то же предложение с рамкой на месте причастия;
 *   B «Uzupełnij»   — предложение с рамкой, в пустой рамке — инфинитив (upiec);
 *   C «Czynny czy bierny?» — только в Mix: два варианта, причастие и противоположная форма
 *                     того же рода/числа/падежа (zwiedzający / zwiedzani).
 * Варианты в A и B: ответ + 3 ловушки — настоящие формы того же причастия в другом роде/числе/падеже;
 * в Mix одна из ловушек иногда — противоположная форма.
 *
 * За проход (10 заданий): в Mix czynne и bierne поровну, не больше 2 подряд, и 3 задания C;
 * в «Wszystko» A и B поровну. Предложения и глаголы в проходе не повторяются.
 */
(function () {
  'use strict';

  var I = Polski.imieslowy;
  var POOL = {
    cz: Polski.data.imieslowyCzynne.map(function (l) { return I.parse(l, 'cz'); }),
    bi: Polski.data.imieslowyBierne.map(function (l) { return I.parse(l, 'bi'); }),
  };
  var C_PER_RUN = 3; // заданий «Czynny czy bierny?» за проход в Mix

  /** последовательность с заданным числом меток, одна метка не больше maxRun подряд */
  function sequence(rng, counts, maxRun) {
    var bag = [];
    Object.keys(counts).forEach(function (k) { for (var i = 0; i < counts[k]; i++) bag.push(k); });
    function good(seq) {
      for (var i = 0, run = 1; i < seq.length; i++) {
        run = i > 0 && seq[i] === seq[i - 1] ? run + 1 : 1;
        if (run > maxRun) return false;
      }
      return true;
    }
    var seq = rng.shuffle(bag);
    for (var t = 0; t < 500 && !good(seq); t++) seq = rng.shuffle(bag);
    return seq;
  }

  /** план прохода: вид причастия и вид задания для каждого раунда */
  function plan(rng, kind, mode, n) {
    var kinds = kind === 'mix' ? Polski.mixedSequence(rng, ['cz', 'bi'], n, { maxRun: 2 }) : [];
    for (var i = 0; kinds.length < n; i++) kinds.push(kind);
    var c = kind === 'mix' ? C_PER_RUN : 0;
    var rest = n - c;
    var counts = {};
    if (mode === 'ab') { counts.A = Math.ceil(rest / 2); counts.B = Math.floor(rest / 2); }
    else counts[mode === 'a' ? 'A' : 'B'] = rest;
    if (c) counts.C = c;
    return { kinds: kinds, types: sequence(rng, counts, 2) };
  }

  /** следующее предложение нужного вида; для C — только с противоположной формой; глаголы не повторяем */
  function take(s, kind, needOpposite) {
    var pool = s.pools[kind];
    function ok(it, fresh) { return (!needOpposite || it.opposite) && (!fresh || !s.verbs[it.inf]); }
    var idx = -1;
    for (var pass = 0; pass < 2 && idx === -1; pass++) {
      for (var i = 0; i < pool.length; i++) if (ok(pool[i], pass === 0)) { idx = i; break; }
    }
    if (idx === -1) { // база кончилась — по второму кругу
      s.pools[kind] = pool = s.rng.shuffle(POOL[kind]);
      for (var j = 0; j < pool.length; j++) if (ok(pool[j], false)) { idx = j; break; }
    }
    var it = pool.splice(idx, 1)[0];
    s.verbs[it.inf] = true;
    return it;
  }

  /** «Na ławce siedzi kobieta» → части по словам (перенос строк — между словами) */
  function words(text) { return text ? text.split(/\s+/) : []; }

  function build(rng, it, type, mix) {
    var options;
    if (type === 'C') {
      options = [it.answer, it.opposite];
    } else {
      var traps = rng.sample(I.trapPool(it), 3);
      // в Mix одна ловушка иногда — причастие другого вида (czytająca ↔ czytana)
      if (mix && it.opposite && rng.chance(0.5)) traps[rng.int(0, traps.length - 1)] = it.opposite;
      options = [it.answer].concat(traps);
    }

    var source = null;
    if (type === 'A') {
      source = [];
      if (it.src.pre) source.push(it.src.pre);
      source.push({ text: it.src.clause, mark: true });
      // «…, który płonął.» — точка сразу за подчёркнутым, без пробела
      if (it.src.post) source.push(/^[.,!?;:]/.test(it.src.post) ? { text: it.src.post, glue: true } : it.src.post);
    }

    return {
      type: 'slots',
      question: type === 'C' ? 'Czynny czy bierny?' : null,
      source: source,
      sentence: words(it.before).concat([{ slot: 'imi' }], words(it.after)),
      slots: {
        imi: {
          color: 'orange', label: 'Imiesłów',
          options: rng.shuffle(options), answer: it.answer,
          placeholder: type === 'B' ? it.inf : undefined, // как цифра в рамке у Liczebników
        },
      },
      kind: it.kind,
      exercise: type,
      verb: it.inf,
    };
  }

  function makeGenerate(kind, mode) {
    return function (rng, ctx) {
      var s = ctx.session;
      if (!s.plan) {
        s.plan = plan(rng, kind, mode, ctx.total);
        s.pools = { cz: rng.shuffle(POOL.cz), bi: rng.shuffle(POOL.bi) };
        s.verbs = {};
        s.rng = rng;
      }
      var i = (ctx.round - 1) % ctx.total;
      var k = s.plan.kinds[i];
      var type = s.plan.types[i];
      return build(rng, take(s, k, type === 'C'), type, kind === 'mix');
    };
  }

  var KINDS = [
    { id: 'cz', title: 'Czynne', rule: I.rules.cz },
    { id: 'bi', title: 'Bierne', rule: I.rules.bi },
    { id: 'mix', title: 'Mix', rule: I.rules.mix },
  ];
  var MODES = [
    { id: 'a', title: 'Przekształć' },
    { id: 'b', title: 'Uzupełnij' },
    { id: 'ab', title: 'Wszystko' },
  ];
  KINDS.forEach(function (k) {
    MODES.forEach(function (m) {
      Polski.register({
        id: 'imieslowy-' + k.id + '-' + m.id,
        title: k.title + ' · ' + m.title,
        icon: 'ący',
        rounds: 10,
        rule: k.rule,
        generate: makeGenerate(k.id, m.id),
      });
    });
  });

  // для проверки базы: Node-скрипты и прогон каждого предложения через интерфейс (build — то же задание, что в тесте)
  Polski.imieslowy.POOL = POOL;
  Polski.imieslowy.build = build;
})();
