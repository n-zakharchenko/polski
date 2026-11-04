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

  /**
   * Генератор заданий.
   *   mode 'words'   — число дано словами, рамки: существительное + глагол
   *   mode 'numeral' — число дано цифрами в рамке, рамки: числительное + (по очереди) существительное или глагол;
   *                    третье слово дано готовым
   *   mode 'mix'     — неизвестны любые две части из трёх, по трети заданий:
   *                    существительное + глагол / числительное + существительное / числительное + глагол
   */
  function makeGenerate(mode) {
    return function (rng, ctx) {
      var s = ctx.session;
      if (!s.plan) {
        s.plan = Polski.mixedSequence(rng, ['A', 'B'], ctx.total, { maxRun: 3 });
        s.tenses = Polski.mixedSequence(rng, ['pres', 'past', 'fut'], ctx.total, { maxRun: 2 });
        s.second = Polski.mixedSequence(rng, ['noun', 'verb'], ctx.total, { maxRun: 2 }); // для 'numeral'
        s.pairs = Polski.mixedSequence(rng, ['noun+verb', 'num+noun', 'num+verb'], ctx.total, { maxRun: 2 }); // для 'mix'
        s.pool = rng.shuffle(ENTRIES);   // ещё не использованные предложения
        s.verbs = {};                    // глаголы, уже бывшие в этом проходе
      }

      var i = ctx.round - 1;
      var m = mode;
      var second = s.second[i % s.second.length];       // вторая рамка в режиме 'numeral'
      if (mode === 'mix') {
        var pair2 = s.pairs[i % s.pairs.length];
        m = pair2 === 'noun+verb' ? 'words' : 'numeral';
        if (m === 'numeral') second = pair2 === 'num+noun' ? 'noun' : 'verb';
      }
      var group = s.plan[i % s.plan.length];
      var tense = s.tenses[i % s.tenses.length];
      var aspect = tense === 'pres' ? 'impf' : (rng.chance(0.5) ? 'impf' : 'perf');

      var e = takeEntry(s);
      var pair = VERBS[e.verb];
      var verbs = verbOptions(rng, pair, aspect, tense, group);
      var nouns = nounOptions(e);
      var rest = { text: e.rest + '.', tr: e.restRu };

      var nounSlot = {
        color: 'yellow',
        label: 'Rzeczownik',
        options: rng.shuffle(nouns.list),
        answer: group === 'A' ? e.nomPl : e.genPl,
        tr: nouns.tr,
      };
      var verbSlot = {
        color: 'green',
        label: 'Czasownik',
        options: rng.shuffle(verbs.list),
        answer: verbs.list[0],
        tr: verbs.tr,
      };

      var n, sentence, slots;
      if (m === 'numeral') {
        // «pięcioro cieląt» — правильно, поэтому для cielę собирательное не предлагаем
        var allowCollective = e.sg !== 'cielę';
        n = L.numeralNumberNm(rng, group, allowCollective);
        var numList = L.numeralOptionsNm(n, e.gender, allowCollective).map(L.capitalize);
        var numTr = {};
        numList.forEach(function (x) { numTr[x] = String(n); });
        slots = {
          num: {
            color: 'blue', label: 'Liczebnik', placeholder: String(n),
            options: rng.shuffle(numList), answer: numList[0], tr: numTr,
          },
        };
        slots[second] = second === 'noun' ? nounSlot : verbSlot;
        sentence = [
          { slot: 'num' },
          second === 'noun' ? { slot: 'noun' } : { text: nounSlot.answer, tr: nouns.tr[nounSlot.answer] },
          second === 'verb' ? { slot: 'verb' } : { text: verbSlot.answer, tr: verbs.tr[verbSlot.answer] },
          rest,
        ];
      } else {
        n = L.randomNumber(rng, group);
        slots = { noun: nounSlot, verb: verbSlot };
        sentence = [
          { num: n, words: L.capitalize(L.numberWords(n, e.gender)) },
          { slot: 'noun' }, { slot: 'verb' },
          rest,
        ];
      }

      return {
        type: 'slots',
        // части с переводом той же формы — он показывается по долгому нажатию
        source: [
          { text: L.capitalize(e.sg), tr: e.ru.sg },
          { text: L.verbForm(pair[aspect], aspect, tense, e.gender), tr: L.ruForm(pair[aspect], aspect, tense, e.gender) },
          { text: e.rest + '.', tr: e.restRu },
        ],
        sentence: sentence,
        slots: slots,
        group: group,
        number: n,
        tense: tense,
        aspect: aspect,
        verb: e.verb,
        mode: m,
      };
    };
  }

  // три режима правила niemęskoosobowe (выбираются на экране «Liczebniki»)
  [
    { id: 'liczebniki-niemeskoosobowe',     title: 'Niemęskoosobowe · Rzeczownik + czasownik', icon: 'NM', mode: 'words' },
    { id: 'liczebniki-niemeskoosobowe-num', title: 'Niemęskoosobowe · Liczebnik',              icon: 'NM', mode: 'numeral' },
    { id: 'liczebniki-niemeskoosobowe-mix', title: 'Niemęskoosobowe · Wszystko',               icon: 'NM', mode: 'mix' },
  ].forEach(function (t) {
    Polski.register({
      id: t.id,
      title: t.title,
      icon: t.icon,
      rounds: 15,
      rule: L.ruleNiemeskoosobowe,   // кнопка (i) внизу карточки
      generate: makeGenerate(t.mode),
    });
  });
})();
