/*
 * Liczba mnoga — общее: правило (i), разбор базы, ловушки.
 *
 * Ловушки строятся по типу слова (окончание + чередование), а не случайно — это ошибки, которые реально делают:
 *   fake — несуществующие формы: чужое окончание (*studenty, *telefone, *talerzów), ошибка чередования
 *          (*studenti, *Beldzy, *doktorzi), нет внутренней перемены (*budyneki, *łazienk, *Niemieców);
 *   real — настоящие формы не того падежа: dopełniacz вместо mianownika и наоборот (talerzy / talerze),
 *          miejscownik (studentach), miejscownik/wołacz lp. (studencie, panie), страна вместо народа (Włochy).
 * В задании: одна настоящая (если есть) + несуществующие.
 * Прилагательные (тесты Przymiotnik): в рамке только прилагательное, существительное уже стоит в нужной форме
 *   («[ ___ ] lekarze»); ловушки — формы того же прилагательного: настоящие не те (dobrych, dobre, dobry, dobrym)
 *   и ошибки (*dobri, *dobrzi, *wysoke, *dobrich, *dobrzych).
 * EXTRA — ручные поправки: ban — формы, которые тоже верны (две нормы, разговорная форма), их не даём;
 *   mian / dop — свои ловушки сверх сгенерированных ('*' — несуществующая).
 */
(function () {
  'use strict';

  /* ---------- правило (i): в каждом режиме — только своя часть ---------- */

  function row(endsLabel, ends, plLabel, pl, exLabel, ex) {
    return '<tr class="g1"><td data-label="' + endsLabel + '">' + ends + '</td><td data-label="' + plLabel + '">' + pl +
      '</td><td data-label="' + exLabel + '">' + ex + '</td></tr>';
  }
  /** строка ['§', 'Rodzaj męski'] — подзаголовок рода на цветной полосе во всю ширину таблицы */
  function table(h1, h2, h3, rows) {
    return '<table class="rule-table"><thead><tr><th>' + h1 + '</th><th>' + h2 + '</th><th>' + h3 + '</th></tr></thead><tbody>' +
      rows.map(function (r) {
        if (r[0] === '§') return '<tr class="rule-rodzaj"><td colspan="3">' + r[1] + '</td></tr>';
        return row(h1, r[0], h2, r[1], h3, r[2]);
      }).join('') + '</tbody></table>';
  }
  var M = ['§', 'Rodzaj męski'], Z = ['§', 'Rodzaj żeński'], N = ['§', 'Rodzaj nijaki'];
  var K = 'Rzeczownik (lp.) na', L = 'Liczba mnoga', P = 'Przykłady';

  var MIAN_NM = '<p class="rule-lead"><b>Mianownik lm.</b> <span class="rule-q">(kto? co? są)</span> — ' +
    '<b>niemęskoosobowe</b>: rzeczy, zwierzęta, kobiety i wszystkie rzeczowniki żeńskie i nijakie.</p>' +
    table(K, L, P, [
      M,
      ['twardą spółgłoskę (oprócz <b>-k, -g</b>)', '<mark>-y</mark>', 'telefon → telefon<mark>y</mark><br>ogród → ogrod<mark>y</mark>'],
      ['<b>-k, -g</b>', '<mark>-i</mark>', 'kubek → kubk<mark>i</mark><br>smoking → smoking<mark>i</mark>'],
      ['miękką lub <b>-c, -cz, -sz, -ż, -rz, -l, -j</b>', '<mark>-e</mark>', 'talerz → talerz<mark>e</mark><br>owoc → owoc<mark>e</mark><br>kraj → kraj<mark>e</mark><br>koń → koni<mark>e</mark>'],
      Z,
      ['<b>-a</b> po twardej (oprócz <b>-ka, -ga</b>)', '<mark>-y</mark>', 'sprawa → spraw<mark>y</mark><br>kobieta → kobiet<mark>y</mark>'],
      ['<b>-ka, -ga</b>', '<mark>-i</mark>', 'łazienka → łazienk<mark>i</mark><br>noga → nog<mark>i</mark>'],
      ['<b>-ja, -ia, -nia, -la,</b> <b>-ca, -cza, -sza, -ża, -rza</b>', '<mark>-e</mark>', 'promocja → promocj<mark>e</mark><br>kuchnia → kuchni<mark>e</mark><br>ulica → ulic<mark>e</mark><br>plaża → plaż<mark>e</mark>'],
      ['<b>-ść, -ość, -dź</b>', '<mark>-i</mark>', 'treść → treśc<mark>i</mark><br>miejscowość → miejscowośc<mark>i</mark><br>odpowiedź → odpowiedz<mark>i</mark>'],
      ['inną spółgłoskę — <b>trzeba zapamiętać</b>', '<mark>-e</mark> albo <mark>-y</mark> / <mark>-i</mark>',
        'twarz → twarz<mark>e</mark><br>noc → noc<mark>e</mark><br>dłoń → dłoni<mark>e</mark><br>podróż → podróż<mark>e</mark><br>' +
        'rzecz → rzecz<mark>y</mark><br>mysz → mysz<mark>y</mark><br>myśl → myśl<mark>i</mark><br>pieśń → pieśn<mark>i</mark>'],
      N,
      ['<b>-o, -e, -ie, -um</b>', '<mark>-a</mark>', 'ciastko → ciastk<mark>a</mark><br>mieszkanie → mieszkani<mark>a</mark><br>technikum → technik<mark>a</mark>'],
      ['<b>-mię</b>', '<mark>-miona</mark>', 'imię → imi<mark>ona</mark><br>ramię → rami<mark>ona</mark><br>plemię → plemi<mark>ona</mark>'],
      ['inne na <b>-ę</b> (młode istoty)', '<mark>-ęta</mark>', 'cielę → ciel<mark>ęta</mark><br>zwierzę → zwierz<mark>ęta</mark><br>szczenię → szczeni<mark>ęta</mark>'],
    ]) +
    '<p class="rule-uwaga"><strong>Uwaga!</strong> W rodzaju męskim zmienia się temat: znika <b>-e-</b> — budyn<b>e</b>k → budynki, ' +
    'p<b>ie</b>s → psy, dwor<b>ze</b>c → dworce; <b>ó → o</b> w ostatniej sylabie — ogród → ogrody, stół → stoły, nóż → noże; ' +
    'w niektórych <b>ą → ę</b> — ząb → zęby, dąb → dęby (ale: miesiąc → miesiące).<br>' +
    'Wyjątki: dziecko → <i>dzieci</i>, oko → <i>oczy</i>, ucho → <i>uszy</i>, ręka → <i>ręce</i>, rok → <i>lata</i>, ' +
    'tydzień → <i>tygodnie</i>, wieś → <i>wsie</i>, seans → <i>seanse</i>.</p>';

  // -owie — закрытый список: проверяется первым, раньше чередований
  var OWIE = 'pan, syn, ojciec, mąż, dziadek, wujek, wnuk, sędzia, minister, generał, bohater, szef, członek, wróg, widz, uczeń';

  var MIAN_MO = '<p class="rule-lead"><b>Mianownik lm.</b> <span class="rule-q">(kto? są)</span> — ' +
    '<b>męskoosobowe</b>: mężczyźni i grupy z mężczyzną. Najpierw sprawdź listę <b>-owie</b>, potem — ' +
    'spółgłoska na końcu <b>zmiękcza się</b>.</p>' +
    table('Rzeczownik na', L, P, [
      ['<b>lista</b>: ' + OWIE, '<mark>-owie</mark>', 'pan → pan<mark>owie</mark><br>mąż → męż<mark>owie</mark><br>uczeń → uczni<mark>owie</mark><br>członek → członk<mark>owie</mark>'],
      ['<b>-anin</b> (mieszkańcy miast)', '<mark>-anie</mark>', 'warszawianin → warszawian<mark>ie</mark><br>krakowianin → krakowian<mark>ie</mark>'],
      ['<b>-t</b>, <b>-ta</b>, <b>-sta</b>', '<mark>-ci</mark>, <mark>-ści</mark>', 'student → studen<mark>ci</mark><br>poeta → poe<mark>ci</mark><br>optymista → optymiś<mark>ci</mark>'],
      ['<b>-d</b>', '<mark>-dzi</mark>', 'sąsiad → sąsie<mark>dzi</mark>'],
      ['<b>-r</b>', '<mark>-rzy</mark>', 'aktor → akto<mark>rzy</mark><br>dyrektor → dyrekto<mark>rzy</mark>'],
      ['<b>-k</b>', '<mark>-cy</mark>', 'rolnik → rolni<mark>cy</mark><br>pracownik → pracowni<mark>cy</mark>'],
      ['<b>-g</b>, <b>-ga</b>', '<mark>-dzy</mark>', 'biolog → biolo<mark>dzy</mark><br>kolega → kole<mark>dzy</mark>'],
      ['<b>-ca</b>, <b>-ec</b>', '<mark>-cy</mark>', 'kierowca → kierow<mark>cy</mark><br>chłopiec → chłop<mark>cy</mark><br>mieszkaniec → mieszkań<mark>cy</mark>'],
      ['<b>-n, -s, -z, -ch</b>', '<mark>-ni, -si, -zi, -si</mark>', 'kuzyn → kuzy<mark>ni</mark><br>mnich → mni<mark>si</mark>'],
      ['miękką lub <b>-c</b> (nie <b>-ec</b>), <b>-cz, -sz, -rz, -l, -j</b>', '<mark>-e</mark>', 'nauczyciel → nauczyciel<mark>e</mark><br>lekarz → lekarz<mark>e</mark><br>kibic → kibic<mark>e</mark><br>gość → gości<mark>e</mark>'],
    ]) +
    '<p class="rule-uwaga"><strong>Uwaga!</strong> Temat jak w innych formach: dziad<b>e</b>k → dziadkowie, ' +
    'minist<b>e</b>r → ministrowie, m<b>ą</b>ż → mężowie, wr<b>ó</b>g → wrogowie, uczeń → uczniowie.<br>' +
    'Wyjątki: człowiek → <i>ludzie</i>, brat → <i>bracia</i>, ksiądz → <i>księża</i>, mężczyzna → <i>mężczyźni</i>.</p>';

  var MIAN_NAR = '<p class="rule-lead"><b>Mianownik lm. — narodowości</b> (męskoosobowe): <span class="rule-q">kto? są</span></p>' +
    table('Nazwa na', L, P, [
      ['<b>lista</b>: Belg, Arab, Fin, Norweg, Serb, Mongoł', '<mark>-owie</mark>', 'Belg → Belg<mark>owie</mark><br>Fin → Fin<mark>owie</mark><br>Norweg → Norweg<mark>owie</mark>'],
      ['<b>-anin</b>', '<mark>-anie</mark>', 'Amerykanin → Amerykan<mark>ie</mark><br>Rosjanin → Rosjan<mark>ie</mark>'],
      ['<b>-k</b>, <b>-czyk</b>', '<mark>-cy</mark>', 'Polak → Pola<mark>cy</mark><br>Chińczyk → Chińczy<mark>cy</mark>'],
      ['<b>-ec</b>', '<mark>-cy</mark>', 'Niemiec → Niem<mark>cy</mark><br>Ukrainiec → Ukraiń<mark>cy</mark>'],
      ['<b>-ch</b>', '<mark>-si</mark>', 'Włoch → Wło<mark>si</mark><br>Czech → Cze<mark>si</mark>'],
      ['<b>-d, -r, -z, -s, -n, -t</b>', '<mark>-dzi, -rzy, -zi, -si, -ni, -ci</mark>', 'Szwed → Szwe<mark>dzi</mark><br>Węgier → Węg<mark>rzy</mark><br>Francuz → Francu<mark>zi</mark><br>Hindus → Hindu<mark>si</mark><br>Litwin → Litwi<mark>ni</mark>'],
    ]) +
    '<p class="rule-uwaga"><strong>Uwaga!</strong> Znika <b>-e-</b>: Węgi<b>e</b>r → Węgrzy, Holend<b>e</b>r → Holendrzy, Tur<b>e</b>k → Turcy. ' +
    'Hiszpan → <i>Hiszpanie</i> (choć nie kończy się na -anin). Narodowości piszemy wielką literą.</p>';

  var DOP_NM = '<p class="rule-lead"><b>Dopełniacz lm.</b> <span class="rule-q">(kogo? czego? nie ma)</span> — ' +
    '<b>niemęskoosobowe</b>. Przy <b>-ów, -i, -y</b> temat bierzemy z mianownika lm.: ' +
    'budynki → budynków, psy → psów, ogrody → ogrodów, zęby → zębów.</p>' +
    table(K, L, P, [
      M,
      ['twardą spółgłoskę, zwykle też <b>-c</b>, <b>-j</b>', '<mark>-ów</mark>', 'telefon → telefon<mark>ów</mark><br>owoc → owoc<mark>ów</mark><br>kraj → kraj<mark>ów</mark>'],
      ['miękką (<b>-ń, -ć</b>) lub <b>-l</b>', '<mark>-i</mark>', 'koń → kon<mark>i</mark><br>liść → liśc<mark>i</mark><br>portfel → portfel<mark>i</mark>'],
      ['<b>-cz, -sz, -rz, -ż</b>', '<mark>-y</mark>', 'talerz → talerz<mark>y</mark><br>klucz → klucz<mark>y</mark><br>nóż → noż<mark>y</mark>'],
      Z,
      ['<b>-a</b> (oprócz <b>-ja, -ia, -nia</b>)', 'końcówka zerowa <mark>-Ø</mark>', 'sprawa → spraw<br>łazienka → łazien<b>e</b>k<br>ulica → ulic'],
      ['<b>-ja, -ia, -nia</b>', '<mark>-i</mark>', 'promocja → promocj<mark>i</mark><br>seria → seri<mark>i</mark><br>sypialnia → sypialn<mark>i</mark>'],
      ['spółgłoskę', '<mark>-y</mark> po <b>cz, sz, rz, ż, c</b>; <mark>-i</mark> po pozostałych', 'noc → noc<mark>y</mark><br>rzecz → rzecz<mark>y</mark><br>dłoń → dłon<mark>i</mark><br>treść → treśc<mark>i</mark>'],
      N,
      ['<b>-o, -e, -ie</b>', 'końcówka zerowa <mark>-Ø</mark>', 'ciastko → ciast<b>e</b>k<br>miasto → miast<br>mieszkanie → mieszkań'],
      ['<b>-um</b>', '<mark>-ów</mark>', 'technikum → technik<mark>ów</mark><br>liceum → lice<mark>ów</mark>'],
      ['<b>-mię</b>', '<mark>-mion</mark>', 'imię → imi<mark>on</mark><br>plemię → plemi<mark>on</mark>'],
      ['inne na <b>-ę</b>', '<mark>-ąt</mark>', 'cielę → ciel<mark>ąt</mark><br>zwierzę → zwierz<mark>ąt</mark>'],
    ]) +
    '<p class="rule-uwaga"><strong>Uwaga!</strong> Przy końcówce zerowej często <b>o → ó</b>: szkoła → szkół, droga → dróg, ' +
    'słowo → słów (ale: jezioro → <i>jezior</i>); pojawia się <b>-e-</b> lub <b>-ie-</b>: łazienka → łazienek, okno → okien, ' +
    'torba → toreb, owca → owiec.<br>' +
    'Wyjątki: dziecko → <i>dzieci</i>, oko → <i>oczu</i>, ucho → <i>uszu</i>, ręka → <i>rąk</i>, ' +
    'miesiąc → <i>miesięcy</i>, tydzień → <i>tygodni</i>, wieś → <i>wsi</i>, przedszkole → <i>przedszkoli</i>, ' +
    'ziemia → <i>ziem</i>, świnia → <i>świń</i>.</p>';

  var DOP_MO = '<p class="rule-lead"><b>Dopełniacz lm.</b> <span class="rule-q">(kogo? nie ma)</span> — <b>męskoosobowe</b>. ' +
    'Temat bez zmiękczenia: jak w lp., tylko bez <b>-e-</b> i z <b>o</b>, <b>ę</b> jak w mianowniku lm. — ' +
    'dziadkowie → dziadków, mężowie → mężów, wrogowie → wrogów; sąsiad → sąsiadów.</p>' +
    table('Rzeczownik na', L, P, [
      ['<b>-anin</b> (mieszkańcy miast)', '<mark>-an</mark>', 'warszawianin → warszawi<mark>an</mark><br>krakowianin → krakowi<mark>an</mark>'],
      ['twardą spółgłoskę, <b>-c</b> (nie <b>-ec</b>), <b>-j</b>; każdy z <b>-owie</b> w mianowniku', '<mark>-ów</mark>', 'student → student<mark>ów</mark><br>kibic → kibic<mark>ów</mark><br>syn → syn<mark>ów</mark><br>uczeń → uczni<mark>ów</mark>'],
      ['<b>-a</b> (m.)', '<mark>-ów</mark>', 'kierowca → kierowc<mark>ów</mark><br>optymista → optymist<mark>ów</mark><br>sędzia → sędzi<mark>ów</mark>'],
      ['miękką lub <b>-l</b>', '<mark>-i</mark>', 'nauczyciel → nauczyciel<mark>i</mark><br>właściciel → właściciel<mark>i</mark>'],
      ['<b>-cz, -sz, -rz</b>', '<mark>-y</mark>', 'lekarz → lekarz<mark>y</mark><br>bogacz → bogacz<mark>y</mark><br>listonosz → listonosz<mark>y</mark>'],
      ['<b>-ec</b>', '<mark>-ców</mark>', 'chłopiec → chłop<mark>ców</mark><br>mieszkaniec → mieszkań<mark>ców</mark>'],
    ]) +
    '<p class="rule-uwaga"><strong>Uwaga!</strong> Wyjątki: <i>ludzi, braci, księży, przyjaciół, gości</i>; ' +
    'mężczyzna → <i>mężczyzn</i>, złodziej → <i>złodziei</i>.</p>';

  var DOP_NAR = '<p class="rule-lead"><b>Dopełniacz lm. — narodowości</b> <span class="rule-q">(kogo? nie ma)</span></p>' +
    table('Nazwa na', L, P, [
      ['<b>-anin</b>', '<mark>-an</mark>', 'Rosjanin → Rosj<mark>an</mark><br>Egipcjanin → Egipcj<mark>an</mark>'],
      ['twardą spółgłoskę, <b>-k</b>, <b>-ch</b>; każda z <b>-owie</b>', '<mark>-ów</mark>', 'Polak → Polak<mark>ów</mark><br>Włoch → Włoch<mark>ów</mark><br>Belg → Belg<mark>ów</mark>'],
      ['<b>-ec</b>', '<mark>-ców</mark>', 'Niemiec → Niem<mark>ców</mark><br>Ukrainiec → Ukraiń<mark>ców</mark>'],
    ]) +
    '<p class="rule-uwaga"><strong>Uwaga!</strong> Znika <b>-e-</b>: Węgi<b>e</b>r → Węgrów, Holend<b>e</b>r → Holendrów, ' +
    'Tur<b>e</b>k → Turków. Amerykanin → <i>Amerykanów</i>, Meksykanin → <i>Meksykanów</i> (nie: -an).</p>';

  /** компактная таблица «lp. → lm.» (строки: [lp, lm]) */
  function flow(h1, h2, rows) {
    return '<table class="rule-flow"><thead><tr><th>' + h1 + '</th><th></th><th>' + h2 + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="arr">→</td><td>' + r[1] + '</td></tr>'; }).join('') +
      '</tbody></table>';
  }

  // прилагательные — отдельные тесты (Część mowy: Przymiotnik), окончания выделены розовым
  var PRZYM_MIAN_NM = '<p class="rule-lead"><b>Mianownik lm.</b> <span class="rule-q">(jakie? są)</span> — ' +
    '<b>niemęskoosobowe</b>: rzeczy, zwierzęta, kobiety. Przymiotnik kończy się na <mark>-e</mark> ' +
    '(po <b>k, g</b> i miękkich — <mark>-ie</mark>).</p>' +
    flow('lp.', 'lm.', [
      ['dobr<b>a</b> rada', 'dobr<mark>e</mark> rady'],
      ['now<b>y</b> telefon', 'now<mark>e</mark> telefony'],
      ['wysok<b>a</b> góra', 'wysok<mark>ie</mark> góry'],
      ['tan<b>i</b> bilet', 'tan<mark>ie</mark> bilety'],
      ['polsk<b>ie</b> miasto', 'polsk<mark>ie</mark> miasta'],
    ]);
  var PRZYM_MIAN_MO = '<p class="rule-lead"><b>Mianownik lm.</b> <span class="rule-q">(jacy? są)</span> — ' +
    '<b>męskoosobowe</b>: mężczyźni i grupy z mężczyzną. Przymiotnik kończy się na <mark>-i</mark> / <mark>-y</mark>, ' +
    'a spółgłoska <b>zmiękcza się</b> — tak jak w rzeczowniku.</p>' +
    '<table class="rule-flow"><thead><tr><th>lp.</th><th></th><th>lm.</th></tr></thead><tbody>' +
    [
      ['dob<b>ry</b>', 'dob<mark>rzy</mark>'],
      ['mi<b>ły</b>', 'mi<mark>li</mark>'],
      ['wyso<b>ki</b>', 'wyso<mark>cy</mark>'],
      ['dro<b>gi</b>', 'dro<mark>dzy</mark>'],
      ['boga<b>ty</b>', 'boga<mark>ci</mark>'],
      ['mło<b>dy</b>', 'mło<mark>dzi</mark>'],
      ['ci<b>chy</b>', 'ci<mark>si</mark>'],
      ['star<b>szy</b>', 'star<mark>si</mark>'],
      ['du<b>ży</b>', 'du<mark>zi</mark>'],
      ['zna<b>ny</b>, no<b>wy</b>', 'zna<mark>ni</mark>, no<mark>wi</mark>'],
      ['zmęcz<b>ony</b>', 'zmęcz<mark>eni</mark>'],
      ['obcy, ostatni', 'bez zmiany'],
    ].map(function (r) { return '<tr><td>' + r[0] + '</td><td class="arr">→</td><td>' + r[1] + '</td></tr>'; }).join('') +
    '</tbody></table>' +
    '<p class="rule-uwaga"><strong>Uwaga!</strong> zły → <i>źli</i>, wesoły → <i>weseli</i>, ' +
    'nowoczesny → <i>nowocześni</i>, polski → <i>polscy</i>.</p>';
  var PRZYM_DOP = '<p class="rule-lead"><b>Dopełniacz lm.</b> <span class="rule-q">(jakich? nie ma)</span> — ' +
    'wszystkie rodzaje, męskoosobowe i niemęskoosobowe: <mark>-ych</mark> (po <b>k, g</b> i miękkich — <mark>-ich</mark>).</p>' +
    flow('mianownik lm.', 'dopełniacz lm.', [
      ['dobre rady', 'dobr<mark>ych</mark> rad'],
      ['dobrzy lekarze', 'dobr<mark>ych</mark> lekarzy'],
      ['wysokie góry', 'wysok<mark>ich</mark> gór'],
      ['wysocy studenci', 'wysok<mark>ich</mark> studentów'],
      ['ostatni goście', 'ostatn<mark>ich</mark> gości'],
    ]) +
    '<p class="rule-uwaga"><strong>Uwaga!</strong> Zmiękczenie z mianownika znika: dob<b>rz</b>y → dob<b>r</b>ych, ' +
    'wyso<b>c</b>y → wyso<b>k</b>ich, mło<b>dz</b>i → mło<b>d</b>ych.</p>';

  function sub(t) { return '<h3 class="rule-sub">' + t + '</h3>'; }
  function rule(id, html, przym) {
    return { id: id, title: 'Zasada', html: '<div class="rule-lm' + (przym ? ' rule-przym' : '') + '">' + html + '</div>' };
  }

  var RULES = {
    rz: {
      mian: {
        nm: rule('liczba-mnoga-rz-mian-nm', MIAN_NM),
        mo: rule('liczba-mnoga-rz-mian-mo', MIAN_MO),
        nar: rule('liczba-mnoga-rz-mian-nar', MIAN_NAR),
        mix: rule('liczba-mnoga-rz-mian-mix', sub('Niemęskoosobowe') + MIAN_NM + sub('Męskoosobowe') + MIAN_MO +
          sub('Narodowości') + MIAN_NAR),
      },
      dop: {
        nm: rule('liczba-mnoga-rz-dop-nm', DOP_NM),
        mo: rule('liczba-mnoga-rz-dop-mo', DOP_MO),
        nar: rule('liczba-mnoga-rz-dop-nar', DOP_NAR),
        mix: rule('liczba-mnoga-rz-dop-mix', sub('Niemęskoosobowe') + DOP_NM + sub('Męskoosobowe') + DOP_MO +
          sub('Narodowości') + DOP_NAR),
      },
    },
    przym: {
      mian: {
        nm: rule('liczba-mnoga-przym-mian-nm', PRZYM_MIAN_NM, true),
        mo: rule('liczba-mnoga-przym-mian-mo', PRZYM_MIAN_MO, true),
        mix: rule('liczba-mnoga-przym-mian-mix', sub('Niemęskoosobowe') + PRZYM_MIAN_NM + sub('Męskoosobowe') + PRZYM_MIAN_MO, true),
      },
      // в dopełniaczu у прилагательного одна форма на все группы — правило одно
      dop: {
        nm: rule('liczba-mnoga-przym-dop', PRZYM_DOP, true),
        mo: rule('liczba-mnoga-przym-dop', PRZYM_DOP, true),
        mix: rule('liczba-mnoga-przym-dop', PRZYM_DOP, true),
      },
    },
  };

  /* ---------- разбор базы ---------- */

  /** 'lp | mian | dop = ru1; ru2; ru3' → { lp, mian, dop, ru: {lp, mian, dop}, group, phrase } */
  function parse(line, group) {
    var halves = line.split('=');
    var f = halves[0].split('|').map(function (s) { return s.trim(); });
    var ru = (halves[1] || '').split(';').map(function (s) { return s.trim(); });
    return {
      lp: f[0], mian: f[1], dop: f[2],
      ru: { lp: ru[0], mian: ru[1], dop: ru[2] },
      group: group,
      phrase: f[0].indexOf(' ') !== -1,
    };
  }

  /* ---------- ручные поправки к ловушкам ---------- */

  var EXTRA = {
    // две нормы / разговорная форма — такие формы ловушками не даём
    kosz: { ban: ['koszów'] },
    portfel: { ban: ['portfelów'] },
    szpital: { ban: ['szpitalów'] },
    sypialnia: { ban: ['sypialń'] },
    torba: { ban: ['torb'] },
    biolog: { ban: ['biologowie'] },
    psycholog: { ban: ['psychologowie'] },
    chirurg: { ban: ['chirurgowie'] },
    dziadek: { ban: ['dziadki'] },
    wujek: { ban: ['wujki'] },
    wnuk: { ban: ['wnuki'] },
    kolega: { ban: ['kolegi'] },
    dyrektor: { ban: ['dyrektorowie'] },          // устар., но не ошибка
    złodziej: { ban: ['złodziejów'] },            // rzad. вторая норма
    listonosz: { ban: ['listonoszów'] },          // -sz/-cz: в dop. lm. бывает и -ów
    bogacz: { ban: ['bogaczów'] },
    biegacz: { ban: ['biegaczów'] },
    przewodnik: { ban: ['przewodniki'] },         // = путеводители (настоящее lm.)
    członek: { ban: ['członki'] },                // = конечности (настоящее lm.)
    // исключения — свои ловушки (в духе правила, которое тут не работает)
    'dziecko': { mian: ['*dziecka', '*dziecki', 'dzieciom'], dop: ['*dziecków', '*dzieck', 'dzieciach'] },
    // oka / ok, ucha / uch — настоящее lm. в других значениях (oka sieci, ucha garnka): ловушками не даём
    'oko': { mian: ['*oki', '*ocze', 'oczami'], dop: ['*oków', '*ocz', 'oczach'], ban: ['oka', 'ok'] },
    'ucho': { mian: ['*uchy', '*usze', 'uszami'], dop: ['*uchów', '*usz', 'uszach'], ban: ['ucha', 'uch'] },
    'ręka': { mian: ['*ręki', '*ręky', 'rękach'], dop: ['*ręk', '*ręków', 'rękach'] },
    'tydzień': { mian: ['*tydzienie', '*tygodny'], dop: ['*tydzieni', '*tygodniów', 'tygodniach'] },
    'człowiek': { mian: ['*człowieki', '*człowiecy', '*człowiekowie'], dop: ['*człowieków', '*ludziów', 'ludźmi'] },
    'brat': { mian: ['braci', '*braty', '*bratowie', 'bratu'], dop: ['*bratów', '*braciów', 'braciach', 'bracia'] },
    'sędzia': { mian: ['*sędzie', 'sędzi', 'sędziów', 'sędziemu'], dop: ['sędzi', 'sędziowie', 'sędziach', '*sędziy'] },
    'uczeń': { mian: ['*ucznie', '*uczni', 'uczeni', 'uczniów'], dop: ['*uczni', '*ucznów', 'uczniowie', 'uczniach'] },
    'widz': { mian: ['*widzy', '*widze', 'widzi', 'widzów'] },
    'ksiądz': { mian: ['*księdzy', '*księdzowie', '*księdze'], dop: ['*księdzów', '*księż', 'księżach'] },
    'przyjaciel': { mian: ['*przyjacielowie', '*przyjaciely', 'przyjaciółmi'], dop: ['*przyjacieli', '*przyjacielów', 'przyjaciołach'] },
    'gość': { mian: ['*gościowie', 'gości', '*gośće', '*gościy'], dop: ['*gościów', '*gośći', 'gościach', 'goście'] },
    'pies': { mian: ['*piesy', '*psie', 'psów', 'psach'], dop: ['*piesów', 'psy', 'psach', '*psi'] },
    'wieś': { mian: ['*wiesie', '*wsi', 'wsiach'], dop: ['*wsiów', 'wsie', 'wsiach', '*wsii'] },
    'pan': { mian: ['panie'] },
    'Włoch': { mian: ['Włochy'] },
    'Czech': { mian: ['Czechy'] },
    'Węgier': { mian: ['Węgry'] },
    'Niemiec': { dop: ['Niemcach'] },
  };

  /* ---------- генерация ловушек ---------- */

  var SOFT_MARK = /([bcfmnpswz]|dz)i$/; // dłoni|e, kuchni|e, histori|e — «i» только смягчает

  /** окончание к основе с ń ś ć ź на конце: dłoń + e → dłonie, tydzień + e → tydzienie */
  function join(stem, end) {
    var m = /(dź|[ńśćź])$/.exec(stem);
    if (!m || !/^[aeiouyąęó]/.test(end)) return stem + end;
    var hard = { 'ń': 'n', 'ś': 's', 'ć': 'c', 'ź': 'z', 'dź': 'dz' }[m[1]];
    return stem.slice(0, -m[1].length) + hard + (end[0] === 'i' ? end : 'i' + end);
  }

  var CONS = /[bcćdfghjklłmnńprsśtwzźż]$/;

  /** мужско-личное чередование: student → studenci, Belg → *Beldzy, syn → *syni */
  function alt(s) {
    var R = [
      [/st$/, 'ści'], [/ch$/, 'si'], [/(rz|cz|sz|dz|ż|j|l)$/, null],
      [/t$/, 'ci'], [/d$/, 'dzi'], [/r$/, 'rzy'], [/k$/, 'cy'], [/g$/, 'dzy'], [/c$/, 'cy'],
      [/n$/, 'ni'], [/s$/, 'si'], [/z$/, 'zi'], [/ł$/, 'li'], [/([bpfmw])$/, '$1i'],
    ];
    for (var i = 0; i < R.length; i++) {
      if (R[i][0].test(s)) return R[i][1] == null ? null : s.replace(R[i][0], R[i][1]);
    }
    return null;
  }

  /** miejscownik/wołacz lp. (настоящая форма): aktor → aktorze, student → studencie, pan → panie */
  function loc(s) {
    if (/st$/.test(s)) return s.slice(0, -2) + 'ście';
    if (/t$/.test(s)) return s.slice(0, -1) + 'cie';
    if (/r$/.test(s)) return s + 'ze';
    if (/n$/.test(s)) return s + 'ie';
    return null;
  }

  /** основа без окончания mianownika lm.: telefony → telefon, dłonie → dłoni, cielęta → cielęt */
  function mianStem(m) {
    if (/owie$/.test(m)) return m.slice(0, -4);
    return m.slice(0, -1);
  }

  /** основа из dopełniacza (с правильным выпадением e и ó/o): Węgrów → Węgr, dziadków → dziadk, lekarzy → lekarz */
  function dopStem(it) {
    var d = it.dop;
    if (/ów$/.test(d)) return d.slice(0, -2);
    if (/ei$/.test(d)) return d.slice(0, -1) + 'j';        // złodziei → złodziej
    if (/[^aeouy]i$|[cdrsz]y$/.test(d) && !/ci$|dzi$/.test(d)) return d.slice(0, -1); // nauczycieli, lekarzy
    return d;
  }

  function uniq(list) {
    var seen = {};
    return list.filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; });
  }

  /** miejscownik lm. (настоящая форма): telefonach, sprawach, dłoniach, treściach */
  function mscOf(it) {
    var m = it.mian;
    var st = /(ci|si|zi|ni|dzi)$/.test(m) && /[ćśźń]|dź/.test(it.lp) ? m : mianStem(m);
    return st + 'ach';
  }

  /** настоящие формы для NM: другой падеж lm., miejscownik lm., у ż. на -a — biernik lp. (sprawę) */
  function nmReal(it, other) {
    return [other, mscOf(it), /a$/.test(it.lp) ? it.lp.slice(0, -1) + 'ę' : null];
  }

  /** NM, mianownik: { real, fake } */
  function nmMian(it) {
    var m = it.mian, st = mianStem(m), e = m.slice(-1), fake = [];
    if (/ęta$|ona$/.test(m)) {
      fake.push(st + 'y');
      fake.push(/ona$/.test(m) ? it.lp.replace(/ę$/, 'ęta') : null);
    } else if (e === 'y') {
      fake.push(st + 'i', st + 'e');
    } else if (e === 'i') {
      if (/[kg]$/.test(st)) fake.push(st + 'y', st + 'e');
      else if (/[cszn]$|dz$/.test(st) && /[ćśźń]|dź/.test(it.lp)) fake.push(st + 'ie', st + 'y'); // treść → *treście, *treścy
      else fake.push(st + 'e', st + 'y');
    } else if (e === 'e') {
      if (SOFT_MARK.test(st)) fake.push(st.slice(0, -1) + 'y');            // dłonie → *dłony
      else fake.push(st + 'y', st + 'i');                                  // talerze → talerzy, *talerzi
    } else if (e === 'a') {
      if (/um$/.test(it.lp)) fake.push(it.lp + 'y');                       // technikum → *technikumy
      if (/[kg]$/.test(st)) fake.push(st + 'i', st + 'y');
      else if (SOFT_MARK.test(st)) fake.push(st.slice(0, -1) + 'y');      // mieszkania → *mieszkany
      else fake.push(st + 'y');
    }
    // нет внутренней перемены: budynek → *budyneki, ogród → *ogródy, stół → *stóły
    if (CONS.test(it.lp) && !/um$/.test(it.lp)) {
      fake.push(join(it.lp, e === 'e' && SOFT_MARK.test(st) ? 'e' : e));
      if (e === 'y' || (e === 'i' && /[kg]$/.test(st))) fake.push(st + 'a');  // *telefona — «как у среднего рода»
    }
    return { real: nmReal(it, it.dop), fake: fake };
  }

  /** NM, dopełniacz */
  function nmDop(it) {
    var d = it.dop, m = it.mian, st = mianStem(m), fake = [];
    var hard = SOFT_MARK.test(st) ? st.slice(0, -1) : st;
    if (!/ów$/.test(d)) fake.push((/um$/.test(it.lp) ? it.lp : st) + 'ów');  // *talerzów, *sprawów, *technikumów
    if (/ów$/.test(d)) {
      if (CONS.test(it.lp)) fake.push(it.lp + 'ów');                        // *budyneków, *ogródów
      if (st !== it.lp) fake.push(st);                                       // *budynk, *kubk
      fake.push(st + (/[kg]$/.test(st) ? 'y' : 'i'));                       // *telefoni, *kubky
    } else if (/[aeiouyąęó]$/.test(d) === false) {                          // końcówka zerowa
      if (hard !== d) fake.push(hard);                                       // *łazienk, *szkoł, *okn
      fake.push(hard + (/[kgl]$/.test(hard) ? 'i' : 'y'));                   // *łazienki = mian → отсеется
    } else if (/y$/.test(d)) {
      fake.push(d.slice(0, -1) + 'i');                                       // *talerzi
    } else if (/i$/.test(d)) {
      if (!/[kg]i$/.test(d)) fake.push(d.slice(0, -1) + 'y');                // *dłony, *promocjy
    }
    return { real: nmReal(it, m), fake: fake };
  }

  /** MO и narodowości, mianownik */
  function moMian(it) {
    var m = it.mian, s = dopStem(it), fake = [], real = [it.dop];
    var owie = /owie$/.test(m), anin = /anin$/.test(it.lp);
    var softE = !owie && /e$/.test(m) && !anin;
    if (anin) {
      var base = it.lp.slice(0, -2);                                         // Amerykan, warszawian
      fake.push(it.lp + 'i', base + 'y', base + 'owie');
    } else {
      fake.push(s + (/[kg]$/.test(s) ? 'i' : /i$/.test(s) ? 'e' : 'y'));  // *studenty, *rolniki, *sędzie
      if (!owie) fake.push(s + 'owie');                                      // *studentowie, *nauczycielowie
      if (!softE) {
        var a = alt(s);
        if (a && a !== m) fake.push(a);                                      // *sąsiadzi, *Beldzy, *syni
        var al = CONS.test(it.lp) && it.lp.length > s.length ? alt(it.lp) : null;
        if (al && al !== m) fake.push(al);                                   // *chłopiecy, *Węgierzy
      } else {
        fake.push(s + (/[lj]$/.test(s) ? 'i' : 'i'));                       // *lekarzi, *nauczycieli → dop (отсеется)
      }
      // ошибка в самом чередовании
      [[/rzy$/, 'rzi'], [/dzy$/, 'dzi'], [/cy$/, 'ci'], [/ści$/, 'sci'], [/([^ś])ci$/, '$1ti'], [/dzi$/, 'di'],
        [/si$/, 'sy'], [/([^d])zi$/, '$1zy'], [/ni$/, 'ny']].some(function (r) {
        if (!owie && !softE && r[0].test(m)) { fake.push(m.replace(r[0], r[1])); return true; }
        return false;
      });
      var l = /ów$/.test(it.dop) && CONS.test(it.lp) && loc(s);
      if (l && !softE) real.push(l);                                         // studencie, aktorze, synie
      if (owie) real.push(s + 'owi');                                        // synowi (celownik lp.) — почти «synowie»
    }
    return { real: real, fake: fake };
  }

  /** MO и narodowości, dopełniacz */
  function moDop(it) {
    var d = it.dop, m = it.mian, s = dopStem(it), fake = [], real = [m];
    if (/an$/.test(d) && /anin$/.test(it.lp)) {
      fake.push(d + 'ów', it.lp.slice(0, -2) + 'i');                         // *Rosjanów, *Rosjani
      real.push(d + 'ach');
    } else if (/anin$/.test(it.lp)) {
      fake.push(d.slice(0, -2), it.lp + 'ów');                               // *Amerykan, *Amerykaninów
      real.push(d.slice(0, -2) + 'ach');
    } else if (/ów$/.test(d)) {
      if (CONS.test(it.lp) && it.lp + 'ów' !== d) fake.push(it.lp + 'ów'); // *Węgierów, *chłopieców
      fake.push(s + (/[kg]$/.test(s) ? 'i' : 'y'));                         // *studenty
      if (CONS.test(it.lp) && it.lp.length === s.length && !/[kg]$/.test(s)) fake.push(s + 'i'); // *studenti
      if (/a$/.test(it.lp)) fake.push(s);                                    // *kierowc, *turyst — «как kobiet»
      real.push(s + 'owi');                                                  // studentowi (celownik lp.)
      real.push(s + 'ach');                                                  // studentach
    } else {
      fake.push(s + 'ów');                                                   // *nauczycielów, *lekarzów, *mężczyznów
      if (/y$/.test(d)) fake.push(d.slice(0, -1) + 'i');
      else if (/i$/.test(d)) fake.push(d.slice(0, -1) + 'y');
      real.push(s + 'ach');
    }
    return { real: real, fake: fake };
  }

  /** все ловушки слова для падежа: { real, fake } без ответа, словарной формы и запрещённых */
  function pool(it, kase) {
    var x = EXTRA[it.lp] || {};
    var gen = it.group === 'nm' ? (kase === 'mian' ? nmMian : nmDop) : (kase === 'mian' ? moMian : moDop);
    var p = x[kase] && x[kase].length >= 3 ? { real: [], fake: [] } : gen(it);
    (x[kase] || []).forEach(function (f) {
      if (f[0] === '*') p.fake.push(f.slice(1)); else p.real.push(f);
    });
    var answer = it[kase];
    var bad = {};
    [answer, it.lp].concat(x.ban || []).forEach(function (b) { bad[b] = true; });
    function ok(f) { return f && !bad[f] && f.length > 1; }
    var real = uniq(p.real.filter(ok));
    var fake = uniq(p.fake.filter(ok)).filter(function (f) { return real.indexOf(f) === -1; });
    return { real: real, fake: fake };
  }

  /** 3 ловушки слова: одна настоящая (если есть), остальные — несуществующие */
  function nounTraps(rng, it, kase) {
    var p = pool(it, kase);
    // чаще всего настоящая ловушка — тот же lm. в другом падеже (talerze / talerzy), реже — miejscownik и др.
    var first = p.real[0];
    var real = rng.shuffle(p.real), fake = rng.shuffle(p.fake);
    if (first && rng.chance(0.6)) real = [first].concat(real.filter(function (x) { return x !== first; }));
    var out = real.slice(0, 1).concat(fake.slice(0, 3 - Math.min(1, real.length)));
    var rest = real.slice(1).concat(fake.slice(3));
    while (out.length < 3 && rest.length) out.push(rest.shift());
    return out;
  }

  /* ---------- прилагательные: в рамке — только прилагательное, существительное уже в нужной форме ---------- */

  /** формы прилагательного из сочетания: lp, mian, dop + niemęskoosobowa (nm) и мужско-личная (mo) */
  function adjForms(it) {
    var a = { lp: it.lp.split(' ')[0], mian: it.mian.split(' ')[0], dop: it.dop.split(' ')[0] };
    var ich = /ich$/.test(a.dop);
    var st = a.dop.slice(0, -3);                                            // dobr, wysok, ostatn
    a.nm = st + (ich ? 'ie' : 'e');                                          // dobre, wysokie, ostatnie
    if (ich) a.mo = /k$/.test(st) ? st.slice(0, -1) + 'cy' : /g$/.test(st) ? st.slice(0, -1) + 'dzy' : st + 'i';
    else a.mo = alt(st.replace(/sz$/, 's').replace(/ż$/, 'z')) || st + 'y'; // dobrzy, duzi (z → zi), starsi
    if (/^wesoł$/.test(st)) a.mo = 'weseli';                                 // o → e: wesoły → weseli
    a.stem = st;
    a.ich = ich;
    return a;
  }

  /** существительное сочетания: lp, mian, dop */
  function nounPart(it) {
    function rest(s) { return s.split(' ').slice(1).join(' '); }
    return { lp: rest(it.lp), mian: rest(it.mian), dop: rest(it.dop) };
  }

  /** ловушки прилагательного: { real — настоящие формы не те, fake — ошибки } */
  function adjPool(it, kase) {
    var a = adjForms(it), n = nounPart(it);
    var nm = it.group === 'przymNm';
    var y = a.ich ? 'i' : 'y';                                               // dobr-ym / wysok-im
    var real = [], fake = [];
    if (kase === 'mian') {
      if (nm) {
        real.push(a.dop, a.mo, a.lp, a.stem + y + 'm');                      // dobrych, dobrzy, dobra, dobrym
        fake.push(a.stem + (a.ich ? 'e' : 'ie'));                            // *wysoke, *dobrie
        if (a.stem + 'i' !== a.mo) fake.push(a.stem + 'i');                  // *dobri — «мужско-личная без чередования»
      } else {
        // «dobre lekarze», «obce ludzie» — при существительном на -e это пренебрежительная форма (существует):
        // niemęskoosobowe прилагательное даём ловушкой только при studenci, synowie, sąsiedzi …
        // (у -owie такого нет: «nowe szefowie» — просто ошибка)
        var depr = /e$/.test(n.mian) && !/owie$/.test(n.mian);
        real.push(a.dop, depr ? null : a.nm, a.lp, a.stem + y + 'm');          // dobrych, dobre, dobry, dobrym
        fake.push(a.stem + 'i');                                             // *dobri, *zmęczoni, *obci
        if (a.ich && !/[kg]$/.test(a.stem)) fake.push(a.stem + 'y');          // *ostatny — «как twardy»
        [[/cy$/, 'ci'], [/dzy$/, 'dzi'], [/rzy$/, 'rzi'], [/si$/, 'sy'], [/zi$/, 'zy'], [/^źli$/, 'zli'], [/eni$/, 'oni']]
          .forEach(function (r) { if (r[0].test(a.mian)) fake.push(a.mian.replace(r[0], r[1])); });
      }
    } else {
      real.push(a.mian, nm ? a.mo : a.nm, a.stem + y + 'm', a.stem + y + 'mi'); // dobre, dobrzy, dobrym, dobrymi
      fake.push(a.stem + (a.ich ? 'ych' : 'ich'));                           // *dobrich, *wysokych
      if (!nm) fake.push(a.mian.replace(/[iy]$/, 'ych'));                    // *dobrzych, *wysocych — чередование осталось
    }
    var answer = a[kase];
    // существительное с одинаковыми mian. и dop. lm. (dzieci, wiadomości): прилагательное другого падежа
    // перед ним тоже было бы верным — такую ловушку не даём
    var cross = n.mian === n.dop ? (kase === 'mian' ? a.dop : a.mian) : null;
    function ok(x) { return x && x !== answer && x !== cross; }
    real = uniq(real.filter(ok));
    fake = uniq(fake.filter(ok)).filter(function (x) { return real.indexOf(x) === -1; });
    return { real: real, fake: fake, answer: answer, noun: n[kase] };
  }

  /** 3 ловушки прилагательного: одна настоящая (чаще — другой падеж), две ошибки; не хватит — добираем */
  function adjTraps(rng, it, kase) {
    var p = adjPool(it, kase);
    var first = p.real[0];
    var real = rng.shuffle(p.real), fake = rng.shuffle(p.fake);
    if (first && rng.chance(0.5)) real = [first].concat(real.filter(function (x) { return x !== first; }));
    var out = real.slice(0, 1).concat(fake.slice(0, 2));
    var rest = real.slice(1).concat(fake.slice(2));
    while (out.length < 3 && rest.length) out.push(rest.shift());
    return out;
  }

  /* ---------- перевод по долгому нажатию: все формы базы → в общий словарь ---------- */

  function addDict(items) {
    if (!Polski.dict) return;
    var map = {};
    function put(form, tr) {
      if (!form || !tr) return;
      if (!map[form]) map[form] = tr;
      else if (map[form].split(' / ').indexOf(tr) === -1) map[form] += ' / ' + tr;  // treści: содержания / содержаний
    }
    items.forEach(function (it) {
      ['lp', 'mian', 'dop'].forEach(function (k) {
        put(it[k], it.ru[k]);
        // прилагательное отдельно (вариант в рамке): dobrzy → хорошие — первое слово русского сочетания;
        // существительное отдельно (стоит рядом с рамкой): lekarze → врачи — остальное
        if (it.phrase) {
          var pl = it[k].split(' '), ru = (it.ru[k] || '').split(' ');
          put(pl[0], ru[0]);
          put(pl.slice(1).join(' '), ru.slice(1).join(' '));
        }
      });
    });
    Polski.dict.add(map);
  }

  Polski.liczbaMnoga = {
    rules: RULES,
    parse: parse,
    pool: pool,
    adjPool: adjPool,
    nounTraps: nounTraps,
    adjTraps: adjTraps,
    adjForms: adjForms,
    nounPart: nounPart,
    addDict: addDict,
    EXTRA: EXTRA,
  };
})();
