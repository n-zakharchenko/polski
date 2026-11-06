/*
 * «Obie» (оба правила): те же три режима, что у Niemęskoosobowe и Męskoosobowe,
 * но предложения вперемешку из обоих правил.
 *
 * За проход: 7–8 заданий niemęskoosobowych и 7–8 męskoosobowych, одно правило не больше 2 подряд.
 * Сами задания строят генераторы тестов этих разделов (у каждого — своя сессия прохода),
 * поэтому ловушки, переводы и распределения внутри правила те же.
 * Нужны файлы обоих тестов (см. manifest.js).
 */
(function () {
  'use strict';

  var L = Polski.liczebniki;

  // в (i) — обе таблицы
  var RULE = {
    id: 'liczebniki-mieszane',
    title: 'Zasada',
    html:
      '<h3 class="rule-sub">Niemęskoosobowe</h3>' + L.ruleNiemeskoosobowe.html +
      '<h3 class="rule-sub">Męskoosobowe</h3>' + L.ruleMeskoosobowe.html,
  };

  function makeGenerate(nmId, moId) {
    return function (rng, ctx) {
      var s = ctx.session;
      if (!s.plan) {
        s.plan = Polski.mixedSequence(rng, ['nm', 'mo'], ctx.total, { maxRun: 2 });
        s.counts = { nm: 0, mo: 0 };
        s.plan.forEach(function (k) { s.counts[k] += 1; });
        s.done = { nm: 0, mo: 0 };
        s.sub = { nm: {}, mo: {} };   // отдельные сессии генераторов — без повторов внутри правила
      }
      var kind = s.plan[(ctx.round - 1) % s.plan.length];
      s.done[kind] += 1;
      var source = Polski.tests[kind === 'nm' ? nmId : moId];
      var task = source.generate(rng, { round: s.done[kind], total: s.counts[kind], session: s.sub[kind] });
      task.kind = kind;
      return task;
    };
  }

  [
    { id: 'liczebniki-mix',     title: 'Obie · Rzeczownik + czasownik', icon: '⇄',
      nm: 'liczebniki-niemeskoosobowe',     mo: 'liczebniki-meskoosobowe' },
    { id: 'liczebniki-mix-num', title: 'Obie · Liczebnik',              icon: '⇄',
      nm: 'liczebniki-niemeskoosobowe-num', mo: 'liczebniki-meskoosobowe-num' },
    { id: 'liczebniki-mix-mix', title: 'Obie · Wszystko',               icon: '⇄',
      nm: 'liczebniki-niemeskoosobowe-mix', mo: 'liczebniki-meskoosobowe-mix' },
  ].forEach(function (t) {
    Polski.register({
      id: t.id,
      title: t.title,
      icon: t.icon,
      rounds: 10,
      rule: RULE,
      generate: makeGenerate(t.nm, t.mo),
    });
  });
})();
