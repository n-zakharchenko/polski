/*
 * Polski — БАЛАНС: очки за ответы и стоимость отрезков маршрута.
 * Все числа игры — здесь. Меняем CONFIG — меняется вся экономика; остальной код только вызывает функции ниже.
 *
 * Очки (pkt):
 *   верное задание («Dokładnie!»)          — perTask × множитель серии
 *   «Prawie!» / «O kurde!»                  — 0, серия обнуляется (очки не отнимаются)
 *   серия: N верных подряд, включая текущий — множитель из streak (берётся наибольший порог ≤ N)
 *   тест без ошибок                         — + perfectBonus
 *
 * Отрезки маршрута: тип 1 / 2 / 3 (короткий / средний / длинный) → segmentCost.
 *   Тип задаётся в маршруте явно (tier) или считается по расстоянию по прямой (tierKm).
 *   Малюх едет непрерывно: набранные очки = пробег по маршруту.
 */
(function () {
  'use strict';

  var CONFIG = {
    perTask: 100,
    streak: [            // { from: сколько верных подряд, mult: множитель }
      { from: 3, mult: 1.5 },
      { from: 6, mult: 2 },
      { from: 10, mult: 3 },
    ],
    perfectBonus: 1000,
    segmentCost: { 1: 800, 2: 1200, 3: 1600 }, // «один нормальный тест ≈ один город» (12/15 ≈ 1500–1800 pkt)
    tierKm: [40, 60],    // по прямой: ≤ 40 км — тип 1, ≤ 60 — тип 2, дальше — тип 3 (на маршруте ~поровну)
  };

  /** множитель для серии из n верных подряд */
  function multiplier(n) {
    var m = 1;
    CONFIG.streak.forEach(function (s) { if (n >= s.from) m = s.mult; });
    return m;
  }

  /** очки за верное задание; n — длина серии вместе с этим ответом */
  function taskPoints(n) {
    return Math.round(CONFIG.perTask * multiplier(n));
  }

  /** бонус за весь тест */
  function testBonus(correct, rounds) {
    return correct === rounds ? CONFIG.perfectBonus : 0;
  }

  /** тип отрезка по расстоянию по прямой, км */
  function tierOf(km) {
    if (km <= CONFIG.tierKm[0]) return 1;
    if (km <= CONFIG.tierKm[1]) return 2;
    return 3;
  }

  function segmentCost(tier) {
    return CONFIG.segmentCost[tier];
  }

  /** максимум очков за тест из rounds заданий (для проверки правил Firestore) */
  function maxForTest(rounds) {
    var sum = 0;
    for (var n = 1; n <= rounds; n++) sum += taskPoints(n);
    return sum + CONFIG.perfectBonus;
  }

  window.Polski = window.Polski || {};
  Polski.balance = {
    config: CONFIG,
    multiplier: multiplier,
    taskPoints: taskPoints,
    testBonus: testBonus,
    tierOf: tierOf,
    segmentCost: segmentCost,
    maxForTest: maxForTest,
  };
})();
