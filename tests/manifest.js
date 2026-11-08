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
  'imieslowy/test.js',
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

    // тот же экран выбора, что у Liczebników; задания «Czynny czy bierny?» — только в Mix
    chooser: {
      axes: [
        { key: 'kind', label: 'Imiesłowy', options: [
          { id: 'cz', title: 'Czynne', hint: 'czytający, czytająca, czytające' },
          { id: 'bi', title: 'Bierne', hint: 'czytany, zrobiony, umyty' },
          { id: 'mix', title: 'Mix', hint: 'czynne i bierne razem + „czynny czy bierny?”' },
        ] },
        { key: 'mode', label: 'Co ćwiczyć', options: [
          { id: 'a', title: 'Przekształć', hint: 'kobieta, która czyta → kobieta czytająca' },
          { id: 'b', title: 'Uzupełnij', hint: 'ciasto … (upiec) → ciasto upieczone' },
          { id: 'ab', title: 'Wszystko', hint: 'oba rodzaje zadań' },
        ] },
      ],
      tests: {
        'cz.a': 'imieslowy-cz-a', 'cz.b': 'imieslowy-cz-b', 'cz.ab': 'imieslowy-cz-ab',
        'bi.a': 'imieslowy-bi-a', 'bi.b': 'imieslowy-bi-b', 'bi.ab': 'imieslowy-bi-ab',
        'mix.a': 'imieslowy-mix-a', 'mix.b': 'imieslowy-mix-b', 'mix.ab': 'imieslowy-mix-ab',
      },
    },

    items: [
      { id: 'imieslowy-cz-a', files: IMIESLOWY_FILES },
      { id: 'imieslowy-cz-b', files: IMIESLOWY_FILES },
      { id: 'imieslowy-cz-ab', files: IMIESLOWY_FILES },
      { id: 'imieslowy-bi-a', files: IMIESLOWY_FILES },
      { id: 'imieslowy-bi-b', files: IMIESLOWY_FILES },
      { id: 'imieslowy-bi-ab', files: IMIESLOWY_FILES },
      { id: 'imieslowy-mix-a', files: IMIESLOWY_FILES },
      { id: 'imieslowy-mix-b', files: IMIESLOWY_FILES },
      { id: 'imieslowy-mix-ab', files: IMIESLOWY_FILES },
    ],
  },
];
