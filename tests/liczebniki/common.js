/*
 * Общее для раздела «Liczebniki».
 *
 * Группы по таблице:
 *   'A' — 2, 3, 4, 22–24, 32–34, …, 122–124 …  → rzeczownik w mianowniku lm., czasownik w 3 os. lm.
 *   'B' — 5–21 (w tym 11–19), 25–31, …, 95–101 … → rzeczownik w dopełniaczu lm., czasownik w 3 os. lp.
 */
(function () {
  'use strict';

  /** 'A' или 'B'; для 1 — null (не используется) */
  function groupOf(n) {
    if (n === 1) return null;
    var last = n % 10;
    var lastTwo = n % 100;
    if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'A';
    return 'B';
  }

  /**
   * Случайное число нужной группы, от 2 до 199.
   * В половине случаев — из 2–30, чтобы чаще попадались 12–14 и 21.
   */
  function randomNumber(rng, group) {
    var max = rng.chance(0.5) ? 30 : 199;
    for (;;) {
      var n = rng.int(2, max);
      if (groupOf(n) === group) return n;
    }
  }

  /**
   * Род существительного по окончанию: -a → ż (f), -o/-e/-ę/-um → n, иначе m.
   * Исключения помечаются в базе явно пятым полем: 'jabłoń, jabłonie, jabłoni, jabłoni, f'.
   */
  function guessGender(sg) {
    if (/a$/.test(sg)) return 'f';
    if (/(o|e|ę|um)$/.test(sg)) return 'n';
    return 'm';
  }

  function splitList(s) {
    return (s || '').split(',').map(function (x) { return x.trim(); });
  }

  /**
   * 'pies, psy, psów, psa | szczekać | na listonosza | собака, собаки, собак, собаки | на почтальона'
   *   → { sg, nomPl, genPl, genSg, locPl, gender, verb, rest,
   *       ru: { sg, nomPl, genPl, genSg, locPl }, restRu }
   */
  function parseEntry(line) {
    var parts = line.split('|').map(function (s) { return s.trim(); });
    var noun = splitList(parts[0]);
    var ru = splitList(parts[3]);
    var e = {
      sg: noun[0], nomPl: noun[1], genPl: noun[2], genSg: noun[3],
      gender: noun[4] || guessGender(noun[0]),
      verb: parts[1],
      rest: parts[2],
      ru: { sg: ru[0], nomPl: ru[1], genPl: ru[2], genSg: ru[3] },
      restRu: parts[4] || '',
    };
    e.locPl = locPlPl(e.nomPl);
    e.ru.locPl = locPlRu(e.ru);
    return e;
  }

  /* ---------- местный падеж мн. ч. (запасная ловушка) ---------- */

  /** польский: psy → psach, konie → koniach, okna → oknach, cielęta → cielętach */
  function locPlPl(nomPl) {
    return nomPl.replace(/[yiea]$/, '') + 'ach';
  }

  /** русский: собаки → собаках, лошади → лошадях, стулья → стульях, воздушные шары → воздушных шарах */
  function locPlRu(ru) {
    if (ru.nomPl === ru.sg && ru.genPl === ru.sg) return ru.sg; // несклоняемые: такси, кафе
    var words = ru.nomPl.split(' ');
    return words.map(function (w, i) {
      if (/(ые|ие)$/.test(w)) return w.slice(0, -1) + 'х';   // прилагательное: воздушные → воздушных, скорые → скорых
      if (i < words.length - 1) return w.replace(/ьи$/, 'ьих'); // божьи → божьих
      if (/ья$/.test(w)) return w.replace(/я$/, 'ях');   // стулья → стульях
      if (/[ыа]$/.test(w)) return w.slice(0, -1) + 'ах';
      if (/я$/.test(w)) return w.slice(0, -1) + 'ях';
      if (/[гкхжшчщ]и$/.test(w)) return w.slice(0, -1) + 'ах';
      if (/и$/.test(w)) return w.slice(0, -1) + 'ях';
      return w;
    }).join(' ');
  }

  /**
   * Ловушка для существительного: dop. lp. («dwa psa»),
   * а если он совпадает с mian. lm. или dop. lm. — miejscownik lm. (książkach).
   * → { form, ru }
   */
  function nounTrap(e) {
    if (e.genSg && e.genSg !== e.nomPl && e.genSg !== e.genPl) return { form: e.genSg, ru: e.ru.genSg };
    return { form: e.locPl, ru: e.ru.locPl };
  }

  /* ---------- глаголы: видовые пары и формы ---------- */

  /**
   * 'inf: 3sg, 3pl, przeszły m., przeszły ż.[, przeszły męskoos. lm.]' → объект (тот же формат для русского).
   * Пятое поле (pracowali, nieśli) нужно только для męskoosobowych.
   */
  function parseVerb(s) {
    var m = /^\s*([^:]+):(.*)$/.exec(s);
    var f = splitList(m[2]);
    return { inf: m[1].trim(), s3: f[0], p3: f[1], pastM: f[2], pastF: f[3], pastVir: f[4] };
  }

  /** строки из verbs.js → { 'szczekać': { impf: {..., ru: {...}}, perf: {..., ru: {...}} } } */
  function buildVerbs(lines) {
    var map = {};
    lines.forEach(function (line) {
      var parts = line.split('|');
      var impf = parseVerb(parts[0]);
      var perf = parseVerb(parts[1]);
      impf.ru = parseVerb(parts[2]);
      perf.ru = parseVerb(parts[3]);
      map[impf.inf] = { impf: impf, perf: perf };
    });
    return map;
  }

  /* ---------- русский перевод формы глагола ---------- */

  /** 'лаяла' → 'лаяло' / 'лаяли'; 'купалась' → 'купалось'; 'скакала галопом' → 'скакало галопом' */
  function ruFromFeminine(pastF, ending) {
    var words = pastF.split(' ');
    words[0] = words[0].replace(/ла(сь)?$/, function (m, s) { return 'л' + ending + (s || ''); });
    return words.join(' ');
  }

  function ruPastFor(r, who) {
    if (who === 'm') return r.pastM;
    if (who === 'f') return r.pastF;
    if (who === 'A') return ruFromFeminine(r.pastF, 'и');
    return ruFromFeminine(r.pastF, 'о'); // 'n' и 'B'
  }

  /** перевод той же формы, что verbForm: szczekały → лаяли, będzie szczekało → будет лаять */
  function ruForm(v, aspect, tense, who) {
    var r = v.ru;
    if (who === 'V') who = 'A'; // по-русски мн. ч. одно: работали
    var plural = who === 'A';
    if (tense === 'past') return ruPastFor(r, who);
    if (tense === 'pres' || (tense === 'fut' && aspect === 'perf')) return plural ? r.p3 : r.s3;
    return (plural ? 'будут ' : 'будет ') + r.inf;
  }

  /** 'szła' → 'szło' / 'szły'; 'kąpała się' → 'kąpało się' */
  function fromFeminine(pastF, ending) {
    var m = /^(.*)a( się)?$/.exec(pastF);
    return m[1] + ending + (m[2] || '');
  }

  /** прошедшее для подлежащего: 'm' | 'f' | 'n' (ед. ч.), 'A' (one: -ły), 'B' (ono: -ło) */
  function pastFor(v, who) {
    if (who === 'm') return v.pastM;
    if (who === 'f') return v.pastF;
    if (who === 'A') return fromFeminine(v.pastF, 'y');
    return fromFeminine(v.pastF, 'o'); // 'n' и 'B'
  }

  /**
   * Форма глагола.
   *   v      — одна половина пары (impf или perf)
   *   aspect — 'impf' | 'perf'
   *   tense  — 'pres' (только impf) | 'past' | 'fut'
   *   who    — 'A' (3 os. lm. «one»: pracowały), 'V' (3 os. lm. męskoos. «oni»: pracowali),
   *            'B' (3 os. lp. «ono»: pracowało), или род существительного в ед. ч.: 'm' | 'f' | 'n'
   */
  function verbForm(v, aspect, tense, who) {
    var plural = who === 'A' || who === 'V';
    var past = who === 'V' ? v.pastVir : pastFor(v, who);
    if (tense === 'past') return past;
    if (tense === 'pres' || (tense === 'fut' && aspect === 'perf')) return plural ? v.p3 : v.s3;
    // будущее несовершенного: będzie / będą + прошедшее
    return (plural ? 'będą ' : 'będzie ') + past;
  }

  /* ---------- число словами (2–199) ---------- */

  var UNITS = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
  var TEENS = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście',
    'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
  var TENS = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt',
    'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];

  /**
   * Число словами для niemęskoosobowych существительных.
   * gender 'f' → «dwie» (dwie książki, dwadzieścia dwie kobiety), иначе «dwa».
   * «jeden» на конце составного числа — всегда в мужском роде (dwadzieścia jeden okien).
   */
  function numberWords(n, gender) {
    if (n < 1 || n > 199) throw new Error('numberWords: 1–199, dostałem ' + n);
    var words = [];
    if (n >= 100) { words.push('sto'); n -= 100; }
    if (n >= 20) { words.push(TENS[Math.floor(n / 10)]); n %= 10; }
    else if (n >= 10) { words.push(TEENS[n - 10]); n = 0; }
    if (n > 0) words.push(n === 2 && gender === 'f' ? 'dwie' : UNITS[n]);
    return words.join(' ');
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /* ---------- męskoosobowe: числительные ---------- */

  var DWAJ = { 2: 'dwaj', 3: 'trzej', 4: 'czterej' };
  var VIR_UNITS = ['', 'jeden', 'dwóch', 'trzech', 'czterech', 'pięciu', 'sześciu', 'siedmiu', 'ośmiu', 'dziewięciu'];
  var VIR_TEENS = ['dziesięciu', 'jedenastu', 'dwunastu', 'trzynastu', 'czternastu',
    'piętnastu', 'szesnastu', 'siedemnastu', 'osiemnastu', 'dziewiętnastu'];
  var VIR_TENS = ['', '', 'dwudziestu', 'trzydziestu', 'czterdziestu', 'pięćdziesięciu',
    'sześćdziesięciu', 'siedemdziesięciu', 'osiemdziesięciu', 'dziewięćdziesięciu'];

  /**
   * Число словами для męskoosobowych существительных.
   *   form 'dwaj' (только 2, 3, 4) → dwaj / trzej / czterej
   *   иначе — форма на -ch / -u: dwóch, pięciu, dwudziestu dwóch, stu czterech, dwudziestu jeden
   */
  function numberWordsVirile(n, form) {
    if (form === 'dwaj') {
      if (!DWAJ[n]) throw new Error('dwaj/trzej/czterej — tylko 2, 3, 4');
      return DWAJ[n];
    }
    if (n < 2 || n > 199) throw new Error('numberWordsVirile: 2–199, dostałem ' + n);
    var words = [];
    if (n >= 100) { words.push('stu'); n -= 100; }
    if (n >= 20) { words.push(VIR_TENS[Math.floor(n / 10)]); n %= 10; }
    else if (n >= 10) { words.push(VIR_TEENS[n - 10]); n = 0; }
    if (n > 0) words.push(VIR_UNITS[n]);
    return words.join(' ');
  }

  /**
   * Группы męskoosobowe:
   *   'A' — dwaj, trzej, czterej       → mian. lm. + 3 os. lm. «oni»
   *   'B' — dwóch, trzech, czterech    → dop. lm. + 3 os. lp. «ono»
   *   'C' — больше 4 (pięciu, dwudziestu dwóch, stu …) → dop. lm. + 3 os. lp. «ono»
   */
  function randomNumberMo(rng, group) {
    if (group === 'A' || group === 'B') return rng.int(2, 4);
    var max = rng.chance(0.5) ? 30 : 199;
    for (;;) {
      var n = rng.int(5, max);
      if (n !== 1) return n;
    }
  }

  /**
   * 'robotnik, robotnicy, robotników, robotnika, robotniki | pracować | w fabryce | рабочий, … | на фабрике'
   *   → { sg, nomPl, genPl, genSg, nonVir, verb, rest, ru: { sg, nomPl, genPl, genSg }, restRu }
   */
  function parseEntryMo(line) {
    var parts = line.split('|').map(function (s) { return s.trim(); });
    var noun = splitList(parts[0]);
    var ru = splitList(parts[3]);
    return {
      sg: noun[0], nomPl: noun[1], genPl: noun[2], genSg: noun[3], nonVir: noun[4],
      gender: 'm',
      verb: parts[1],
      rest: parts[2],
      ru: { sg: ru[0], nomPl: ru[1], genPl: ru[2], genSg: ru[3] },
      restRu: parts[4] || '',
    };
  }

  /**
   * Ловушки для существительного męskoosobowego — все подходящие:
   *   форма niemęskoosobowa (robotniki) и dop. lp. (robotnika),
   *   если они отличаются от mian. lm. и dop. lm. → [{ form, ru }, …]
   */
  function nounTrapsMo(e) {
    var out = [];
    // dop. lp. первым: если формы совпадают (programisty), перевод — «программиста»
    [{ form: e.genSg, ru: e.ru.genSg }, { form: e.nonVir, ru: e.ru.nomPl }].forEach(function (c) {
      if (!c.form || c.form === e.nomPl || c.form === e.genPl) return;
      if (out.some(function (o) { return o.form === c.form; })) return;
      out.push(c);
    });
    return out;
  }

  /* ---------- режим «выбери числительное»: числа и варианты ---------- */

  var COLLECTIVE = {
    5: 'pięcioro', 6: 'sześcioro', 7: 'siedmioro', 8: 'ośmioro', 9: 'dziewięcioro',
    10: 'dziesięcioro', 11: 'jedenaścioro', 12: 'dwanaścioro', 13: 'trzynaścioro', 14: 'czternaścioro',
    15: 'piętnaścioro', 16: 'szesnaścioro', 17: 'siedemnaścioro', 18: 'osiemnaścioro', 19: 'dziewiętnaścioro',
    20: 'dwadzieścioro', 30: 'trzydzieścioro', 40: 'czterdzieścioro', 50: 'pięćdziesięcioro',
    60: 'sześćdziesięcioro', 70: 'siedemdziesięcioro', 80: 'osiemdziesięcioro', 90: 'dziewięćdziesięcioro',
  };

  function isX1(n) { return n > 20 && n % 10 === 1 && n % 100 !== 11; }  // 21, 31 … 101, 121 …

  /**
   * Числа для режима «liczebnik» (niemęskoosobowe) — только такие, у которых есть 3 настоящих варианта:
   *   'A': 2, 3, 4 и составные на 2 (22, 32 … 192, кроме 112)
   *   'B': 5–20, круглые десятки 30–90, составные на 1 (21, 31 … 191, 101)
   */
  var NM_NUM_POOL = { A: [2, 3, 4], B: [] };
  (function () {
    for (var t = 2; t <= 19; t++) if (t !== 11) NM_NUM_POOL.A.push(t * 10 + 2);
    for (var n = 5; n <= 20; n++) NM_NUM_POOL.B.push(n);
    [30, 40, 50, 60, 70, 80, 90].forEach(function (x) { NM_NUM_POOL.B.push(x); });
    for (var k = 2; k <= 19; k++) if (k !== 11) NM_NUM_POOL.B.push(k * 10 + 1);
    NM_NUM_POOL.B.push(101);
  })();

  /** allowCollective = false (cielę) — в группе 'B' только числа на 1, чтобы третий вариант был «jedna», а не «-oro» */
  function numeralNumberNm(rng, group, allowCollective) {
    var pool = NM_NUM_POOL[group];
    if (group === 'B' && allowCollective === false) pool = pool.filter(function (n) { return isX1(n) || n === 101; });
    return rng.pick(pool);
  }

  /**
   * Варианты числительного для niemęskoosobowych; первый — правильный.
   *   на 2:        dwa / dwie (другой род) / dwóch                 — dwadzieścia dwie / dwadzieścia dwa / dwudziestu dwóch
   *   3, 4:        trzy / trzech / trzej
   *   на 1 (21…):  dwadzieścia jeden / dwadzieścia jedna / dwudziestu jeden   (правило «Uwaga»)
   *   5–20, 30…90: pięć / pięciu / pięcioro
   * allowCollective = false — без собирательного (для cielę «pięcioro cieląt» — правильно)
   */
  function numeralOptionsNm(n, gender, allowCollective) {
    var correct = numberWords(n, gender);
    var virile = numberWordsVirile(n, 'dwóch');
    var third = null;
    if (n % 10 === 2 && n % 100 !== 12) third = numberWords(n, gender === 'f' ? 'm' : 'f');
    else if (n === 3 || n === 4) third = DWAJ[n];
    else if (isX1(n) || n === 101) third = correct.replace(/jeden$/, 'jedna');
    else if (COLLECTIVE[n] && allowCollective) third = COLLECTIVE[n];
    return uniq([correct, virile, third]);
  }

  /**
   * Варианты числительного для męskoosobowych; первый — правильный.
   *   2–4, группа 'A':  dwaj / dwóch / dwa      группа 'B': dwóch / dwaj / dwa
   *   больше 4:         pięciu / pięć           на 1: dwudziestu jeden / dwadzieścia jeden / dwudziestu jednego
   * (собирательные pięcioro не даём: «pięcioro studentów» — правильно для смешанной группы)
   */
  function numeralOptionsMo(n, group) {
    if (n <= 4) {
      var dwaj = DWAJ[n], dwoch = numberWordsVirile(n, 'dwóch'), dwa = numberWords(n, 'm');
      return group === 'A' ? [dwaj, dwoch, dwa] : [dwoch, dwaj, dwa];
    }
    var correct = numberWordsVirile(n, 'dwóch');
    var list = [correct, numberWords(n, 'm')];
    if (isX1(n) || n === 101) list.push(correct.replace(/jeden$/, 'jednego'));
    return uniq(list);
  }

  function uniq(list) {
    var out = [];
    list.forEach(function (x) { if (x && out.indexOf(x) === -1) out.push(x); });
    return out;
  }

  /* ---------- правило для кнопки (i) ---------- */

  var RULE_MESKOOSOBOWE = {
    title: 'Zasada',
    html: [
      '<p class="rule-lead">Liczebniki <b>2, 3, 4</b> w mianowniku lm. występują w dwóch formach: ',
      '<i>dwaj – dwóch</i>, <i>trzej – trzech</i>, <i>czterej – czterech</i>.</p>',
      '<table class="rule-table">',
      '<thead><tr>',
      '<th>Jeżeli mamy liczebnik</th><th>rzeczownik stoi</th><th>czasownik stoi</th>',
      '</tr></thead>',
      '<tbody>',

      '<tr class="g1">',
      '<td data-label="Jeżeli mamy liczebnik"><mark>dwaj, trzej lub czterej</mark></td>',
      '<td data-label="rzeczownik stoi">w <mark>mianowniku lm.</mark><br><span class="rule-q">kto? co? są (jest)</span></td>',
      '<td data-label="czasownik stoi">w <mark>3. osobie lm.</mark> czasu teraźniejszego, przeszłego lub przyszłego <span class="rule-q">(oni)</span></td>',
      '</tr>',
      '<tr class="rule-example"><td colspan="3">',
      '<span class="num">Dwaj</span> robotnicy pracują / pracowali / będą pracowali.',
      '</td></tr>',

      '<tr class="g2">',
      '<td data-label="Jeżeli mamy liczebnik"><mark>dwóch, trzech lub czterech</mark></td>',
      '<td data-label="rzeczownik stoi">w <mark>dopełniaczu lm.</mark><br><span class="rule-q">kogo? czego? nie ma</span></td>',
      '<td data-label="czasownik stoi">w <mark>3. osobie lp.</mark> czasu teraźniejszego, przeszłego, przyszłego <span class="rule-q">(ono)</span></td>',
      '</tr>',
      '<tr class="rule-example"><td colspan="3">',
      '<span class="num">Dwóch</span> robotników pracuje / pracowało / będzie pracowało.',
      '</td></tr>',

      '</tbody>',
      '</table>',
      '<p class="rule-uwaga">Liczebniki <b>większe niż 4</b> łączą się zawsze z rzeczownikiem w <b>dopełniaczu lm.</b>, ',
      'a w zdaniach, w których liczebnik z rzeczownikiem pełni funkcję podmiotu, czasownik (orzeczenie) stoi ',
      'w <b>3. osobie lp.</b>, np.:<br>',
      '<i><span class="num">Pięciu</span> robotników pracuje / pracowało / będzie pracowało.</i><br>',
      '<i><span class="num">Trzydziestu dwóch</span> studentów zdaje / zdawało / będzie zdawało egzamin.</i><br>',
      '<i><span class="num">Stu czterech</span> sportowców pojedzie / pojechało na olimpiadę.</i></p>',
    ].join(''),
  };

  var RULE_NIEMESKOOSOBOWE = {
    title: 'Zasada',
    html: [
      '<table class="rule-table">',
      '<thead><tr>',
      '<th>Jeżeli mamy liczebnik</th><th>rzeczownik stoi</th><th>czasownik stoi</th>',
      '</tr></thead>',
      '<tbody>',

      '<tr class="g1">',
      '<td data-label="Jeżeli mamy liczebnik"><mark>2, 3, 4</mark>;<br>22, 23, 24;<br>32, 33, 34; (…)<br>72, 73, 74; (…)<br>122, 123, 124 itd.</td>',
      '<td data-label="rzeczownik stoi">w <mark>mianowniku lm.</mark><br><span class="rule-q">kto? co? są (jest)</span></td>',
      '<td data-label="czasownik stoi">w <mark>3. osobie lm.</mark> czasu teraźniejszego, przeszłego lub przyszłego <span class="rule-q">(one)</span></td>',
      '</tr>',
      '<tr class="rule-example"><td colspan="3">',
      '<span class="num">Dwa</span> / <span class="num">Trzydzieści cztery</span> samochody jadą / jechały / będą jechały.',
      '</td></tr>',

      '<tr class="g2">',
      '<td data-label="Jeżeli mamy liczebnik">od <mark>5 do 21</mark> (w tym <mark>11–19</mark>),<br>od 25 do 31 (…)<br>od 65 do 71 (…)<br>od 95 do 101 …</td>',
      '<td data-label="rzeczownik stoi">w <mark>dopełniaczu lm.</mark><br><span class="rule-q">kogo? czego? nie ma</span></td>',
      '<td data-label="czasownik stoi">w <mark>3. osobie lp.</mark> czasu teraźniejszego, przeszłego, przyszłego <span class="rule-q">(ono)</span></td>',
      '</tr>',
      '<tr class="rule-example"><td colspan="3">',
      '<span class="num">Pięć</span> / <span class="num">Sto dwadzieścia jeden</span> samochodów jedzie / jechało / będzie jechało.',
      '</td></tr>',

      '</tbody>',
      '</table>',
      '<p class="rule-uwaga"><strong>Uwaga!</strong> Liczebnik <b>jeden</b> znajdujący się na końcu liczby, ',
      'niezależnie od rodzaju rzeczownika, zawsze stawiamy w rodzaju męskim, np.: ',
      '<i>dwadzieścia jeden okien</i>, <i>trzydzieści jeden kobiet</i>, <i>czterdzieści jeden stron</i>.</p>',
    ].join(''),
  };

  Polski.liczebniki = {
    ruleNiemeskoosobowe: RULE_NIEMESKOOSOBOWE,
    ruleMeskoosobowe: RULE_MESKOOSOBOWE,
    numberWordsVirile: numberWordsVirile,
    numeralNumberNm: numeralNumberNm,
    numeralOptionsNm: numeralOptionsNm,
    numeralOptionsMo: numeralOptionsMo,
    randomNumberMo: randomNumberMo,
    parseEntryMo: parseEntryMo,
    nounTrapsMo: nounTrapsMo,
    groupOf: groupOf,
    randomNumber: randomNumber,
    parseEntry: parseEntry,
    buildVerbs: buildVerbs,
    verbForm: verbForm,
    ruForm: ruForm,
    nounTrap: nounTrap,
    locPlPl: locPlPl,
    locPlRu: locPlRu,
    guessGender: guessGender,
    numberWords: numberWords,
    capitalize: capitalize,
  };
})();
