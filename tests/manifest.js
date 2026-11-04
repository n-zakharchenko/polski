/*
 * Дерево разделов и тестов — в этом порядке они идут на страницах.
 *
 * Раздел: { id, title, desc?, icon?, items: [ … ] }   — метаданные тут, логики нет
 * Тест:   { id, files: [ … ] }                        — метаданные в самом бандле (Polski.register)
 *
 * files — пути относительно tests/, в порядке загрузки
 * (общие данные и бандлы, от которых тест зависит, — раньше него).
 */
Polski.manifest = [
  {
    id: 'liczebniki',
    title: 'Liczebniki',
    desc: 'Liczby po polsku',
    icon: '123',
    items: [
      { id: 'liczebniki-niemeskoosobowe', files: ['liczebniki/niemeskoosobowe/test.js'] },
      { id: 'liczebniki-meskoosobowe',    files: ['liczebniki/meskoosobowe/test.js'] },
      { id: 'liczebniki-mix',             files: ['liczebniki/mix/test.js'] },
    ],
  },
];
