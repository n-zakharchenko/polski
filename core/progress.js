/*
 * Polski — прогресс пользователя в Firestore.
 *   users/{uid} = { points, dist, tests, perfect, updatedAt }   (без e-mail)
 *     points — счёт (все очки), dist — пробег малюха (за тест — не дальше следующего города).
 *     В старых записях dist нет — тогда пробег = points.
 * Пишем один раз — в конце теста. Прирост за запись ограничен правилами (firestore.rules).
 *
 *   Polski.progress.load()                 — Promise<{ points, dist, tests, perfect } | null> (null — не вошли)
 *   Polski.progress.addResult(r)           — r = { points, perfect } → Promise<{ before, after, distBefore, distAfter } | null>
 *   Polski.progress.mountSummary(box, r)   — блок на итоге теста: сохранить очки или предложить вход
 */
(function () {
  'use strict';

  var RETRY_MS = 11000; // правила Firestore: запись не чаще раза в 10 с — повтор чуть позже

  function acc() { return window.PolskiAccount; }
  function fmt(n) { return Math.round(n).toLocaleString('pl-PL'); }

  function load() {
    var a = acc();
    if (!a) return Promise.resolve(null);
    return a.ready().then(function (u) {
      if (!u) return null;
      return a.firestore().then(function (st) {
        return st.F.getDoc(st.F.doc(st.db, 'users', u.uid));
      }).then(function (snap) {
        var d = snap.exists() ? snap.data() : {};
        var points = d.points || 0;
        return { points: points, dist: d.dist != null ? d.dist : points, tests: d.tests || 0, perfect: d.perfect || 0 };
      });
    });
  }

  function addResult(r) {
    var a = acc();
    if (!a) return Promise.resolve(null);
    return a.ready().then(function (u) {
      if (!u) return null;
      var before = 0, distBefore = 0, distAfter = 0;
      return load().then(function (c) {
        before = c ? c.points : 0;
        distBefore = c ? c.dist : 0;
        distAfter = Polski.journey ? Polski.journey.advance(distBefore, r.points) : distBefore + r.points;
        return a.firestore();
      }).then(function (st) {
        var F = st.F;
        return F.setDoc(F.doc(st.db, 'users', u.uid), {
          points: F.increment(r.points),
          dist: Math.round(distAfter),
          tests: F.increment(1),
          perfect: F.increment(r.perfect ? 1 : 0),
          updatedAt: F.serverTimestamp(),
        }, { merge: true });
      }).then(function () {
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
    box.replaceChildren(line, login);
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
        h('p', { class: 'pts-total' }, ['⭐ ', h('strong', { text: '+' + fmt(r.points) + ' pkt' })]),
        r.bonus ? h('p', { class: 'pts-sub', text: 'w tym +' + fmt(r.bonus) + ' za test bez błędów' }) : null,
        arrived ? h('p', { class: 'pts-city' }, loc.done
          ? ['🎉 Meta: ', h('strong', { text: was.seg.to.name }), '! Cała Polska objechana.']
          : ['🏁 Nowe miasto: ', h('strong', { text: was.seg.to.name }), '!']) : null,
        capped && !loc.done ? h('p', { class: 'pts-sub', text: 'Maluch czeka tu na kolejny test — jedno miasto na test.' }) : null,
        loc && !arrived ? h('p', { class: 'pts-sub' }, loc.done
          ? ['Podróż ukończona! 🎉']
          : ['Następny przystanek: ', h('strong', { text: loc.seg.to.name }), ' · zostało ' + fmt(loc.left) + ' pkt']) : null,
        h('a', { class: 'pts-map', href: 'index.html', text: 'Zobacz mapę →' }),
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
      if (u) { save(); return; }
      a.mountLogin(login, r.points > 0
        ? 'Zaloguj się, żeby zapisać +' + fmt(r.points) + ' pkt i ruszyć maluchem w podróż po Polsce.'
        : null);
      // вошёл прямо на итоге — сохраняем этот тест
      a.onChange(function (user) { if (user && box.isConnected) save(); });
    });
  }

  window.Polski = window.Polski || {};
  Polski.progress = { load: load, addResult: addResult, mountSummary: mountSummary };
})();
