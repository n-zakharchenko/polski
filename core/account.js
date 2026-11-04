/*
 * Polski — konto: вход через Google (Firebase Authentication).
 *
 * Без входа Firebase не загружается вовсе — ни одного запроса к Google.
 * SDK подгружается:
 *   - когда открыто окно настроек или итог теста — заранее, чтобы окно входа Google
 *     открылось прямо по клику (иначе браузер блокирует popup);
 *   - сразу при загрузке страницы, если в этом браузере уже входили (флаг polski.account).
 *
 * Конфиг ниже публичный по замыслу Firebase (он всегда виден в коде веб-приложения);
 * чужие данные защищают правила Firestore — см. firestore.rules.
 *
 * Для модулей данных:
 *   PolskiAccount.user()               — текущий пользователь Firebase или null
 *   PolskiAccount.ready()              — Promise<user | null>: дождаться, если вход в этом браузере был
 *   PolskiAccount.firestore()          — Promise<{ F, db } | null>: Firestore Lite (F — модуль SDK)
 *   PolskiAccount.onChange(fn)         — подписка на вход/выход
 *   PolskiAccount.onBeforeDelete(fn)   — fn(user) → Promise: удалить свои данные перед удалением аккаунта
 *   PolskiAccount.mountLogin(box, lead) — блок «текст + Zaloguj przez Google»; после входа скрывается
 *
 * «Usuń konto» всегда удаляет документ users/{uid} (очки и т. п.) — на любой странице с этим файлом.
 */
(function () {
  'use strict';

  var CONFIG = {
    apiKey: 'AIzaSyA6K643jjfEKqzJMB_D8EftdkcrkjkyJsw',
    authDomain: 'polski-3f3c1.firebaseapp.com',
    projectId: 'polski-3f3c1',
    storageBucket: 'polski-3f3c1.firebasestorage.app',
    messagingSenderId: '86027075093',
    appId: '1:86027075093:web:7fa5134d1a3f5943fdd81c',
  };
  var SDK = 'https://www.gstatic.com/firebasejs/13.1.0/';
  var FLAG = 'polski.account'; // '1' — в этом браузере есть вход
  var LEAD = 'Zaloguj się, żeby zapisywać wyniki i śledzić postępy.';

  // с file:// вход через Google не работает
  var supported = location.protocol === 'https:' || location.protocol === 'http:';

  var fb = null;          // { app, auth, A } — после загрузки SDK
  var store = null;       // Promise<{ F, db }> — Firestore Lite
  var loading = null;     // Promise загрузки
  var loadFailed = false;
  var user = null;
  var known = false;      // Firebase уже сообщил, вошёл ли пользователь
  var busy = false;       // идёт вход / выход / удаление
  var confirmDelete = false;
  var error = '';
  var listeners = [];
  var views = [];         // смонтированные блоки: { box, kind }
  var beforeDelete = [];

  /* ---------- флаг ---------- */

  function readFlag() {
    try { return window.localStorage.getItem(FLAG) === '1'; } catch (e) { return false; }
  }
  function writeFlag(on) {
    try {
      if (on) window.localStorage.setItem(FLAG, '1');
      else window.localStorage.removeItem(FLAG);
    } catch (e) { /* без хранилища просто не восстановим вход сам */ }
  }

  /* ---------- состояние ---------- */

  function emit() {
    views = views.filter(function (v) { return v.box.isConnected; });
    views.forEach(render);
    listeners.forEach(function (fn) { try { fn(user); } catch (e) { /* чужая ошибка */ } });
  }

  function message(e) {
    var code = (e && e.code) || '';
    switch (code) {
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
      case 'auth/user-cancelled':
        return '';
      case 'auth/popup-blocked':
        return 'Przeglądarka zablokowała okno logowania. Zezwól na wyskakujące okna i spróbuj jeszcze raz.';
      case 'auth/network-request-failed':
        return 'Brak połączenia z internetem.';
      case 'auth/unauthorized-domain':
        return 'Ta strona nie jest dodana do dozwolonych domen w Firebase.';
      case 'auth/operation-not-allowed':
        return 'Logowanie przez Google nie jest włączone w Firebase.';
      case 'auth/user-mismatch':
        return 'Wybrano inne konto Google niż to, na którym jesteś zalogowany.';
      default:
        return 'Coś poszło nie tak' + (code ? ' (' + code + ')' : '') + '. Spróbuj jeszcze raz.';
    }
  }

  /* ---------- Firebase ---------- */

  // → Promise<fb | null>; null — не загрузилось (ошибка уже показана в блоке)
  function prepare() {
    if (!supported) return Promise.resolve(null);
    if (loading) return loading;
    loadFailed = false;
    error = '';
    loading = Promise.all([
      import(SDK + 'firebase-app.js'),
      import(SDK + 'firebase-auth.js'),
    ]).then(function (m) {
      var app = m[0].initializeApp(CONFIG);
      var auth = m[1].getAuth(app);
      return new Promise(function (resolve) {
        m[1].onAuthStateChanged(auth, function (u) {
          user = u;
          known = true;
          writeFlag(!!u);
          if (!u) confirmDelete = false;
          if (!fb) { fb = { app: app, auth: auth, A: m[1] }; resolve(fb); }
          emit();
        });
      });
    }).catch(function () {
      loading = null;
      loadFailed = true;
      error = 'Nie udało się załadować logowania. Sprawdź połączenie.';
      emit();
      return null;
    });
    emit();
    return loading;
  }

  /** Promise<user | null>; Firebase грузим, только если вход в этом браузере уже был */
  function ready() {
    if (fb) return Promise.resolve(user);
    if (loading || (supported && readFlag())) return prepare().then(function () { return user; });
    return Promise.resolve(null);
  }

  /** Promise<{ F, db } | null> — Firestore Lite поверх того же приложения */
  function firestore() {
    if (!store) {
      store = prepare().then(function (f) {
        if (!f) return null;
        return import(SDK + 'firebase-firestore-lite.js').then(function (F) {
          return { F: F, db: F.getFirestore(f.app) };
        });
      });
      store.then(function (s) { if (!s) store = null; }, function () { store = null; });
    }
    return store;
  }

  // данные пользователя в users/{uid} — удаляются вместе с аккаунтом
  function deleteUserDoc(u) {
    return firestore().then(function (s) {
      if (!s) throw new Error('Firestore niedostępny');
      return s.F.deleteDoc(s.F.doc(s.db, 'users', u.uid));
    });
  }

  function provider() {
    var p = new fb.A.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return p;
  }

  // run(promiseFactory): общая обвязка — busy, ошибки, перерисовка.
  // Вызывать прямо из обработчика клика: popup должен открыться синхронно.
  function run(task) {
    if (!fb || busy) return;
    busy = true;
    error = '';
    var p;
    try { p = task(); } catch (e) { p = Promise.reject(e); }
    emit();
    p.catch(function (e) { error = message(e); })
      .then(function () { busy = false; emit(); });
  }

  function signIn() {
    run(function () {
      return fb.A.signInWithPopup(fb.auth, provider());
    });
  }

  function signOut() {
    run(function () { return fb.A.signOut(fb.auth); });
  }

  // Удаление всегда с подтверждением через Google: Firebase требует свежий вход,
  // а заодно это последний шанс передумать.
  function deleteAccount() {
    var u = user;
    if (!u) return;
    run(function () {
      return fb.A.reauthenticateWithPopup(u, provider())
        .then(function () {
          return Promise.all([deleteUserDoc(u)].concat(beforeDelete.map(function (fn) { return fn(u); })));
        })
        .then(function () { return fb.A.deleteUser(u); })
        .then(function () { confirmDelete = false; });
    });
  }

  /* ---------- вид ---------- */

  function h(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'class') node.className = v;
      else if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    });
    [].concat(children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function errorLine() {
    return error ? h('p', { class: 'account-error', role: 'alert', text: error }) : null;
  }

  function loginBlock(lead) {
    var btn = loadFailed
      ? h('button', { class: 'btn btn-wide', type: 'button', text: 'Spróbuj ponownie', onclick: prepare })
      : h('button', {
        class: 'btn btn-wide', type: 'button',
        disabled: !fb || busy,
        text: !fb ? 'Ładowanie…' : busy ? 'Logowanie…' : 'Zaloguj przez Google',
        onclick: signIn,
      });
    return [
      h('p', { class: 'account-lead', text: lead || LEAD }),
      btn,
      errorLine(),
      h('a', { class: 'account-privacy', href: 'privacy.html', text: 'Polityka prywatności' }),
    ];
  }

  function userName() {
    return user.displayName || user.email || 'użytkownik';
  }

  function settingsView() {
    if (!supported) {
      return [h('p', { class: 'account-lead', text: 'Logowanie działa tylko na stronie w internecie, nie z pliku na dysku.' })];
    }
    if (!user) return loginBlock();

    var who = [
      h('p', { class: 'account-who' }, ['Zalogowano jako ', h('strong', { text: userName() })]),
      user.email && user.displayName ? h('p', { class: 'account-email', text: user.email }) : null,
    ];
    var actions = confirmDelete
      ? [
        h('p', {
          class: 'account-warn',
          text: 'Usunąć konto i wszystkie zapisane dane? Tego nie da się cofnąć. Google poprosi o potwierdzenie.',
        }),
        h('div', { class: 'account-row' }, [
          h('button', { class: 'btn btn-sm btn-danger', type: 'button', disabled: busy, text: busy ? 'Usuwanie…' : 'Usuń na zawsze', onclick: deleteAccount }),
          h('button', {
            class: 'btn btn-sm btn-secondary', type: 'button', disabled: busy, text: 'Anuluj',
            onclick: function () { confirmDelete = false; error = ''; emit(); },
          }),
        ]),
      ]
      : [
        h('div', { class: 'account-row' }, [
          h('button', { class: 'btn btn-sm btn-secondary', type: 'button', disabled: busy, text: 'Wyloguj', onclick: signOut }),
          h('button', {
            class: 'link-danger', type: 'button', disabled: busy, text: 'Usuń konto',
            onclick: function () { confirmDelete = true; error = ''; emit(); },
          }),
        ]),
      ];
    return who.concat(actions, [errorLine()]);
  }

  // блок входа вне настроек: после входа исчезает (что показать дальше, решает тот, кто его вставил)
  function loginView(v) {
    if (user) return [];
    if (!known && readFlag()) return []; // скорее всего вход уже есть — ждём Firebase, не мигаем кнопкой
    return loginBlock(v.lead);
  }

  function render(v) {
    var nodes = v.kind === 'login' ? loginView(v) : settingsView();
    v.box.replaceChildren(h('div', { class: 'account' }, nodes));
    v.box.hidden = nodes.length === 0;
  }

  function mount(box, kind, lead) {
    var v = { box: box, kind: kind, lead: lead };
    views.push(v);
    render(v);
  }

  /* ---------- секция «Konto» в настройках ---------- */

  if (window.PolskiSettings && window.PolskiSettings.addSection) {
    window.PolskiSettings.addSection({
      title: 'Konto',
      render: function (body) { mount(body, 'settings'); },
      onOpen: function () { if (supported && !loadFailed) prepare(); },
    });
  }

  if (supported && readFlag()) prepare();

  window.PolskiAccount = {
    supported: supported,
    sdk: SDK,
    user: function () { return user; },
    ready: ready,
    firestore: firestore,
    onChange: function (fn) { listeners.push(fn); },
    onBeforeDelete: function (fn) { beforeDelete.push(fn); },
    // блок входа с поясняющим текстом; сразу подгружает SDK, чтобы popup открылся по клику
    mountLogin: function (box, lead) {
      if (!supported) return false;
      mount(box, 'login', lead);
      if (!loadFailed) prepare();
      return true;
    },
  };
})();
