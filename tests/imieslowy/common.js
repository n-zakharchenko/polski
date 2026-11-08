/*
 * Imiesłowy przymiotnikowe — общее: правило (i), разбор заданий, склонение причастия, ловушки.
 *
 * Задание — строка базы (czynne.js / bierne.js):
 *   'bezokolicznik | исходное предложение с [który …] | целевое предложение с {ответ} | противоположная форма | !исключения'
 *   - [ ] в исходном — придаточное «który…», оно подчёркнуто (режим A, «Przekształć»);
 *   - { } в целевом — рамка; {zmęczeni=zmęczony} — у мужско-личной формы на -i пишем ещё словарную (на -y);
 *     ответ с большой буквы — рамка в начале предложения, тогда и все варианты с большой;
 *   - противоположная форма — imiesłów другого вида в том же роде/числе/падеже (czytająca ↔ czytana),
 *     для «Czynny czy bierny?» (режим C, только в Mix); «-» — такой формы нет или она могла бы подойти;
 *   - !исключения (необязательно) — формы, которые тоже подошли бы в рамку: их не даём ловушками.
 *
 * Ловушки — только настоящие формы того же причастия (другой род, число или падеж) и, в Mix,
 * противоположная форма. Склонение у всех причастий одно: как у прилагательного на -y (-ący, -ny, -ony, -ty).
 */
(function () {
  'use strict';

  /* ---------- правило для кнопки (i): в каждом режиме — только своя часть ---------- */

  var CZYNNE = [
    '<p class="rule-lead"><b>Imiesłów przymiotnikowy czynny</b> mówi, kto <b>wykonuje</b> czynność: ',
    '<i>chłopiec, który czyta</i> → <i><span class="imi">czytający</span> chłopiec</i>. ',
    'Tworzymy go <b>tylko od czasowników niedokonanych</b>: do formy ',
    '<b>3. os. lm. czasu teraźniejszego</b> <span class="rule-q">(co oni robią? — <i>czytają</i>)</span> ',
    'dodajemy <mark>-cy</mark>, <mark>-ca</mark>, <mark>-ce</mark>.</p>',

    '<table class="rule-flow"><thead><tr>',
    '<th>Bezokolicznik</th><th></th><th>oni (teraz)</th><th></th><th>imiesłów czynny</th>',
    '</tr></thead><tbody>',
    '<tr><td>czytać</td><td class="arr">→</td><td>czytają</td><td class="arr">→</td><td>czytają<mark>cy</mark><span class="tail">, -ca, -ce</span></td></tr>',
    '<tr><td>kupować</td><td class="arr">→</td><td>kupują</td><td class="arr">→</td><td>kupują<mark>cy</mark><span class="tail">, -ca, -ce</span></td></tr>',
    '<tr><td>mówić</td><td class="arr">→</td><td>mówią</td><td class="arr">→</td><td>mówią<mark>cy</mark><span class="tail">, -ca, -ce</span></td></tr>',
    '<tr><td>jeść</td><td class="arr">→</td><td>jedzą</td><td class="arr">→</td><td>jedzą<mark>cy</mark><span class="tail">, -ca, -ce</span></td></tr>',
    '<tr><td>móc</td><td class="arr">→</td><td>mogą</td><td class="arr">→</td><td>mogą<mark>cy</mark><span class="tail">, -ca, -ce</span></td></tr>',
    '<tr><td>mieć</td><td class="arr">→</td><td>mają</td><td class="arr">→</td><td>mają<mark>cy</mark><span class="tail">, -ca, -ce</span></td></tr>',
    '</tbody></table>',

    '<p class="rule-uwaga"><strong>Uwaga!</strong><br>',
    '• Od czasowników dokonanych imiesłowu czynnego nie ma: <i>czytać → czytający</i>, ale <i>przeczytać</i> → <span class="rule-no">✗</span>.<br>',
    '• <i>być</i> → <i><span class="imi">będący</span>, będąca, będące</i>.<br>',
    '• W lm. jak przymiotnik — męskoosobowe <mark>-cy</mark>, niemęskoosobowe <mark>-ce</mark>: ',
    '<i><span class="imi">czytający</span> uczniowie – <span class="imi">czytające</span> uczennice</i>, ',
    '<i><span class="imi">kupujący</span> klienci – <span class="imi">kupujące</span> klientki</i>.</p>',
  ].join('');

  var BIERNE = [
    '<p class="rule-lead"><b>Imiesłów przymiotnikowy bierny</b> mówi, że z kimś / czymś <b>ktoś coś robi lub zrobił</b>: ',
    '<i>list, który ktoś pisze</i> → <i><span class="imi">pisany</span> list</i>; ',
    '<i>list, który ktoś napisał</i> → <i><span class="imi">napisany</span> list</i>. ',
    'Tworzymy go od czasowników <b>przechodnich</b> (z dopełnieniem: <i>pisać list</i>; <i>spać, iść</i> → <span class="rule-no">✗</span>), ',
    'zarówno <b>dokonanych</b>, jak i <b>niedokonanych</b>.</p>',

    '<table class="rule-table">',
    '<thead><tr><th>Przyrostek</th><th>Bezokolicznik na</th><th>Bierzemy formę</th><th>Przykłady</th></tr></thead>',
    '<tbody>',

    '<tr class="g1">',
    '<td data-label="Przyrostek"><mark>-ny, -na, -ne</mark></td>',
    '<td data-label="Bezokolicznik na"><b>-a-</b> <span class="nw">(czyta-ć)</span>, <b>-e-</b> <span class="nw">(widzie-ć)</span><br><b>Wyjątki:</b> trzeć, drzeć → <span class="nw">-ty</span> (tarty, darty)</td>',
    '<td data-label="Bierzemy formę"><span class="rule-q">co on (z)robił?</span><br>3. os. lp. czasu przeszłego, bez <b>-ł</b></td>',
    '<td data-label="Przykłady">czyta-ł → czyta<mark>ny</mark><br>widzia-ł → widzia<mark>ny</mark><br>obejrza-ł → obejrza<mark>ny</mark></td>',
    '</tr>',
    '<tr class="rule-example"><td colspan="4"><span class="imi">Przeczytana</span> książka leży na stole.</td></tr>',

    '<tr class="g1">',
    '<td data-label="Przyrostek"><mark>-ony, -ona, -one</mark></td>',
    '<td data-label="Bezokolicznik na"><b>-y-</b> <span class="nw">(liczy-ć)</span>, <b>-i-</b> <span class="nw">(zrobi-ć)</span>;<br><b>-ść</b> (nieść), <b>-źć</b> (wieźć), <b>-c</b> (piec)</td>',
    // как в учебнике пользователя: «do tematu czasu teraźniejszego w 2. osobie l.p. dodajemy przyrostek -ony»
    // и примеры с той же нарезкой (zrob-isz → zrobi-ony). Форма «ty»: у ndk. — teraźniejszy (robisz), у dk. — przyszły prosty (zrobisz)
    '<td data-label="Bierzemy formę"><span class="rule-q">co ty (z)robisz?</span><br>do tematu 2. os. lp. <span class="nw">(ty robisz / zrobisz)</span> ',
    'dodajemy <b>-ony</b></td>',
    '<td data-label="Przykłady">licz-ysz → licz<mark>ony</mark><br>zrob-isz → zrobi<mark>ony</mark><br>niesi-esz → niesi<mark>ony</mark><br>wiezi-esz → wiezi<mark>ony</mark><br>piecz-esz → piecz<mark>ony</mark><br>',
    '<b>Wyjątki:</b><br>lubić → lubi<mark>any</mark><br>jeść → jedz<mark>ony</mark><br>kraść → kradzi<mark>ony</mark></td>',
    '</tr>',
    '<tr class="rule-example"><td colspan="4"><span class="imi">Zrobione</span> zadanie leży na biurku.</td></tr>',

    '<tr class="g1">',
    '<td data-label="Przyrostek"><mark>-ty, -ta, -te</mark></td>',
    '<td data-label="Bezokolicznik na"><b>-ą-</b> <span class="nw">(zaczą-ć)</span>, <b>-y-, -i-, -u-</b> z rdzenia — czasowniki <b>jednosylabowe</b>: <span class="nw">pić, myć, bić, kuć, szyć</span> (też z przedrostkiem: <span class="nw">wypić, umyć</span>); <b>trzeć, drzeć</b></td>',
    '<td data-label="Bierzemy formę"><span class="rule-q">co oni (z)robili?</span><br>3. os. lm. czasu przeszłego, bez <b>-li</b></td>',
    '<td data-label="Przykłady">zaczę-li → zaczę<mark>ty</mark><br>my-li → my<mark>ty</mark><br>bi-li → bi<mark>ty</mark><br>tar-li → tar<mark>ty</mark><br>',
    'też: zamknąć → zamknię<mark>ty</mark></td>',
    '</tr>',
    '<tr class="rule-example"><td colspan="4"><span class="imi">Umyte</span> okna lśnią w słońcu.</td></tr>',

    '</tbody></table>',

    // чередования перед -ony (polskinawynos.com, «Imiesłów przymiotnikowy bierny»; формы сверены по Wiktionary)
    '<div class="rule-uwaga"><strong>Wymiany przed -ony:</strong>',
    '<table class="rule-flow wym"><tbody>',
    '<tr><td><b>si → sz</b></td><td>zaprosić → zapro<mark>sz</mark>ony</td></tr>',
    '<tr><td><b>zi → ż</b></td><td>wozić → wo<mark>ż</mark>ony</td></tr>',
    '<tr><td><b>ci → c</b></td><td>płacić → pła<mark>c</mark>ony</td></tr>',
    '<tr><td><b>dzi → dz</b></td><td>chłodzić → chło<mark>dz</mark>ony</td></tr>',
    '<tr><td><b>li → l</b></td><td>szkolić → szko<mark>l</mark>ony</td></tr>',
    '<tr><td><b>ści → szcz</b></td><td>ugościć → ugo<mark>szcz</mark>ony</td></tr>',
    '<tr><td><b>i → j</b></td><td>kroić → kro<mark>j</mark>ony</td></tr>',
    '</tbody></table></div>',

    // табличка — внутри блока «Uwaga!» (отдельной подложкой она слипалась с ним)
    '<div class="rule-uwaga"><strong>Uwaga!</strong> Odmienia się jak przymiotnik: <i>zbudowany dom, zbudowanego domu, zbudowane domy</i>. ',
    'W mianowniku lm. męskoosobowym zmienia się końcówka:',
    '<table class="rule-flow"><thead><tr><th>lp.</th><th></th><th>lm.</th></tr></thead><tbody>',
    '<tr><td>kocha<mark>ny</mark> syn</td><td class="arr">→</td><td>kocha<mark>ni</mark> synowie</td></tr>',
    '<tr><td>zmęcz<mark>ony</mark> robotnik</td><td class="arr">→</td><td>zmęcz<mark>eni</mark> robotnicy</td></tr>',
    '<tr><td>zasmuc<mark>ony</mark> chłopiec</td><td class="arr">→</td><td>zasmuc<mark>eni</mark> chłopcy</td></tr>',
    '<tr><td>zmoknię<mark>ty</mark> turysta</td><td class="arr">→</td><td>zmoknię<mark>ci</mark> turyści</td></tr>',
    '</tbody></table></div>',
  ].join('');

  var NIE = '<p class="rule-uwaga"><strong>„Nie” piszemy razem:</strong> <i>niepracujący, nieznany, niedokończony, nieumyty</i>.</p>';

  var POROWNANIE = [
    '<table class="rule-flow wide"><thead><tr><th></th><th>czynny</th><th>bierny</th></tr></thead><tbody>',
    '<tr><td><b>kto?</b></td><td>ten, kto <b>robi</b></td><td>ten / to, z kim / czym ktoś coś <b>robi</b> lub <b>zrobił</b></td></tr>',
    '<tr><td><b>końcówka</b></td><td><mark>-ący</mark></td><td><mark>-ny, -ony, -ty</mark></td></tr>',
    '<tr><td><b>od czasowników</b></td><td>tylko niedokonanych</td><td>przechodnich (dk. i ndk.)</td></tr>',
    '<tr><td><b>przykład</b></td><td><i><span class="imi">piszący</span> uczeń</i></td><td><i><span class="imi">napisany</span> list</i></td></tr>',
    '</tbody></table>',
  ].join('');

  function rule(id, html) { return { id: id, title: 'Zasada', html: '<div class="rule-imi">' + html + '</div>' }; }

  var RULES = {
    cz: rule('imieslowy-czynne', CZYNNE + NIE),
    bi: rule('imieslowy-bierne', BIERNE + NIE),
    mix: rule('imieslowy-mix', POROWNANIE + '<h3 class="rule-sub">Czynne (-ący)</h3>' + CZYNNE +
      '<h3 class="rule-sub">Bierne (-ny, -ony, -ty)</h3>' + BIERNE + NIE),
  };

  /* ---------- склонение ---------- */

  // окончания прилагательного на -y: m. mian. lp. (у -ący — и mos. mian. lm.), ż. mian., n. mian. / lm. niemos.,
  // dop. m./n., dop./cel./msc. ż., cel. m./n., narz./msc. m./n. и cel. lm., bier./narz. ż., dop./msc. lm., narz. lm.
  var ENDINGS = ['y', 'a', 'e', 'ego', 'ej', 'emu', 'ym', 'ą', 'ych', 'ymi'];
  // ловушками берём чаще встречающиеся (cel. -emu и narz. lm. -ymi — реже, только если в ответе)
  var TRAP_ENDINGS = ['y', 'a', 'e', 'ego', 'ej', 'ym', 'ą', 'ych'];
  var BY_LENGTH = ENDINGS.slice().sort(function (a, b) { return b.length - a.length; });

  /** основа причастия по любой его форме на -y/-a/-e/…: biegających → biegając */
  function stemOf(form) {
    for (var i = 0; i < BY_LENGTH.length; i++) {
      var e = BY_LENGTH[i];
      if (form.length > e.length && form.slice(-e.length) === e) return form.slice(0, -e.length);
    }
    return null;
  }

  /** все формы причастия (без мужско-личной на -i) по словарной форме на -y */
  function declension(lemma) {
    var stem = lemma.slice(0, -1);
    return ENDINGS.map(function (e) { return stem + e; });
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function low(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /* ---------- разбор строки базы ---------- */

  function parse(line, kind) {
    var f = line.split('|').map(function (s) { return s.trim(); });
    var src = /^(.*?)\[(.+?)\](.*)$/.exec(f[1]);
    var tgt = /^(.*?)\{(.+?)\}(.*)$/.exec(f[2]);
    if (!src || !tgt) throw new Error('Imiesłowy: zła linia: ' + line);
    var inner = tgt[2].split('=');
    var answer = inner[0];
    var capital = answer.charAt(0) !== answer.charAt(0).toLowerCase();
    var refl = / się$/.test(answer) ? ' się' : '';
    var word = low(answer).replace(/ się$/, '');
    var lemma = inner[1] ? inner[1].replace(/ się$/, '') : stemOf(word) + 'y';
    return {
      kind: kind,                       // 'cz' | 'bi'
      inf: f[0],
      src: { pre: src[1].trim(), clause: src[2].trim(), post: src[3].trim() },
      before: tgt[1].trim(), after: tgt[3].trim(),
      answer: answer,                   // как в предложении (с большой буквы, если в начале)
      word: word, refl: refl, capital: capital,
      lemma: lemma,
      vir: !!inner[1],                  // ответ — мужско-личная форма на -i
      opposite: f[3] && f[3] !== '-' ? f[3] : null,
      ban: f[4] ? f[4].replace(/^!/, '').split(',').map(function (s) { return s.trim(); }) : [],
    };
  }

  /** форма как в предложении: «się», большая буква в начале предложения */
  function shape(item, form) {
    var s = form + item.refl;
    return item.capital ? cap(s) : s;
  }

  /** все допустимые ловушки (без ответа и исключений) — уже в нужном виде */
  function trapPool(item, all) {
    var ends = all ? ENDINGS : TRAP_ENDINGS;
    var stem = item.lemma.slice(0, -1);
    var out = [];
    ends.forEach(function (e) {
      var f = stem + e;
      if (f === item.word || item.ban.indexOf(f) !== -1 || out.indexOf(f) !== -1) return;
      out.push(f);
    });
    return out.map(function (f) { return shape(item, f); });
  }

  Polski.imieslowy = {
    rules: RULES,
    parse: parse,
    declension: declension,
    stemOf: stemOf,
    trapPool: trapPool,
    shape: shape,
    ENDINGS: ENDINGS,
  };
})();
