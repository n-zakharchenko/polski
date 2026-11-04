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

  /** 'pies, psy, psów | leżeć, leży, leżą | na trawie' → объект с формами */
  function parseEntry(line) {
    var parts = line.split('|').map(function (s) { return s.trim(); });
    var noun = parts[0].split(',').map(function (s) { return s.trim(); });
    var verb = parts[1].split(',').map(function (s) { return s.trim(); });
    return {
      sg: noun[0], nomPl: noun[1], genPl: noun[2],
      inf: verb[0], v3sg: verb[1], v3pl: verb[2],
      rest: parts[2],
    };
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  Polski.liczebniki = {
    groupOf: groupOf,
    randomNumber: randomNumber,
    parseEntry: parseEntry,
    capitalize: capitalize,
  };
})();
