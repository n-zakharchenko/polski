/*
 * «Zainstaluj aplikację» — кнопка в самом низу страницы, ТОЛЬКО на телефонах (iPhone, Android)
 * и только в браузере (в уже установленном приложении её нет). Открывает окно с готовой инструкцией
 * под ЭТОТ телефон и ЭТОТ браузер (определяем по User-Agent): iPhone — Safari / Chrome / Firefox / Edge,
 * Android — Chrome / Samsung Internet / Firefox / Edge / Opera; встроенные браузеры приложений
 * (Instagram, Facebook, Messenger, TikTok, Gmail, Google…) ставить не умеют — объясняем, как открыть
 * страницу в Safari / Chrome, и даём «Skopiuj link». Ошиблись — внизу «Inny telefon lub przeglądarka?».
 * Chrome на Android сам умеет ставить — тогда есть кнопка «Zainstaluj teraz» (beforeinstallprompt).
 * Название и иконка приложения — manifest.webmanifest (Rajd Polski, малюх на голубом).
 *
 *   Polski.pwa.detect(ua)  — { os: 'ios'|'android'|null, browser: ключ из GUIDES } (для проверок)
 * На localhost кнопку можно показать и на компьютере: ?pwa (а ?pwa=ios-chrome — сразу эта инструкция).
 */
(function () {
  'use strict';

  // ключ — «система-браузер»; title — что показываем в шапке; steps — шаги; note — мелкая подсказка
  var GUIDES = {
    'ios-safari': {
      title: 'iPhone · Safari',
      steps: [
        'Stuknij „Udostępnij” — kwadrat ze strzałką w górę, na dole ekranu (jeśli go nie widać, najpierw stuknij „⋯” obok paska adresu).',
        'Przewiń listę w dół i wybierz „Do ekranu początkowego”.',
        'Zostaw nazwę „Rajd Polski” i stuknij „Dodaj” w prawym górnym rogu.',
      ],
    },
    'ios-chrome': {
      title: 'iPhone · Chrome',
      steps: [
        'Stuknij „Udostępnij” — kwadrat ze strzałką w górę, po prawej stronie paska adresu.',
        'Wybierz „Do ekranu początkowego” (jeśli go nie ma — przewiń w dół albo stuknij „Więcej”).',
        'Zostaw nazwę „Rajd Polski” i stuknij „Dodaj”.',
      ],
      note: 'Potrzebny jest iOS 16.4 lub nowszy. Na starszym — otwórz stronę w Safari.',
    },
    'ios-firefox': {
      title: 'iPhone · Firefox',
      steps: [
        'Stuknij menu ☰ (trzy kreski) na dole ekranu.',
        'Wybierz „Udostępnij”.',
        'Wybierz „Do ekranu początkowego” i stuknij „Dodaj”.',
      ],
      note: 'Potrzebny jest iOS 16.4 lub nowszy. Na starszym — otwórz stronę w Safari.',
    },
    'ios-edge': {
      title: 'iPhone · Edge',
      steps: [
        'Stuknij menu „⋯” na dole ekranu.',
        'Wybierz „Udostępnij”.',
        'Wybierz „Do ekranu początkowego” i stuknij „Dodaj”.',
      ],
      note: 'Potrzebny jest iOS 16.4 lub nowszy. Na starszym — otwórz stronę w Safari.',
    },
    'ios-inapp': {
      title: 'iPhone · przeglądarka w aplikacji',
      inapp: true,
      steps: [
        'Ta strona jest otwarta wewnątrz innej aplikacji (np. Instagram, Facebook, Gmail) — stąd nie da się jej zainstalować.',
        'Stuknij „⋯” albo ikonę kompasu i wybierz „Otwórz w Safari” / „Otwórz w przeglądarce”. Możesz też skopiować link i wkleić go w Safari.',
        'W Safari: „Udostępnij” (kwadrat ze strzałką) → „Do ekranu początkowego” → „Dodaj”.',
      ],
    },
    'android-chrome': {
      title: 'Android · Chrome',
      steps: [
        'Stuknij menu ⋮ w prawym górnym rogu.',
        'Wybierz „Zainstaluj aplikację” (albo „Dodaj do ekranu głównego”).',
        'Potwierdź „Zainstaluj” — ikona „Rajd Polski” pojawi się na ekranie głównym.',
      ],
    },
    'android-samsung': {
      title: 'Android · Samsung Internet',
      steps: [
        'Jeśli w pasku adresu widać ikonę pobierania ⤓ — stuknij ją i wybierz „Zainstaluj”. Gotowe.',
        'Jeśli nie: stuknij menu ≡ (trzy kreski) na dole ekranu.',
        'Wybierz „Dodaj stronę do” → „Ekran startowy” i stuknij „Dodaj”.',
      ],
    },
    'android-firefox': {
      title: 'Android · Firefox',
      steps: [
        'Stuknij menu ⋮ (na dole albo w prawym górnym rogu).',
        'Wybierz „Dodaj do ekranu głównego” (albo „Zainstaluj”).',
        'Potwierdź „Dodaj”.',
      ],
    },
    'android-edge': {
      title: 'Android · Edge',
      steps: [
        'Stuknij menu „⋯” na dole ekranu.',
        'Wybierz „Dodaj do telefonu” (albo „Dodaj do ekranu głównego”).',
        'Potwierdź „Zainstaluj”.',
      ],
    },
    'android-opera': {
      title: 'Android · Opera',
      steps: [
        'Stuknij menu ⋮ w prawym górnym rogu.',
        'Wybierz „Ekran główny” (albo „Dodaj do…” → „Ekran główny”).',
        'Potwierdź „Dodaj”.',
      ],
    },
    'android-other': {
      title: 'Android · inna przeglądarka',
      steps: [
        'Otwórz menu przeglądarki (zwykle ⋮ albo ≡).',
        'Poszukaj „Dodaj do ekranu głównego” albo „Zainstaluj”.',
        'Nie ma takiej opcji? Otwórz stronę w Chrome — tam działa na pewno.',
      ],
    },
    'android-inapp': {
      title: 'Android · przeglądarka w aplikacji',
      inapp: true,
      steps: [
        'Ta strona jest otwarta wewnątrz innej aplikacji (np. Instagram, Facebook, Gmail) — stąd nie da się jej zainstalować.',
        'Stuknij ⋮ w rogu i wybierz „Otwórz w Chrome” / „Otwórz w przeglądarce”. Możesz też skopiować link i wkleić go w Chrome.',
        'W Chrome: menu ⋮ → „Zainstaluj aplikację” → „Zainstaluj”.',
      ],
    },
  };

  /** телефон и браузер по User-Agent */
  function detect(ua) {
    ua = ua || '';
    var ios = /iPhone|iPod/.test(ua), android = /Android/.test(ua) && /Mobile/.test(ua);
    if (!ios && !android) return { os: null, browser: null };
    // встроенные браузеры приложений: соцсети, мессенджеры, приложение Google (GSA), Android WebView (wv)
    var inapp = /FBAN|FBAV|FB_IAB|Instagram|Messenger|TikTok|musical_ly|Line\/|Twitter|Snapchat|Pinterest|LinkedInApp|GSA\/|\bwv\)/.test(ua);
    if (ios) {
      if (inapp) return { os: 'ios', browser: 'ios-inapp' };
      if (/CriOS/.test(ua)) return { os: 'ios', browser: 'ios-chrome' };
      if (/FxiOS/.test(ua)) return { os: 'ios', browser: 'ios-firefox' };
      if (/EdgiOS/.test(ua)) return { os: 'ios', browser: 'ios-edge' };
      // настоящий Safari пишет Version/… и Safari/…; без них — WebView какого-то приложения
      if (/Version\/[\d.]+.*Safari\//.test(ua)) return { os: 'ios', browser: 'ios-safari' };
      return { os: 'ios', browser: 'ios-inapp' };
    }
    if (inapp) return { os: 'android', browser: 'android-inapp' };
    if (/SamsungBrowser/.test(ua)) return { os: 'android', browser: 'android-samsung' };
    if (/Firefox\//.test(ua)) return { os: 'android', browser: 'android-firefox' };
    if (/EdgA\//.test(ua)) return { os: 'android', browser: 'android-edge' };
    if (/OPR\/|Opera/.test(ua)) return { os: 'android', browser: 'android-opera' };
    if (/Chrome\//.test(ua) && !/YaBrowser|UCBrowser|MiuiBrowser|HuaweiBrowser|DuckDuckGo|Vivaldi/.test(ua)) {
      return { os: 'android', browser: 'android-chrome' };
    }
    return { os: 'android', browser: 'android-other' };
  }

  window.Polski = window.Polski || {};
  Polski.pwa = { detect: detect, guides: GUIDES };

  var LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var force = LOCAL ? (location.search.match(/[?&]pwa(?:=([\w-]+))?(?:&|$)/) || null) : null;
  var found = detect(navigator.userAgent);
  if (force && force[1] && GUIDES[force[1]]) found = { os: force[1].split('-')[0], browser: force[1] };

  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    navigator.standalone === true;
  if (standalone || !(found.os || force)) return;

  var deferred = null; // Android Chrome: системное окно установки
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
  });

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

  function copyLink(btn) {
    var url = location.origin + location.pathname.replace(/[^/]*$/, '');
    var done = function () { btn.textContent = 'Skopiowano ✓'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () { window.prompt('Skopiuj link:', url); });
    } else {
      window.prompt('Skopiuj link:', url);
    }
  }

  function open() {
    var current = found.browser || 'android-chrome';
    var body = h('div', { class: 'pwa-steps' });
    var picker = null;

    function render() {
      var g = GUIDES[current];
      var canPrompt = current === 'android-chrome' && deferred;
      body.replaceChildren.apply(body, [
        h('p', { class: 'pwa-device' }, [
          current === found.browser ? 'Twój telefon: ' : 'Instrukcja: ', h('strong', { text: g.title }),
        ]),
        canPrompt ? h('button', {
          class: 'btn btn-wide pwa-install', type: 'button', text: 'Zainstaluj teraz',
          onclick: function () {
            var p = deferred;
            deferred = null;
            p.prompt();
            p.userChoice.then(function (r) { if (r && r.outcome === 'accepted') close(); else render(); });
          },
        }) : null,
        canPrompt ? h('p', { class: 'pwa-or', text: 'albo ręcznie:' }) : null,
        h('ol', {}, g.steps.map(function (t) { return h('li', { text: t }); })),
        g.inapp ? h('button', {
          class: 'btn btn-sm btn-secondary pwa-copy', type: 'button', text: 'Skopiuj link',
          onclick: function (e) { copyLink(e.currentTarget); },
        }) : null,
        g.note ? h('p', { class: 'pwa-note', text: g.note }) : null,
      ].filter(Boolean));
      if (picker) picker.value = current;
    }

    // «ошиблись с телефоном» — список всех инструкций
    var other = h('details', { class: 'pwa-other' }, [
      h('summary', { text: 'Inny telefon lub przeglądarka?' }),
      (picker = h('select', { class: 'pwa-picker', 'aria-label': 'Telefon i przeglądarka' },
        Object.keys(GUIDES).map(function (k) { return h('option', { value: k, text: GUIDES[k].title }); }))),
    ]);
    picker.addEventListener('change', function () { current = picker.value; render(); });

    var dlg = h('dialog', { class: 'rule-dialog pwa-dialog', 'aria-label': 'Zainstaluj aplikację' }, [
      h('div', { class: 'rule-inner' }, [
        h('div', { class: 'rule-head' }, [
          h('h2', { class: 'rule-title', text: 'Rajd Polski na telefonie' }),
          h('button', { class: 'rule-close', type: 'button', 'aria-label': 'Zamknij', text: '×', onclick: close }),
        ]),
        h('div', { class: 'pwa-intro' }, [
          h('img', { class: 'pwa-icon', src: 'icons/apple-touch-icon.png?v=' + (window.POLSKI_V || ''), alt: '', width: '56', height: '56' }),
          h('p', { text: 'Dodaj aplikację na ekran główny — będzie się otwierać jak zwykła aplikacja, na pełnym ekranie.' }),
        ]),
        body,
        other,
      ]),
    ]);
    function close() {
      if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
    }
    dlg.addEventListener('close', function () { dlg.remove(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); }); // клик по фону
    render();
    document.body.appendChild(dlg);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  function mount() {
    var footer = document.querySelector('.site-footer');
    if (!footer) {
      var main = document.querySelector('main');
      if (!main) return;
      footer = h('footer', { class: 'site-footer' });
      main.appendChild(footer);
    }
    footer.insertBefore(h('div', { class: 'pwa-row' }, [
      h('button', { class: 'btn btn-sm btn-secondary pwa-btn', type: 'button', text: '📲 Zainstaluj aplikację', onclick: open }),
    ]), footer.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
