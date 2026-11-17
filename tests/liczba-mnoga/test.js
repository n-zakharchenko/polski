/*
 * Liczba mnoga — тесты: Część mowy × Przypadek × Grupa.
 *   Rzeczownik:  Mianownik / Dopełniacz × Niemęskoosobowe / Męskoosobowe / Narodowości / Mix  (8 тестов)
 *   Przymiotnik: Mianownik / Dopełniacz × Niemęskoosobowe / Męskoosobowe / Mix               (6 тестов)
 *
 * В задании одно слово в рамке (тип 'slots'), цвет — часть речи:
 *   rzeczownik — жёлтая рамка: сверху «student» (Liczba pojedyncza), ниже [ ___ ];
 *   przymiotnik — розовая: сверху «dobry lekarz», ниже [ ___ ] lekarze — существительное уже в нужной форме.
 * Варианты: ответ + 3 ловушки (common.js).
 *
 * За проход (10 заданий): Mix у существительных — NM и MO поровну и ровно одна национальность;
 * Mix у прилагательных — NM и MO поровну. Слово в проходе не повторяется (у прилагательных — само прилагательное).
 */
(function () {
  'use strict';

  var LM = Polski.liczbaMnoga;
  var DATA = Polski.data.liczbaMnoga;
  var POOL = {};
  Object.keys(DATA).forEach(function (g) {
    POOL[g] = DATA[g].map(function (l) { return LM.parse(l, g); });
  });
  LM.addDict([].concat(POOL.nm, POOL.mo, POOL.nar, POOL.przymNm, POOL.przymMo));

  var CASES = { mian: 'Mianownik lm.', dop: 'Dopełniacz lm.' };

  /** ключи «то же слово»: у существительного — оно само, у сочетания — прилагательное (по dopełniaczowi: nowych)
   *  и существительное (gość) — в проходе не повторяется ни то, ни другое */
  function keysOf(it) {
    if (!it.phrase) return [it.lp.toLowerCase()];
    var w = it.lp.split(' ');
    return ['adj:' + it.dop.split(' ')[0], w.slice(1).join(' ').toLowerCase()];
  }
  function fresh(s, it) { return keysOf(it).every(function (k) { return !s.used[k]; }); }

  /** план прохода: из какой базы каждое задание */
  function plan(rng, pos, group, n) {
    var nm = pos === 'przym' ? 'przymNm' : 'nm';
    var mo = pos === 'przym' ? 'przymMo' : 'mo';
    if (group === 'mix') {
      var seq = Polski.mixedSequence(rng, [nm, mo], pos === 'rz' ? n - 1 : n, { maxRun: 2 });
      if (pos === 'rz') seq.splice(rng.int(0, seq.length), 0, 'nar'); // ровно одна национальность
      return seq;
    }
    var g = group === 'nm' ? nm : group === 'mo' ? mo : 'nar';
    return Array(n).fill(g);
  }

  /** следующее слово из базы; одно и то же слово в проходе не повторяется */
  function take(s, g) {
    var pool = s.pools[g];
    var idx = -1;
    for (var i = 0; i < pool.length; i++) if (fresh(s, pool[i])) { idx = i; break; }
    if (idx === -1) { s.pools[g] = pool = s.rng.shuffle(POOL[g]); idx = 0; } // база кончилась — по второму кругу
    var it = pool.splice(idx, 1)[0];
    keysOf(it).forEach(function (k) { s.used[k] = true; });
    return it;
  }

  function build(rng, it, kase) {
    var src = [{ text: it.lp, tr: it.ru.lp }];
    if (it.phrase) {
      var p = LM.adjPool(it, kase);
      return {
        type: 'slots',
        sourceLabel: 'Liczba pojedyncza',
        source: src,
        sentence: [{ slot: 'przym' }, p.noun],
        slots: {
          przym: {
            color: 'pink', label: CASES[kase],
            options: rng.shuffle([p.answer].concat(LM.adjTraps(rng, it, kase))), answer: p.answer,
          },
        },
        word: it.lp,
        group: it.group,
      };
    }
    var answer = it[kase];
    return {
      type: 'slots',
      sourceLabel: 'Liczba pojedyncza',
      source: src,
      sentence: [{ slot: 'rz' }],
      slots: {
        rz: {
          color: 'yellow', label: CASES[kase],
          options: rng.shuffle([answer].concat(LM.nounTraps(rng, it, kase))), answer: answer,
        },
      },
      word: it.lp,
      group: it.group,
    };
  }

  function makeGenerate(pos, kase, group) {
    return function (rng, ctx) {
      var s = ctx.session;
      if (!s.plan) {
        s.plan = plan(rng, pos, group, ctx.total);
        s.pools = {};
        Object.keys(POOL).forEach(function (g) { s.pools[g] = rng.shuffle(POOL[g]); });
        s.used = {};
        s.rng = rng;
      }
      var g = s.plan[(ctx.round - 1) % ctx.total];
      return build(rng, take(s, g), kase);
    };
  }

  var GROUPS = {
    nm: { title: 'Niemęskoosobowe', icon: 'NM' },
    mo: { title: 'Męskoosobowe', icon: 'MO' },
    nar: { title: 'Narodowości', icon: 'PL' },
    mix: { title: 'Mix', icon: '⇄' },
  };
  var POS = {
    rz: { title: 'Rzeczownik', groups: ['nm', 'mo', 'nar', 'mix'] },
    przym: { title: 'Przymiotnik', groups: ['nm', 'mo', 'mix'] },
  };
  Object.keys(POS).forEach(function (pos) {
    ['mian', 'dop'].forEach(function (kase) {
      POS[pos].groups.forEach(function (g) {
        Polski.register({
          id: 'liczba-mnoga-' + pos + '-' + kase + '-' + g,
          // «Rzeczownik · Mianownik · Mix» — подзаголовок теста под «Liczba mnoga»
          title: POS[pos].title + ' · ' + (kase === 'mian' ? 'Mianownik' : 'Dopełniacz') + ' · ' + GROUPS[g].title,
          icon: GROUPS[g].icon,
          rounds: 10,
          rule: LM.rules[pos][kase][g],
          generate: makeGenerate(pos, kase, g),
        });
      });
    });
  });

  // для проверки базы: Node-скрипты и прогон через интерфейс (build — то же задание, что в тесте)
  LM.POOL = POOL;
  LM.build = build;
})();
