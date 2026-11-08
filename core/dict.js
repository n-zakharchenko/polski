/*
 * Polski — общий словарь для перевода по долгому нажатию (любой тест, любое слово).
 *
 *   Polski.dict.add({ 'gazetę': 'газету', … })           — словоформы → перевод (тест кладёт свой словарь
 *                                                          в файл и подключает его в manifest.js, больше ничего)
 *   Polski.dict.participles({ 'czytający': 'читающий' })  — причастия: польская словарная форма (м. р. ед. ч.,
 *                                                          можно « się») → русская; все польские формы
 *                                                          (czytającej, czytających, zmęczeni …) склоняются сами
 *   Polski.dict.lookup('Gazetę,') → 'газету' | null       — регистр и знаки препинания не важны
 *
 * Как это показывается — core/ui.js: долгое нажатие на элемент с data-tr (свой перевод теста, у Liczebników)
 * или на слово/вариант/рамку, для которых нашёлся перевод в словаре. Свой data-tr всегда главнее.
 */
(function () {
  'use strict';

  var Polski = (window.Polski = window.Polski || {});
  var words = {};
  var parts = {};

  var PL = ['y', 'a', 'e', 'ego', 'ej', 'emu', 'ym', 'ą', 'ych', 'ymi'];
  // русские окончания для польских: «мягкие» (-щий, -ший: читающий) и «твёрдые» (-ный, -тый, -мый: прочитанный).
  // Где польская форма двузначна (-e: ср. р. или мн. ч.; -ym: твор. или предл.; -ą: вин. или твор.) — оба варианта.
  var RU = {
    soft: { y: ['ий'], a: ['ая'], e: ['ее', 'ие'], ego: ['его'], ej: ['ей'], emu: ['ему'], ym: ['им', 'ем'],
      'ą': ['ую', 'ей'], ych: ['их'], ymi: ['ими'], vir: ['ие'] },
    hard: { y: ['ый'], a: ['ая'], e: ['ое', 'ые'], ego: ['ого'], ej: ['ой'], emu: ['ому'], ym: ['ым', 'ом'],
      'ą': ['ую', 'ой'], ych: ['ых'], ymi: ['ыми'], vir: ['ые'] },
  };

  function norm(s) {
    return String(s || '').toLowerCase().replace(/^[„"«(]+|[.,!?;:»”")]+$/g, '').replace(/\s+/g, ' ').trim();
  }

  /** русская форма по русской словарной (-ий/-ый, можно -ся) и польскому окончанию */
  function ruForm(ruLemma, plEnd, czynny) {
    var refl = /ся$/.test(ruLemma);
    var base = refl ? ruLemma.slice(0, -2) : ruLemma;
    var soft = /ий$/.test(base);
    var stem = base.slice(0, -2);
    var ends = RU[soft ? 'soft' : 'hard'][plEnd];
    // -ący в м. р.: та же форма — и мужско-личная мн. ч. (czytający uczniowie) → «читающий / читающие»
    if (plEnd === 'y' && czynny) ends = ends.concat(RU[soft ? 'soft' : 'hard'].vir);
    return ends.map(function (e) { return stem + e + (refl ? 'ся' : ''); }).join(' / ');
  }

  /** мужско-личная форма на -i по словарной на -y: zmęczony → zmęczeni, zawiedziony → zawiedzeni, wzięty → wzięci */
  function virOf(lemma) {
    if (/any$/.test(lemma)) return lemma.slice(0, -3) + 'ani';
    if (/ony$/.test(lemma)) { var b = lemma.slice(0, -3); if (/dzi$/.test(b)) b = b.slice(0, -1); return b + 'eni'; }
    if (/ty$/.test(lemma)) return lemma.slice(0, -2) + 'ci';
    return null;
  }

  function add(map) {
    Object.keys(map).forEach(function (k) { words[norm(k)] = map[k]; });
  }

  function participles(map) {
    Object.keys(map).forEach(function (key) {
      var ru = map[key];
      var k = norm(key);
      var refl = / się$/.test(k) ? ' się' : '';
      var pl = refl ? k.slice(0, -4) : k;
      if (/i$/.test(pl)) { parts[k] = ruForm(ru, 'vir'); return; } // в словаре сразу мужско-личная (zwiedzani)
      var czynny = /ący$/.test(pl);
      var stem = pl.slice(0, -1);
      PL.forEach(function (e) { parts[stem + e + refl] = ruForm(ru, e, czynny); });
      var vir = !czynny && virOf(pl);
      if (vir) parts[vir + refl] = ruForm(ru, 'vir');
    });
  }

  function lookup(text) {
    var t = norm(text);
    if (!t) return null;
    return words[t] || parts[t] || null;
  }

  Polski.dict = { add: add, participles: participles, lookup: lookup, _norm: norm, _ruForm: ruForm };
})();
