/*
 * Polski — прогресс пользователя в Firestore.
 *   users/{uid} = { points, dist, tests, perfect, updatedAt }   (без e-mail)
 *     points — счёт (все очки), dist — пробег малюха (за тест — не дальше следующего города).
 *     В старых записях dist нет — тогда пробег = points.
 *   + статистика для главной (core/stats.js), всё — за тесты после её появления:
 *     answered, correct   — ответов всего / верных (точность)
 *     bestStreak          — лучшая серия верных подряд
 *     seconds             — время на заданиях (на одно — не больше balance.taskSecondsMax)
 *     day, dayStreak, bestDayStreak — последний день с тестом (ГГГГ-ММ-ДД, местное время) и серия дней подряд
 *     week = { 'ГГГГ-ММ-ДД': тестов }  — последние WEEK_DAYS дней (старые ключи удаляем)
 *     lastTest, byTest = { <id теста>: { t: название, n: прохождений, err: ошибок, last: [% последних LAST_N] } }
 *     today = { d: 'ГГГГ-ММ-ДД', t: тестов, p: очков, a: ответов, c: верных, s: секунд, pf: без ошибок,
 *               d0: пробег на начало дня } — итоги за сегодня (переключатель «Dziś / Cały czas» в статистике)
 *   Снимок последних данных — в localStorage (peek / forget), чтобы главная рисовалась сразу.
 * Пишем один раз — в конце теста. Прирост за запись ограничен правилами (firestore.rules).
 *
 *   Polski.progress.load()                 — Promise<данные | null> (null — не вошли); см. normalize()
 *   Polski.progress.addResult(r)           — r = { points, perfect, testId, title, answered, correct, bestStreak, seconds }
 *                                            → Promise<{ before, after, distBefore, distAfter } | null>
 *   Polski.progress.mountSummary(box, r)   — блок на итоге теста: сохранить очки или предложить вход
 *   Polski.progress.dayKey(date), dayStreakNow(data, date) — помощники для статистики
 */
(function () {
  'use strict';

  var RETRY_MS = 11000; // правила Firestore: запись не чаще раза в 10 с — повтор чуть позже
  var WEEK_DAYS = 14;   // сколько дней храним в week (статистика «Ten tydzień»)
  var LAST_N = 3;       // сколько последних результатов теста храним («Do poprawy»)

  function acc() { return window.PolskiAccount; }
  function fmt(n) { return Math.round(n).toLocaleString('pl-PL'); }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
  function shiftDay(date, days) { var d = new Date(date.getTime()); d.setDate(d.getDate() + days); return d; }

  function normalize(d) {
    d = d || {};
    var points = d.points || 0;
    return {
      points: points, dist: d.dist != null ? d.dist : points, tests: d.tests || 0, perfect: d.perfect || 0,
      answered: d.answered || 0, correct: d.correct || 0, bestStreak: d.bestStreak || 0, seconds: d.seconds || 0,
      day: d.day || '', dayStreak: d.dayStreak || 0, bestDayStreak: d.bestDayStreak || 0,
      week: d.week || {}, byTest: d.byTest || {},
      today: d.today || null,
    };
  }

  /* ---------- снимок статистики в браузере ----------
   * Чтобы карта и «Twoje statystyki» на главной рисовались сразу, не дожидаясь входа и Firestore (1–3 с),
   * последние данные пользователя лежат в localStorage 'polski.progress.snap' = { uid, data }.
   * Пишем при каждом чтении из Firestore и сразу после записи результата теста (данные «после» считаем сами).
   * Стираем при выходе из аккаунта (forget). Это та же статистика, что видит сам пользователь, — на его устройстве. */
  var SNAP_KEY = 'polski.progress.snap';

  function saveSnap(uid, data) {
    try { window.localStorage.setItem(SNAP_KEY, JSON.stringify({ uid: uid, data: data })); } catch (e) { /* не страшно */ }
  }
  /** снимок, если в этом браузере уже входили: { uid, data } или null */
  function peek() {
    try {
      if (window.localStorage.getItem('polski.account') !== '1') return null;
      var s = JSON.parse(window.localStorage.getItem(SNAP_KEY));
      return s && s.uid && s.data ? { uid: s.uid, data: normalize(s.data) } : null;
    } catch (e) { return null; }
  }
  function forget() {
    try { window.localStorage.removeItem(SNAP_KEY); } catch (e) { /* ничего */ }
  }

  // для подсчёта данных «после» теста локально: те же statsUpdate(), но вместо команд Firestore — метки
  var LOCAL_F = {
    increment: function (n) { return { __inc: n }; },
    deleteField: function () { return { __del: true }; },
  };
  /** применить запись (как её отправляем в Firestore с merge) к данным c — получить данные после неё */
  function applyLocal(c, doc) {
    var out = JSON.parse(JSON.stringify(c));
    Object.keys(doc).forEach(function (k) {
      var v = doc[k];
      if (k === 'updatedAt') return;
      if (v && v.__inc != null) out[k] = (out[k] || 0) + v.__inc;
      else if (k === 'week' || k === 'byTest') { // merge по ключам, как setDoc(..., { merge: true })
        out[k] = out[k] || {};
        Object.keys(v).forEach(function (kk) { if (v[kk] && v[kk].__del) delete out[k][kk]; else out[k][kk] = v[kk]; });
      } else out[k] = v;
    });
    return out;
  }

  /** серия дней на сегодня: последний тест сегодня или вчера — серия жива, иначе 0 */
  function dayStreakNow(c, date) {
    date = date || new Date();
    return c.day === dayKey(date) || c.day === dayKey(shiftDay(date, -1)) ? c.dayStreak : 0;
  }

  // один запрос на страницу: карта и статистика на главной читают одно и то же; запись сбрасывает
  var cache = null;

  function load() {
    var a = acc();
    if (!a) return Promise.resolve(null);
    return a.ready().then(function (u) {
      if (!u) return null;
      if (cache && cache.uid === u.uid) return cache.promise;
      var p = a.firestore().then(function (st) {
        return st.F.getDoc(st.F.doc(st.db, 'users', u.uid));
      }).then(function (snap) {
        var data = normalize(snap.exists() ? snap.data() : {});
        saveSnap(u.uid, data);
        return data;
      });
      cache = { uid: u.uid, promise: p };
      p.catch(function () { cache = null; });
      return p;
    });
  }

  /** новые поля статистики по прежним данным c и результату теста r (без очков и пробега) */
  function statsUpdate(c, r, now, F) {
    var today = dayKey(now), yesterday = dayKey(shiftDay(now, -1));
    var dayStreak = c.day === today ? Math.max(1, c.dayStreak) : c.day === yesterday ? c.dayStreak + 1 : 1;
    var answered = Math.max(0, r.answered || 0);
    var correct = Math.min(answered, Math.max(0, r.correct || 0));

    var week = {};
    week[today] = (c.week[today] || 0) + 1;
    var oldest = dayKey(shiftDay(now, -(WEEK_DAYS - 1)));
    Object.keys(c.week).forEach(function (k) { if (k < oldest) week[k] = F.deleteField(); });

    // итоги за сегодня (переключатель «Dziś / Cały czas»): d0 — пробег на начало дня (км, топливо, города за день)
    var t = c.today && c.today.d === today ? c.today : { d: today, t: 0, p: 0, a: 0, c: 0, s: 0, pf: 0, d0: c.dist };
    var todayOut = {
      d: today, t: t.t + 1, p: t.p + Math.round(Math.max(0, r.points || 0)), a: t.a + answered, c: t.c + correct,
      s: t.s + Math.min(3600, Math.max(0, Math.round(r.seconds || 0))), pf: t.pf + (r.perfect ? 1 : 0), d0: t.d0,
    };

    var out = {
      today: todayOut,
      answered: F.increment(answered),
      correct: F.increment(correct),
      bestStreak: Math.max(c.bestStreak, Math.min(r.bestStreak || 0, correct)),
      seconds: F.increment(Math.min(3600, Math.max(0, Math.round(r.seconds || 0)))),
      day: today,
      dayStreak: dayStreak,
      bestDayStreak: Math.max(c.bestDayStreak, dayStreak),
      week: week,
    };
    if (r.testId) {
      var id = String(r.testId).slice(0, 100);
      var prev = c.byTest[id] || {};
      var pct = answered ? Math.round((correct / answered) * 100) : 0;
      var entry = {};
      entry[id] = {
        t: String(r.title || id).slice(0, 120),
        n: (prev.n || 0) + 1,
        err: (prev.err || 0) + (answered - correct),
        last: (prev.last || []).concat([pct]).slice(-LAST_N),
      };
      out.lastTest = id;
      out.byTest = entry;
    }
    return out;
  }

  function addResult(r) {
    var a = acc();
    if (!a) return Promise.resolve(null);
    return a.ready().then(function (u) {
      if (!u) return null;
      var before = 0, distBefore = 0, distAfter = 0, c = null, now = new Date();
      return load().then(function (data) {
        c = data || normalize({});
        before = c.points;
        distBefore = c.dist;
        distAfter = Polski.journey ? Polski.journey.advance(distBefore, r.points) : distBefore + r.points;
        return a.firestore();
      }).then(function (st) {
        var F = st.F;
        var doc = {
          points: F.increment(r.points),
          dist: Math.round(distAfter),
          tests: F.increment(1),
          perfect: F.increment(r.perfect ? 1 : 0),
          updatedAt: F.serverTimestamp(),
        };
        var s = statsUpdate(c, r, now, F);
        Object.keys(s).forEach(function (k) { doc[k] = s[k]; });
        return F.setDoc(F.doc(st.db, 'users', u.uid), doc, { merge: true });
      }).then(function () {
        cache = null;
        // данные «после» — в снимок, чтобы главная сразу показала новую статистику и поехала малюхом
        var local = { points: LOCAL_F.increment(r.points), dist: Math.round(distAfter), tests: LOCAL_F.increment(1),
          perfect: LOCAL_F.increment(r.perfect ? 1 : 0) };
        var ls = statsUpdate(c, r, now, LOCAL_F);
        Object.keys(ls).forEach(function (k) { local[k] = ls[k]; });
        saveSnap(u.uid, normalize(applyLocal(c, local)));
        return { before: before, after: before + r.points, distBefore: distBefore, distAfter: distAfter };
      });
    });
  }

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c != null) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  /** r = { points, bonus, perfect } */
  function mountSummary(box, r) {
    var a = acc();
    if (!a || !a.supported) return;
    var line = h('div', { class: 'summary-points' });
    var login = h('div');
    // кнопка внизу: вошёл — «Zobacz mapę» (к карте на главной), не вошёл — «Na główną»
    var go = h('div', { class: 'summary-go' });
    function setGo(user) {
      go.replaceChildren(h('a', {
        class: 'btn btn-secondary btn-wide', href: user ? 'index.html#journey' : 'index.html',
        text: user ? 'Zobacz mapę' : 'Na główną',
      }));
    }
    box.replaceChildren(line, login, go);
    box.hidden = false;
    var state = 'idle'; // idle | saving | saved

    function saved(res) {
      state = 'saved';
      var J = Polski.journey;
      var loc = J ? J.locate(res.distAfter) : null;
      var was = J ? J.locate(res.distBefore) : null;
      // доехал до нового города: пробег упёрся ровно в начало следующего отрезка
      var arrived = loc && was && !was.done && (loc.done || loc.seg.index > was.seg.index);
      var capped = arrived && res.distAfter - res.distBefore < r.points;
      // replaceChildren печатает null строкой «null» — пустые элементы отбрасываем
      line.replaceChildren.apply(line, [
        h('p', { class: 'pts-total' }, [Polski.fuelIcon(), ' ', h('strong', { text: '+' + fmt(r.points) + ' pkt' })]),
        r.bonus ? h('p', { class: 'pts-sub', text: 'w tym +' + fmt(r.bonus) + ' za test bez błędów' }) : null,
        arrived ? h('p', { class: 'pts-city' }, loc.done
          ? ['🎉 Meta: ', h('strong', { text: was.seg.to.name }), '! Cała Polska objechana.']
          : ['🏁 Nowe miasto: ', h('strong', { text: was.seg.to.name }), '!']) : null,
        capped && !loc.done ? h('p', { class: 'pts-sub', text: 'Maluch czeka tu na kolejny test — jedno miasto na test.' }) : null,
        loc && !arrived ? h('p', { class: 'pts-sub' }, loc.done
          ? ['Podróż ukończona! 🎉']
          : ['Następny przystanek: ', h('strong', { text: loc.seg.to.name }), ' · zostało ' + fmt(loc.left) + ' pkt']) : null,
      ].filter(Boolean));

      // доехал до города — поп-ап «чем знаменит» (один раз на город; финиш — «Meta!»)
      if (arrived && J.showCity) {
        var u = acc() && acc().user();
        setTimeout(function () {
          if (box.isConnected) J.showCity(was.seg.to.name, u && u.uid, { finish: loc.done });
        }, 500);
      }
    }

    var retried = false;

    function save() {
      if (state !== 'idle') return;
      state = 'saving';
      line.replaceChildren(h('p', { class: 'pts-sub', text: 'Zapisywanie punktów…' }));
      Polski.progress.addResult(r).then(function (res) {
        if (res) saved(res);
        else { state = 'idle'; line.replaceChildren(); }
      }, function (e) {
        // правила пускают запись не чаще раза в 10 с: очень быстрый тест — подождём и повторим один раз сами
        if (e && e.code === 'permission-denied' && !retried) {
          retried = true;
          line.replaceChildren(h('p', { class: 'pts-sub', text: 'Zapisywanie punktów… (chwilka, za szybko!)' }));
          setTimeout(function () { state = 'idle'; if (box.isConnected) save(); }, RETRY_MS);
          return;
        }
        state = 'idle';
        line.replaceChildren(
          h('p', { class: 'account-error', text: 'Nie udało się zapisać punktów' + (e && e.code ? ' (' + e.code + ')' : '') + '.' }),
          h('button', { class: 'btn btn-sm btn-secondary', type: 'button', text: 'Spróbuj ponownie', onclick: save })
        );
      });
    }

    a.ready().then(function (u) {
      setGo(u);
      if (u) { save(); return; }
      a.mountLogin(login, r.points > 0
        ? 'Zaloguj się, żeby zapisać +' + fmt(r.points) + ' pkt i ruszyć maluchem w podróż po Polsce.'
        : null);
      // вошёл прямо на итоге — сохраняем этот тест
      a.onChange(function (user) {
        if (!box.isConnected) return;
        setGo(user);
        if (user) save();
      });
    });
  }

  window.Polski = window.Polski || {};
  Polski.progress = {
    load: load, addResult: addResult, mountSummary: mountSummary,
    dayKey: dayKey, dayStreakNow: dayStreakNow,
    peek: peek, forget: forget, // снимок статистики в браузере (сразу рисовать главную)
    _statsUpdate: statsUpdate, _normalize: normalize, _applyLocal: applyLocal, LOCAL_F: LOCAL_F, // для проверок
  };
})();
