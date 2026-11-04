/*
 * Дерево разделов и тестов — в этом порядке они идут на страницах.
 *
 * Раздел: { id, title, desc?, icon?, items: [ … ] }   — метаданные тут, логики нет
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

Polski.manifest = [
  {
    id: 'liczebniki',
    title: 'Liczebniki',
    desc: 'Liczby po polsku',
    icon: '123',
    items: [
      { id: 'liczebniki-niemeskoosobowe',     files: NIEMESKOOSOBOWE_FILES },
      { id: 'liczebniki-niemeskoosobowe-num', files: NIEMESKOOSOBOWE_FILES }, // режим «+ liczebnik»
      { id: 'liczebniki-meskoosobowe',        files: MESKOOSOBOWE_FILES },
      { id: 'liczebniki-meskoosobowe-num',    files: MESKOOSOBOWE_FILES },    // режим «+ liczebnik»
      { id: 'liczebniki-mix',                 files: ['liczebniki/mix/test.js'] },
    ],
  },
];
