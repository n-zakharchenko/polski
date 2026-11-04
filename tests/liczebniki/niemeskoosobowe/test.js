/*
 * Liczebniki — niemęskoosobowe.
 *
 * Одно задание — одно предложение из базы (words.js) в одном из времён:
 *   сверху исходное предложение в ед. ч.:   Pies szczekał na listonosza.
 *   ниже — число словами и две рамки:        Pięć [rzeczownik] [czasownik] na listonosza.
 *   варианты существительного (жёлтые): mian. lm. / dop. lm. / ловушка:
 *     dop. lp. («dwa psa» — ошибка под влиянием русского «две собаки»),
 *     а если он совпадает с одним из первых двух — miejscownik lm. (książkach)
 *   варианты глагола (зелёные):
 *     1) правильный — тот же вид и время, нужное число     (szczekało)
 *     2) тот же вид и время, другое число                   (szczekały)
 *     3) другой вид в том же времени, число случайное      (zaszczekało / zaszczekały)
 *        для настоящего времени — простое будущее совершенного (zaszczeka / zaszczekają)
 *
 * За проход перемешаны: группа числа (A: 2–4…, B: 5–21…) и время (pres/past/fut).
 * Вид: в настоящем — несовершенный, в прошедшем и будущем — случайный.
 * В одном проходе не повторяются ни предложения, ни глаголы.
 * Перевод (долгое нажатие) — той же формы: psów → собак, szczekały → лаяли.
 */
(function () {
  'use strict';

  var L = Polski.liczebniki;
  var VERBS = L.buildVerbs(Polski.data.verbs);
  var ENTRIES = Polski.data.niemeskoosobowe.map(L.parseEntry);

  /** следующее предложение, чей глагол ещё не встречался в проходе */
  function takeEntry(s) {
    if (s.pool.length === 0) s.pool = ENTRIES.slice(); // база кончилась — по второму кругу
    var idx = 0;
    while (idx < s.pool.length && s.verbs[s.pool[idx].verb]) idx += 1;
    if (idx === s.pool.length) idx = 0; // все глаголы уже были — берём любое
    var e = s.pool.splice(idx, 1)[0];
    s.verbs[e.verb] = true;
    return e;
  }

  function other(group) { return group === 'A' ? 'B' : 'A'; }

  /** три варианта глагола; первый — правильный. tr — перевод каждого той же формы */
  function verbOptions(rng, pair, aspect, tense, group) {
    var v = pair[aspect];
    var otherAspect = aspect === 'impf' ? 'perf' : 'impf';
    // у совершенного нет настоящего — берём его простое будущее (szczeka ↔ zaszczeka)
    var otherTense = (otherAspect === 'perf' && tense === 'pres') ? 'fut' : tense;

    var correct = L.verbForm(v, aspect, tense, group);
    var wrongNumber = L.verbForm(v, aspect, tense, other(group));
    var who = rng.chance(0.5) ? group : other(group);
    var wrongAspect = L.verbForm(pair[otherAspect], otherAspect, otherTense, who);
    if (wrongAspect === correct || wrongAspect === wrongNumber) {
      wrongAspect = L.verbForm(pair[otherAspect], otherAspect, otherTense, other(who));
    }
    var whoAspect = wrongAspect === L.verbForm(pair[otherAspect], otherAspect, otherTense, who) ? who : other(who);
    var tr = {};
    tr[correct] = L.ruForm(v, aspect, tense, group);
    tr[wrongNumber] = L.ruForm(v, aspect, tense, other(group));
    tr[wrongAspect] = L.ruForm(pair[otherAspect], otherAspect, otherTense, whoAspect);
    return { list: [correct, wrongNumber, wrongAspect], tr: tr };
  }

  /** три варианта существительного: mian. lm., dop. lm., ловушка — с переводом той же формы */
  function nounOptions(e) {
    var trap = L.nounTrap(e);
    var tr = {};
    tr[e.nomPl] = e.ru.nomPl;
    tr[e.genPl] = e.ru.genPl;
    tr[trap.form] = trap.ru;
    return { list: [e.nomPl, e.genPl, trap.form], tr: tr };
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
        s.tenses = Polski.mixedSequence(rng, ['pres', 'past', 'fut'], ctx.total, { maxRun: 2 });
        s.pool = rng.shuffle(ENTRIES);   // ещё не использованные предложения
        s.verbs = {};                    // глаголы, уже бывшие в этом проходе
      }

      var i = ctx.round - 1;
      var group = s.plan[i % s.plan.length];
      var tense = s.tenses[i % s.tenses.length];
      var aspect = tense === 'pres' ? 'impf' : (rng.chance(0.5) ? 'impf' : 'perf');

      var e = takeEntry(s);
      var pair = VERBS[e.verb];
      var n = L.randomNumber(rng, group);
      var verbs = verbOptions(rng, pair, aspect, tense, group);
      var nouns = nounOptions(e);

      return {
        type: 'slots',
        // части с переводом той же формы — он показывается по долгому нажатию
        source: [
          { text: L.capitalize(e.sg), tr: e.ru.sg },
          { text: L.verbForm(pair[aspect], aspect, tense, e.gender), tr: L.ruForm(pair[aspect], aspect, tense, e.gender) },
          { text: e.rest + '.', tr: e.restRu },
        ],
        sentence: [
          { num: n, words: L.capitalize(L.numberWords(n, e.gender)) },
          { slot: 'noun' }, { slot: 'verb' },
          { text: e.rest + '.', tr: e.restRu },
        ],
        slots: {
          noun: {
            color: 'yellow',
            label: 'Rzeczownik',
            options: rng.shuffle(nouns.list),
            answer: group === 'A' ? e.nomPl : e.genPl,
            tr: nouns.tr,
          },
          verb: {
            color: 'green',
            label: 'Czasownik',
            options: rng.shuffle(verbs.list),
            answer: verbs.list[0],
            tr: verbs.tr,
          },
        },
        group: group,
        number: n,
        tense: tense,
        aspect: aspect,
        verb: e.verb,
      };
    },
  });
})();
