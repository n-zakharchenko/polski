/*
 * Polski — прогресс пользователя в Firestore.
 *   users/{uid} = { points, tests, perfect, updatedAt }   (без e-mail)
 * Пишем один раз — в конце теста. Прирост за запись ограничен правилами (firestore.rules).
 *
 *   Polski.progress.load()                 — Promise<{ points, tests, perfect } | null> (null — не вошли)
 *   Polski.progress.addResult(r)           — r = { points, perfect } → Promise<{ before, after } | null>
 *   Polski.progress.mountSummary(box, r)   — блок на итоге теста: сохранить очки или предложить вход
 */
(function () {
  'use strict';

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
        return { points: d.points || 0, tests: d.tests || 0, perfect: d.perfect || 0 };
      });
    });
  }

  function addResult(r) {
    var a = acc();
    if (!a) return Promise.resolve(null);
    return a.ready().then(function (u) {
      if (!u) return null;
      var before = 0;
      return load().then(function (c) {
        before = c ? c.points : 0;
        return a.firestore();
      }).then(function (st) {
        var F = st.F;
        return F.setDoc(F.doc(st.db, 'users', u.uid), {
          points: F.increment(r.points),
          tests: F.increment(1),
          perfect: F.increment(r.perfect ? 1 : 0),
          updatedAt: F.serverTimestamp(),
        }, { merge: true });
      }).then(function () {
        return { before: before, after: before + r.points };
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
      var loc = Polski.journey ? Polski.journey.locate(res.after) : null;
      // replaceChildren печатает null строкой «null» — пустые элементы отбрасываем
      line.replaceChildren.apply(line, [
        h('p', { class: 'pts-total' }, ['⭐ ', h('strong', { text: '+' + fmt(r.points) + ' pkt' })]),
        r.bonus ? h('p', { class: 'pts-sub', text: 'w tym +' + fmt(r.bonus) + ' za test bez błędów' }) : null,
        loc ? h('p', { class: 'pts-sub' }, loc.done
          ? ['Podróż ukończona! 🎉']
          : ['Następny przystanek: ', h('strong', { text: loc.seg.to.name }), ' · zostało ' + fmt(loc.left) + ' pkt']) : null,
        h('a', { class: 'pts-map', href: 'index.html', text: 'Zobacz mapę →' }),
      ].filter(Boolean));
    }

    function save() {
      if (state !== 'idle') return;
      state = 'saving';
      line.replaceChildren(h('p', { class: 'pts-sub', text: 'Zapisywanie punktów…' }));
      Polski.progress.addResult(r).then(function (res) {
        if (res) saved(res);
        else { state = 'idle'; line.replaceChildren(); }
      }, function (e) {
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
