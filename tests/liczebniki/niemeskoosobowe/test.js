/*
 * Liczebniki — niemęskoosobowe.
 *
 * Одно задание — одно предложение из базы (words.js):
 *   сверху исходное предложение в ед. ч.:   Pies leży na trawie.
 *   ниже — число словами и две рамки:        Pięć [rzeczownik] [czasownik] na trawie.
 *   варианты существительного (жёлтые): lp. / mian. lm. / dop. lm.
 *   варианты глагола (зелёные):         bezokolicznik / 3 os. lp. / 3 os. lm.
 * Группа числа (A: 2–4…, B: 5–21…) за проход перемешана: примерно поровну,
 * не больше 3 подряд одной группы и без строгого чередования.
 * В одном проходе не повторяются ни предложения, ни глаголы.
 */
(function () {
  'use strict';

  var L = Polski.liczebniki;
  var ENTRIES = Polski.data.niemeskoosobowe.map(L.parseEntry);

  /** следующее предложение, чей глагол ещё не встречался в проходе */
  function takeEntry(s) {
    if (s.pool.length === 0) s.pool = ENTRIES.slice(); // база кончилась — по второму кругу
    var idx = 0;
    while (idx < s.pool.length && s.verbs[s.pool[idx].inf]) idx += 1;
    if (idx === s.pool.length) idx = 0; // все глаголы уже были — берём любое
    var e = s.pool.splice(idx, 1)[0];
    s.verbs[e.inf] = true;
    return e;
  }

  Polski.register({
    id: 'liczebniki-niemeskoosobowe',
    title: 'Niemęskoosobowe',
    icon: 'NM',
    rounds: 15,
    rule: L.ruleNiemeskoosobowe,   // кнопка (i) внизу карточки

    generate: function (rng, ctx) {
      var s = ctx.session;
      if (!s.plan) {
        s.plan = Polski.mixedSequence(rng, ['A', 'B'], ctx.total, { maxRun: 3 });
        s.pool = rng.shuffle(ENTRIES);   // ещё не использованные предложения
        s.verbs = {};                    // глаголы, уже бывшие в этом проходе
      }

      var i = ctx.round - 1;
      var group = s.plan[i % s.plan.length];
      var e = takeEntry(s);
      var n = L.randomNumber(rng, group);

      return {
        type: 'slots',
        source: L.capitalize(e.sg) + ' ' + e.v3sg + ' ' + e.rest + '.',
        sentence: [
          { num: n, words: L.capitalize(L.numberWords(n, e.gender)) },
          { slot: 'noun' }, { slot: 'verb' }, e.rest + '.',
        ],
        slots: {
          noun: {
            color: 'yellow',
            label: 'Rzeczownik',
            options: rng.shuffle([e.sg, e.nomPl, e.genPl]),
            answer: group === 'A' ? e.nomPl : e.genPl,
          },
          verb: {
            color: 'green',
            label: 'Czasownik',
            options: rng.shuffle([e.inf, e.v3sg, e.v3pl]),
            answer: group === 'A' ? e.v3pl : e.v3sg,
          },
        },
        group: group,
        number: n,
      };
    },
  });
})();
