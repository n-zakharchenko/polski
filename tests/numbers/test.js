/*
 * Liczebniki — ВРЕМЕННОЕ ДЕМО, чтобы проверить движок.
 * Настоящая логика будет по описанию; пока числа 0–10 и два вида заданий.
 */
(function () {
  'use strict';

  var WORDS = [
    'zero', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć',
    'sześć', 'siedem', 'osiem', 'dziewięć', 'dziesięć',
  ];

  function range(from, to) {
    var r = [];
    for (var i = from; i <= to; i++) r.push(i);
    return r;
  }

  Polski.register({
    id: 'numbers',
    title: 'Liczebniki',
    desc: 'Liczby po polsku',
    icon: '123',
    rounds: 10,

    generate: function (rng) {
      var n = rng.int(0, 10);

      if (rng.chance(0.5)) {
        return {
          type: 'input',
          question: 'Napisz słownie:',
          prompt: String(n),
          answer: WORDS[n],
        };
      }

      var others = rng.sample(range(0, 10).filter(function (x) { return x !== n; }), 3);
      return {
        type: 'choice',
        question: 'Wybierz poprawne słowo:',
        prompt: String(n),
        options: rng.shuffle([n].concat(others)).map(function (x) { return WORDS[x]; }),
        answer: WORDS[n],
      };
    },
  });
})();
