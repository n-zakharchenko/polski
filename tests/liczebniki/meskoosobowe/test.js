/*
 * Liczebniki — męskoosobowe.
 *
 * Одно задание — одно предложение из базы (words.js) в одном из времён:
 *   сверху исходное предложение в ед. ч.:   Robotnik pracował w fabryce.
 *   ниже — число словами и две рамки:        Dwaj [rzeczownik] [czasownik] w fabryce.
 * Группа числа (за проход ровно по трети, не больше 2 подряд):
 *   'A' dwaj / trzej / czterej        → robotnicy  + pracują / pracowali / będą pracowali   («oni»)
 *   'B' dwóch / trzech / czterech     → robotników + pracuje / pracowało / będzie pracowało («ono»)
 *   'C' больше 4 (pięciu, dwudziestu dwóch, stu czterech …) → как 'B'
 * Варианты существительного: mian. lm. / dop. lm. / ловушка — случайно
 *   форма niemęskoosobowa (robotniki) или dop. lp. (robotnika), из тех, что есть у слова.
 * Варианты глагола: правильный / другое число (oni ↔ ono) / ловушка — случайно
 *   форма «one» на -ły (pracowały, będą pracowały) или другой вид в том же времени.
 *   В настоящем и в простом будущем совершенного формы «one» нет (pracują = pracują) — там другой вид.
 * В одном проходе не повторяются ни предложения, ни глаголы.
 * Перевод (долгое нажатие) — той же формы: robotników → рабочих, pracowali → работали.
 */
(function () {
  'use strict';

  var L = Polski.liczebniki;
  var VERBS = L.buildVerbs(Polski.data.verbsMo);
  var ENTRIES = Polski.data.meskoosobowe.map(L.parseEntryMo);

  /** следующее предложение, чей глагол ещё не встречался в проходе */
  function takeEntry(s) {
    if (s.pool.length === 0) s.pool = ENTRIES.slice();
    var idx = 0;
    while (idx < s.pool.length && s.verbs[s.pool[idx].verb]) idx += 1;
    if (idx === s.pool.length) idx = 0;
    var e = s.pool.splice(idx, 1)[0];
    s.verbs[e.verb] = true;
    return e;
  }

  /** кому согласуется глагол: 'V' — «oni» (dwaj…), 'B' — «ono» (dwóch…, pięciu…) */
  function whoFor(group) { return group === 'A' ? 'V' : 'B'; }
  function otherWho(who) { return who === 'V' ? 'B' : 'V'; }

  /** три варианта глагола; первый — правильный; tr — перевод той же формы */
  function verbOptions(rng, pair, aspect, tense, who) {
    var v = pair[aspect];
    var correct = L.verbForm(v, aspect, tense, who);
    var wrongNumber = L.verbForm(v, aspect, tense, otherWho(who));
    var tr = {};
    tr[correct] = L.ruForm(v, aspect, tense, who);
    tr[wrongNumber] = L.ruForm(v, aspect, tense, otherWho(who));

    // ловушка 1: форма «one» на -ły (только там, где она отличается: прошедшее и будущее несов.)
    var nonVir = L.verbForm(v, aspect, tense, 'A');
    var nonVirOk = nonVir !== correct && nonVir !== wrongNumber;

    // ловушка 2: другой вид в том же времени (для настоящего — простое будущее совершенного)
    var otherAspect = aspect === 'impf' ? 'perf' : 'impf';
    var otherTense = (otherAspect === 'perf' && tense === 'pres') ? 'fut' : tense;
    var whoAsp = rng.chance(0.5) ? who : otherWho(who);
    var aspForm = L.verbForm(pair[otherAspect], otherAspect, otherTense, whoAsp);
    if (aspForm === correct || aspForm === wrongNumber) {
      whoAsp = otherWho(whoAsp);
      aspForm = L.verbForm(pair[otherAspect], otherAspect, otherTense, whoAsp);
    }

    var trap;
    if (nonVirOk && rng.chance(0.5)) {
      trap = nonVir;
      tr[trap] = L.ruForm(v, aspect, tense, 'A');
    } else {
      trap = aspForm;
      tr[trap] = L.ruForm(pair[otherAspect], otherAspect, otherTense, whoAsp);
    }
    return { list: [correct, wrongNumber, trap], tr: tr };
  }

  /** три варианта существительного: mian. lm., dop. lm., случайная ловушка */
  function nounOptions(rng, e) {
    var trap = rng.pick(L.nounTrapsMo(e));
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
   *   mode 'mix'     — задания обоих режимов вперемешку (поровну, не больше 2 подряд)
   */
  function makeGenerate(mode) {
    return function (rng, ctx) {
      var s = ctx.session;
      if (!s.plan) {
        s.plan = Polski.mixedSequence(rng, ['A', 'B', 'C'], ctx.total, { maxRun: 2 });
        s.tenses = Polski.mixedSequence(rng, ['pres', 'past', 'fut'], ctx.total, { maxRun: 2 });
        s.second = Polski.mixedSequence(rng, ['noun', 'verb'], ctx.total, { maxRun: 2 }); // для 'numeral'
        s.modes = Polski.mixedSequence(rng, ['words', 'numeral'], ctx.total, { maxRun: 2 }); // для 'mix'
        s.pool = rng.shuffle(ENTRIES);
        s.verbs = {};
      }

      var i = ctx.round - 1;
      var m = mode === 'mix' ? s.modes[i % s.modes.length] : mode;
      var group = s.plan[i % s.plan.length];
      var tense = s.tenses[i % s.tenses.length];
      var aspect = tense === 'pres' ? 'impf' : (rng.chance(0.5) ? 'impf' : 'perf');
      var who = whoFor(group);

      var e = takeEntry(s);
      var pair = VERBS[e.verb];
      var n = L.randomNumberMo(rng, group);
      var verbs = verbOptions(rng, pair, aspect, tense, who);
      var nouns = nounOptions(rng, e);
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

      var sentence, slots;
      if (m === 'numeral') {
        var numList = L.numeralOptionsMo(n, group).map(L.capitalize);
        var numTr = {};
        numList.forEach(function (x) { numTr[x] = String(n); });
        var second = s.second[i % s.second.length];
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
        var words = L.numberWordsVirile(n, group === 'A' ? 'dwaj' : 'dwóch');
        slots = { noun: nounSlot, verb: verbSlot };
        sentence = [
          { num: n, words: L.capitalize(words) },
          { slot: 'noun' }, { slot: 'verb' },
          rest,
        ];
      }

      return {
        type: 'slots',
        source: [
          { text: L.capitalize(e.sg), tr: e.ru.sg },
          { text: L.verbForm(pair[aspect], aspect, tense, 'm'), tr: L.ruForm(pair[aspect], aspect, tense, 'm') },
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

  // три пункта раздела «Męskoosobowe»: Rzeczownik + czasownik / Liczebnik / Mix
  [
    { id: 'liczebniki-meskoosobowe',     title: 'Rzeczownik + czasownik', icon: 'R+C', mode: 'words' },
    { id: 'liczebniki-meskoosobowe-num', title: 'Liczebnik',              icon: '2+',  mode: 'numeral' },
    { id: 'liczebniki-meskoosobowe-mix', title: 'Mieszane',               icon: '⇄',  mode: 'mix' },
  ].forEach(function (t) {
    Polski.register({
      id: t.id,
      title: t.title,
      icon: t.icon,
      rounds: 15,
      rule: L.ruleMeskoosobowe,   // кнопка (i) внизу карточки
      generate: makeGenerate(t.mode),
    });
  });
})();
