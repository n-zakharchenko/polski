/*
 * Дерево разделов и тестов — в этом порядке они идут на страницах.
 *
 * Раздел: { id, title, desc?, icon?, chooser?, items: [ … ] }   — метаданные тут, логики нет; разделы вкладываются
 *   chooser — вместо списка карточек экран выбора (ряды кнопок + «Start»), см. раздел «Liczebniki»
 * Тест:   { id, files: [ … ] }                        — метаданные в самом бандле (Polski.register)
 *
 * files — пути относительно tests/, в порядке загрузки
 * (общие данные и бандлы, от которых тест зависит, — раньше него).
 * Один бандл может регистрировать несколько тестов (режимы): тогда у них одинаковые files.
 */
var NIEMESKOOSOBOWE_FILES = [
  'liczebniki/common.js',
  'liczebniki/verbs.js',
  'liczebniki/niemeskoosobowe/words.js',
  'liczebniki/niemeskoosobowe/test.js',
];
var MESKOOSOBOWE_FILES = [
  'liczebniki/common.js',
  'liczebniki/meskoosobowe/verbs.js',
  'liczebniki/meskoosobowe/words.js',
  'liczebniki/meskoosobowe/test.js',
];
// «Mieszane» берёт задания у тестов обоих разделов — поэтому сначала их файлы
var MIX_FILES = [
  'liczebniki/common.js',
  'liczebniki/verbs.js',
  'liczebniki/niemeskoosobowe/words.js',
  'liczebniki/niemeskoosobowe/test.js',
  'liczebniki/meskoosobowe/verbs.js',
  'liczebniki/meskoosobowe/words.js',
  'liczebniki/meskoosobowe/test.js',
  'liczebniki/mix/test.js',
];

// Imiesłowy przymiotnikowe: правило и склонение, базы czynne/bierne, генератор (9 режимов)
var IMIESLOWY_FILES = [
  'imieslowy/common.js',
  'imieslowy/czynne.js',
  'imieslowy/bierne.js',
  'imieslowy/dict.js',   // перевод слов по долгому нажатию (общий механизм — core/dict.js)
  'imieslowy/test.js',
];

// Liczba mnoga: правило (i) и ловушки, база слов, генератор (14 тестов: часть речи × падеж × группа)
var LICZBA_MNOGA_FILES = [
  'liczba-mnoga/common.js',
  'liczba-mnoga/words.js',
  'liczba-mnoga/test.js',
];

Polski.manifest = [
  {
    id: 'liczebniki',
    title: 'Liczebniki',
    desc: 'Liczby po polsku',
    icon: '123',

    // Вместо списка карточек — один экран выбора: по кнопке в каждом ряду и «Start».
    // Выбор запоминается в браузере. Ключ теста — значения рядов через точку.
    chooser: {
      axes: [
        { key: 'rule', label: 'Zasada', options: [
          { id: 'nm', title: 'Niemęskoosobowe', hint: 'dwa koty, pięć kobiet' },
          { id: 'mo', title: 'Męskoosobowe', hint: 'dwaj studenci, pięciu studentów' },
          { id: 'both', title: 'Obie', hint: 'obie zasady razem' },
        ] },
        { key: 'mode', label: 'Co ćwiczyć', options: [
          { id: 'words', title: 'Rzeczownik + czasownik' },
          { id: 'num', title: 'Liczebnik' },
          { id: 'all', title: 'Wszystko', hint: 'dowolne dwa z trzech' },
        ] },
      ],
      tests: {
        'nm.words': 'liczebniki-niemeskoosobowe',
        'nm.num': 'liczebniki-niemeskoosobowe-num',
        'nm.all': 'liczebniki-niemeskoosobowe-mix',
        'mo.words': 'liczebniki-meskoosobowe',
        'mo.num': 'liczebniki-meskoosobowe-num',
        'mo.all': 'liczebniki-meskoosobowe-mix',
        'both.words': 'liczebniki-mix',
        'both.num': 'liczebniki-mix-num',
        'both.all': 'liczebniki-mix-mix',
      },
    },

    items: [
      { id: 'liczebniki-niemeskoosobowe',     files: NIEMESKOOSOBOWE_FILES },
      { id: 'liczebniki-niemeskoosobowe-num', files: NIEMESKOOSOBOWE_FILES },
      { id: 'liczebniki-niemeskoosobowe-mix', files: NIEMESKOOSOBOWE_FILES },
      { id: 'liczebniki-meskoosobowe',        files: MESKOOSOBOWE_FILES },
      { id: 'liczebniki-meskoosobowe-num',    files: MESKOOSOBOWE_FILES },
      { id: 'liczebniki-meskoosobowe-mix',    files: MESKOOSOBOWE_FILES },
      { id: 'liczebniki-mix',                 files: MIX_FILES },
      { id: 'liczebniki-mix-num',             files: MIX_FILES },
      { id: 'liczebniki-mix-mix',             files: MIX_FILES },
    ],
  },
  {
    id: 'imieslowy',
    title: 'Imiesłowy przymiotnikowe',
    desc: 'czytający, przeczytany',
    icon: 'ący',

    // экран выбора с одним рядом: Czynne / Bierne / Mix; в каждом тесте оба вида заданий
    // («который → причастие» и «инфинитив в рамке»), в Mix ещё «czynny czy bierny»
    chooser: {
      axes: [
        { key: 'kind', label: 'Imiesłowy', options: [
          { id: 'cz', title: 'Czynne', hint: 'czytający, czytająca, czytające' },
          { id: 'bi', title: 'Bierne', hint: 'czytany, zrobiony, umyty' },
          { id: 'mix', title: 'Mix', hint: 'czynne i bierne razem' },
        ] },
      ],
      tests: {
        'cz': 'imieslowy-cz',
        'bi': 'imieslowy-bi',
        'mix': 'imieslowy-mix',
      },
    },

    items: [
      { id: 'imieslowy-cz', files: IMIESLOWY_FILES },
      { id: 'imieslowy-bi', files: IMIESLOWY_FILES },
      { id: 'imieslowy-mix', files: IMIESLOWY_FILES },
    ],
  },
  {
    id: 'liczba-mnoga',
    title: 'Liczba mnoga',
    desc: 'koty, studenci, Polacy',
    icon: 'oni',

    // экран выбора: часть речи × падеж × группа; в задании одно слово в рамке (rzeczownik — жёлтая,
    // przymiotnik — розовая); в Mix ровно одна национальность; у прилагательных национальностей нет
    chooser: {
      axes: [
        { key: 'pos', label: 'Część mowy', options: [
          { id: 'rz', title: 'Rzeczownik', hint: 'student → studenci' },
          { id: 'przym', title: 'Przymiotnik', hint: 'dobry lekarz → dobrzy lekarze' },
        ] },
        { key: 'case', label: 'Przypadek', options: [
          { id: 'mian', title: 'Mianownik', hint: 'są — studenci, dobre rady' },
          { id: 'dop', title: 'Dopełniacz', hint: 'nie ma — studentów, dobrych rad' },
        ] },
        { key: 'group', label: 'Grupa', options: [
          { id: 'nm', title: 'Niemęskoosobowe', hint: 'rzeczy, zwierzęta, kobiety' },
          { id: 'mo', title: 'Męskoosobowe', hint: 'mężczyźni, mieszkańcy miast' },
          { id: 'nar', title: 'Narodowości', hint: 'Polacy, Niemcy, Włosi', only: { pos: ['rz'] } },
          { id: 'mix', title: 'Mix', hint: 'wszystko razem' },
        ] },
      ],
      tests: {
        'rz.mian.nm': 'liczba-mnoga-rz-mian-nm',
        'rz.mian.mo': 'liczba-mnoga-rz-mian-mo',
        'rz.mian.nar': 'liczba-mnoga-rz-mian-nar',
        'rz.mian.mix': 'liczba-mnoga-rz-mian-mix',
        'rz.dop.nm': 'liczba-mnoga-rz-dop-nm',
        'rz.dop.mo': 'liczba-mnoga-rz-dop-mo',
        'rz.dop.nar': 'liczba-mnoga-rz-dop-nar',
        'rz.dop.mix': 'liczba-mnoga-rz-dop-mix',
        'przym.mian.nm': 'liczba-mnoga-przym-mian-nm',
        'przym.mian.mo': 'liczba-mnoga-przym-mian-mo',
        'przym.mian.mix': 'liczba-mnoga-przym-mian-mix',
        'przym.dop.nm': 'liczba-mnoga-przym-dop-nm',
        'przym.dop.mo': 'liczba-mnoga-przym-dop-mo',
        'przym.dop.mix': 'liczba-mnoga-przym-dop-mix',
      },
    },

    items: [
      'rz-mian-nm', 'rz-mian-mo', 'rz-mian-nar', 'rz-mian-mix',
      'rz-dop-nm', 'rz-dop-mo', 'rz-dop-nar', 'rz-dop-mix',
      'przym-mian-nm', 'przym-mian-mo', 'przym-mian-mix',
      'przym-dop-nm', 'przym-dop-mo', 'przym-dop-mix',
    ].map(function (m) { return { id: 'liczba-mnoga-' + m, files: LICZBA_MNOGA_FILES }; }),
  },
];
