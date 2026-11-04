/*
 * Liczebniki — niemęskoosobowe.
 *
 * Одно задание — одно предложение из базы (words.js):
 *   сверху исходное предложение в ед. ч.:   Pies leży na trawie.
 *   ниже — с числом и двумя рамками:         5 [rzeczownik] [czasownik] na trawie.
 *   варианты существительного (жёлтые): lp. / mian. lm. / dop. lm.
 *   варианты глагола (зелёные):         bezokolicznik / 3 os. lp. / 3 os. lm.
 * Группа числа (A: 2–4…, B: 5–21…) за проход перемешана: примерно поровну,
 * не больше 3 подряд одной группы и без строгого чередования.
 * Предложения в одном проходе не повторяются.
 */
(function () {
  'use strict';

  var L = Polski.liczebniki;
  var ENTRIES = Polski.data.niemeskoosobowe.map(L.parseEntry);

  Polski.register({
    id: 'liczebniki-niemeskoosobowe',
    title: 'Niemęskoosobowe',
    icon: 'NM',
    rounds: 15,

    generate: function (rng, ctx) {
      var s = ctx.session;
      if (!s.plan) {
        s.plan = Polski.mixedSequence(rng, ['A', 'B'], ctx.total, { maxRun: 3 });
        s.order = rng.shuffle(ENTRIES);
      }

      var i = ctx.round - 1;
      var group = s.plan[i % s.plan.length];
      var e = s.order[i % s.order.length];
      var n = L.randomNumber(rng, group);

      return {
        type: 'slots',
        source: L.capitalize(e.sg) + ' ' + e.v3sg + ' ' + e.rest + '.',
        sentence: [{ num: n }, { slot: 'noun' }, { slot: 'verb' }, e.rest + '.'],
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
