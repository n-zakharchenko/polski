/*
 * Дерево разделов и тестов — в этом порядке они идут на страницах.
 *
 * Раздел: { id, title, desc?, icon?, items: [ … ] }   — метаданные тут, логики нет; разделы вкладываются
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

Polski.manifest = [
  {
    id: 'liczebniki',
    title: 'Liczebniki',
    desc: 'Liczby po polsku',
    icon: '123',
    items: [
      {
        id: 'liczebniki-nm',
        title: 'Niemęskoosobowe',
        desc: 'dwa koty, pięć kobiet',
        icon: 'NM',
        items: [
          { id: 'liczebniki-niemeskoosobowe',     files: NIEMESKOOSOBOWE_FILES }, // Rzeczownik + czasownik
          { id: 'liczebniki-niemeskoosobowe-num', files: NIEMESKOOSOBOWE_FILES }, // Liczebnik
          { id: 'liczebniki-niemeskoosobowe-mix', files: NIEMESKOOSOBOWE_FILES }, // Mix
        ],
      },
      {
        id: 'liczebniki-mo',
        title: 'Męskoosobowe',
        desc: 'dwaj studenci, pięciu studentów',
        icon: 'MO',
        items: [
          { id: 'liczebniki-meskoosobowe',     files: MESKOOSOBOWE_FILES },
          { id: 'liczebniki-meskoosobowe-num', files: MESKOOSOBOWE_FILES },
          { id: 'liczebniki-meskoosobowe-mix', files: MESKOOSOBOWE_FILES },
        ],
      },
      {
        id: 'liczebniki-mx',
        title: 'Mieszane',
        icon: '⇄',
        items: [
          { id: 'liczebniki-mix',     files: MIX_FILES },
          { id: 'liczebniki-mix-num', files: MIX_FILES },
          { id: 'liczebniki-mix-mix', files: MIX_FILES },
        ],
      },
    ],
  },
];
