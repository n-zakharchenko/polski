/*
 * Polski — интерфейс прохождения теста.
 * Polski.ui.run(test, rootElement, { backHref }) — запускает тест: задания, проверка, итог.
 *
 * Типы заданий (task.type):
 *   'input'  — ввод текста; task.answer: строка или массив допустимых вариантов
 *   'choice' — выбор варианта; task.options: массив строк, task.answer: правильная строка
 *   'slots'  — предложение с цветными рамками, слова выбираются из вариантов:
 *              task.source   — исходное предложение (показывается сверху)
 *              task.sentence — части: 'текст' | { num: 5, words?: 'Pięć' } | { slot: 'имя' }
 *              task.slots    — { имя: { color: 'yellow'|'green'|'blue', label, options: [...], answer,
 *                                       placeholder?: 'текст в пустой рамке', tr?: перевод } }
 *   'custom' — бандл рисует сам: test.render(task, container, submit)
 * Общие поля: task.question — инструкция ("Napisz słownie:"), task.prompt — то, что крупно.
 */
(function () {
  'use strict';

  var Polski = window.Polski;
  var POLISH_LETTERS = ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'];
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /** el('div', { class: 'x', onclick: fn }, [детиИлиТекст]) — null среди детей пропускается */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k.slice(0, 2) === 'on') node.addEventListener(k.slice(2), v);
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function firstAnswer(task) {
    return [].concat(task.answer)[0];
  }

  /** 'текст' или { text, tr } → <span>, с переводом в data-tr */
  function wordSpan(part, cls) {
    if (typeof part === 'string') return el('span', { class: cls, text: part });
    return el('span', { class: cls, 'data-tr': part.tr, text: part.text });
  }

  /* ======================================================================
   * Перевод по долгому нажатию (1 с) — пальцем или кнопкой мыши.
   * Работает для любого элемента с атрибутом data-tr.
   * Наведение ничего не показывает: фича почти незаметна и не мешает основному флоу.
   * После долгого нажатия следующий click гасится — вариант не выбирается.
   * ==================================================================== */

  var trTips = (function () {
    var HOLD_MS = 1000;    // сколько держать
    var LINGER_MS = 1000;  // сколько облачко видно после отпускания
    var MOVE_PX = 10;      // сдвинулся — это прокрутка/перетаскивание, а не нажатие
    var tip = null;
    var timer = null;
    var hideTimer = null;
    var start = null;
    var suppressClick = false;

    function target(e) {
      return e.target && e.target.closest ? e.target.closest('[data-tr]') : null;
    }

    function show(node) {
      var text = node.getAttribute('data-tr');
      if (!text) return;
      if (!tip) {
        tip = el('div', { class: 'tr-tip bubble', role: 'tooltip' });
        document.body.appendChild(tip);
      }
      clearTimeout(hideTimer);
      tip.textContent = text;
      tip.classList.remove('visible');
      var r = node.getBoundingClientRect();
      var w = tip.offsetWidth, h = tip.offsetHeight;
      var center = r.left + r.width / 2;
      var left = Math.min(Math.max(8, center - w / 2), window.innerWidth - w - 8);
      var top = r.top - h - 14;               // над словом, с местом под хвостик
      var below = top < 8;
      if (below) top = r.bottom + 14;
      tip.classList.toggle('below', below);
      // хвостик смотрит на центр слова, даже если облачко прижато к краю экрана
      tip.style.setProperty('--tail-x', Math.min(Math.max(18, center - left), w - 18) + 'px');
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
      void tip.offsetWidth; // перезапуск анимации появления
      tip.classList.add('visible');
    }

    function hide(delay) {
      clearTimeout(timer);
      clearTimeout(hideTimer);
      if (!tip) return;
      hideTimer = setTimeout(function () { tip.classList.remove('visible'); }, delay || 0);
    }

    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      hide(0);
      suppressClick = false;
      var node = target(e);
      if (!node) return;
      start = { x: e.clientX, y: e.clientY };
      timer = setTimeout(function () {
        suppressClick = true;
        show(node);
      }, HOLD_MS);
    });
    document.addEventListener('pointermove', function (e) {
      if (!start) return;
      if (Math.abs(e.clientX - start.x) > MOVE_PX || Math.abs(e.clientY - start.y) > MOVE_PX) {
        clearTimeout(timer);
        start = null;
      }
    });
    function release() {
      clearTimeout(timer);
      start = null;
      if (suppressClick) hide(LINGER_MS); // облачко ещё немного видно после отпускания
    }
    document.addEventListener('pointerup', release);
    document.addEventListener('pointercancel', release);

    // гасим click после долгого нажатия, чтобы не выбрать вариант
    document.addEventListener('click', function (e) {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // системное меню на долгое нажатие (Android/iOS) — не нужно
    document.addEventListener('contextmenu', function (e) {
      if (target(e)) e.preventDefault();
    });

    window.addEventListener('scroll', function () { hide(0); }, true);
    document.addEventListener('click', function () { hide(0); });

    return { hide: hide };
  })();

  /* ======================================================================
   * Типы заданий. Каждый: (task, area, api) → handler
   *   api.submit(answer) → результат проверки (один раз)
   *   api.setReady(bool) — можно ли нажать «Sprawdź»
   *   handler.getAnswer   — если есть, показывается кнопка «Sprawdź»
   *   handler.onResult(res) — показать результат по-своему
   *   handler.ownFeedback — не показывать стандартный блок «Dobrze/Źle»
   * ==================================================================== */

  var TYPES = {};

  TYPES.input = function (task, area, api) {
    var input = el('input', {
      class: 'text-input', type: 'text', autocomplete: 'off', autocapitalize: 'off',
      autocorrect: 'off', spellcheck: 'false', placeholder: 'Twoja odpowiedź…', lang: 'pl',
    });
    input.addEventListener('input', function () { api.setReady(input.value.trim() !== ''); });
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (input.value.trim() !== '') api.submit(input.value);
    });

    var keys = el('div', { class: 'pl-keys' }, POLISH_LETTERS.map(function (ch) {
      return el('button', {
        class: 'pl-key', type: 'button', text: ch, tabindex: '-1',
        onmousedown: function (e) { e.preventDefault(); }, // не терять фокус поля
        onclick: function () {
          var s = input.selectionStart, e2 = input.selectionEnd;
          input.value = input.value.slice(0, s) + ch + input.value.slice(e2);
          input.setSelectionRange(s + 1, s + 1);
          input.focus();
          input.dispatchEvent(new Event('input'));
        },
      });
    }));

    area.appendChild(input);
    area.appendChild(keys);
    setTimeout(function () { input.focus(); }, 0);
    return { getAnswer: function () { return input.value; } };
  };

  TYPES.choice = function (task, area, api) {
    var opts = el('div', { class: 'options' });
    task.options.forEach(function (opt) {
      var b = el('button', { class: 'option', type: 'button', text: opt });
      b.addEventListener('click', function () {
        var res = api.submit(opt);
        if (!res) return;
        Array.prototype.forEach.call(opts.children, function (o) {
          if (o.textContent === task.answer) o.classList.add('correct');
        });
        if (!res.ok) b.classList.add('wrong');
      });
      opts.appendChild(b);
    });
    area.appendChild(opts);
    return {};
  };

  TYPES.custom = function (task, area, api) {
    api.test.render(task, area, api.submit);
    return {};
  };

  TYPES.slots = function (task, area, api) {
    var names = Object.keys(task.slots);
    var slotEls = {};   // имя → рамка
    var filled = {};    // имя → { chip, value }
    var flying = 0;     // сколько слов сейчас в полёте
    var done = false;

    area.classList.add('slots-area');

    // исходное предложение: строка или части [{ text, tr }] — tr показывается по долгому нажатию
    var sourceParts = task.source == null ? null : [].concat(task.source);
    var source = sourceParts == null ? null : el('div', { class: 'slots-source' }, [
      el('span', { class: 'slots-caption', text: task.sourceLabel || 'Zdanie' }),
      el('p', { class: 'slots-source-text' }, sourceParts.reduce(function (acc, part, i) {
        if (i > 0) acc.push(' ');
        acc.push(wordSpan(part, 'slots-word'));
        return acc;
      }, [])),
    ]);

    var sentence = el('div', { class: 'slots-sentence' }, task.sentence.map(function (part) {
      if (typeof part === 'string' || part.text != null) return wordSpan(part, 'slots-text');
      if (part.num != null) {
        return el('span', {
          class: 'slots-num', 'data-tr': part.tr || String(part.num),
          text: part.words || String(part.num),
        });
      }
      var cfg = task.slots[part.slot];
      var slot = el('button', {
        class: 'slot slot-' + cfg.color, type: 'button', 'aria-label': cfg.label || part.slot,
        'data-placeholder': cfg.placeholder, // напр. цифра «22» в пустой рамке числительного
      });
      slot.addEventListener('click', function () { unfill(part.slot); });
      slotEls[part.slot] = slot;
      return slot;
    }));

    var groups = names.map(function (name) {
      var cfg = task.slots[name];
      return el('div', { class: 'slots-group' }, [
        el('div', { class: 'slots-caption caption-' + cfg.color, text: cfg.label || name }),
        el('div', { class: 'chips' }, cfg.options.map(function (opt) {
          // cfg.tr — перевод для всех вариантов (строка) или для каждого ({ вариант: перевод })
          var tr = typeof cfg.tr === 'string' ? cfg.tr : (cfg.tr && cfg.tr[opt]);
          var chip = el('button', { class: 'chip chip-' + cfg.color, type: 'button', 'data-tr': tr, text: opt });
          chip.addEventListener('click', function () { pick(name, chip, opt); });
          return chip;
        })),
      ]);
    });

    [source, sentence].concat(groups).forEach(function (n) { if (n) area.appendChild(n); });

    function pick(name, chip, value) {
      if (done) return;
      var prev = filled[name];
      if (prev && prev.chip === chip) return;
      if (prev) prev.chip.classList.remove('used');
      filled[name] = { chip: chip, value: value };
      flyTo(chip, slotEls[name], value).then(maybeSubmit);
    }

    function unfill(name) {
      if (done || !filled[name]) return;
      filled[name].chip.classList.remove('used');
      delete filled[name];
      var slot = slotEls[name];
      slot.textContent = '';
      slot.classList.remove('filled', 'landing', 'pop');
    }

    function maybeSubmit() {
      if (done || flying > 0) return;
      if (!names.every(function (n) { return filled[n]; })) return;
      done = true;
      var answer = {};
      names.forEach(function (n) { answer[n] = filled[n].value; });
      api.submit(answer);
    }

    /** слово «летит» из варианта в рамку */
    function flyTo(chip, slot, value) {
      slot.textContent = value;
      slot.classList.remove('pop');
      slot.classList.add('filled');
      chip.classList.add('used');
      if (reduceMotion) return Promise.resolve();

      flying += 1;
      slot.classList.add('landing');
      var from = chip.getBoundingClientRect();
      var to = slot.getBoundingClientRect();
      var ghost = chip.cloneNode(true);
      ghost.classList.remove('used');
      ghost.classList.add('ghost');
      Object.assign(ghost.style, {
        left: from.left + 'px', top: from.top + 'px',
        width: from.width + 'px', height: from.height + 'px',
      });
      document.body.appendChild(ghost);

      var dx = to.left + to.width / 2 - (from.left + from.width / 2);
      var dy = to.top + to.height / 2 - (from.top + from.height / 2);

      return new Promise(function (resolve) {
        var finished = false;
        function finish() {
          if (finished) return;
          finished = true;
          ghost.remove();
          flying -= 1;
          if (filled[nameOf(slot)] && filled[nameOf(slot)].chip === chip) {
            slot.classList.remove('landing');
            void slot.offsetWidth; // перезапуск анимации
            slot.classList.add('pop');
          }
          resolve();
        }
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
          });
        });
        ghost.addEventListener('transitionend', finish);
        setTimeout(finish, 700);
      });
    }

    function nameOf(slot) {
      for (var n in slotEls) if (slotEls[n] === slot) return n;
      return null;
    }

    return {
      ownFeedback: true,
      onResult: function (res) {
        var mistakes = 0;
        names.forEach(function (name) {
          var ok = res.slots ? res.slots[name] : res.ok;
          var slot = slotEls[name];
          if (!ok) mistakes += 1;
          slot.classList.add(ok ? 'right' : 'wrong');
          if (!ok) {
            slot.appendChild(el('span', { class: 'slot-tip bubble', role: 'tooltip', text: task.slots[name].answer }));
            sentence.classList.add('has-tip'); // раздвинуть строки, чтобы подсказка ничего не закрывала
          }
        });
        // 0 ошибок — «Dokładnie!», 1 — «Prawie!», 2 и больше — «O kurde!»
        var verdict = mistakes === 0 ? { cls: 'ok', text: 'Dokładnie!' }
          : mistakes === 1 ? { cls: 'bad', text: 'Prawie!' }
          : { cls: 'fail', text: 'O kurde!' };
        area.appendChild(el('div', {
          class: 'verdict ' + verdict.cls,
          'aria-live': 'polite',
          text: verdict.text,
        }));
      },
    };
  };

  /* ======================================================================
   * Прохождение теста
   * ==================================================================== */

  /* ---------- правило: кнопка (i) и окно ---------- */

  /**
   * test.rule = { title?: 'Zasada', html: '…' } — статичный HTML из самого бандла.
   * Возвращает { make, showHint, hideHint } или null, если правила нет:
   *   make()          — создать подвал карточки с кнопкой (i)
   *   showHint(text)  — подсказка-облачко над кнопкой (исчезает от любого касания)
   */
  function ruleButtonFactory(test) {
    if (!test.rule) return null;
    var title = test.rule.title || 'Zasada';
    // правило уже открывали в этой сессии; rule.id — общее для всех режимов с одним правилом
    var openedKey = 'polski.ruleOpened.' + (test.rule.id || test.id);
    var opened = readSession(openedKey);

    var body = el('div', { class: 'rule-body' });
    body.innerHTML = test.rule.html; // доверенный контент из бандла, не пользовательский ввод

    var dlg = el('dialog', { class: 'rule-dialog', 'aria-label': title });
    var inner = el('div', { class: 'rule-inner' }, [
      el('div', { class: 'rule-head' }, [
        el('h2', { class: 'rule-title', text: title }),
        el('button', {
          class: 'rule-close', type: 'button', 'aria-label': 'Zamknij', text: '×',
          onclick: function () { closeDlg(); },
        }),
      ]),
      body,
    ]);
    dlg.appendChild(inner);
    // клик по фону вокруг окна закрывает его
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });
    document.body.appendChild(dlg);

    function openDlg() {
      hideHint();
      opened = true;
      writeSession(openedKey);
      if (typeof dlg.showModal === 'function') dlg.showModal();
      else dlg.setAttribute('open', '');
    }
    function closeDlg() {
      if (typeof dlg.close === 'function') dlg.close();
      else dlg.removeAttribute('open');
    }

    var footer = null;
    var hint = null;
    function onAnyPress() { hideHint(); }

    function hideHint() {
      if (hint) { hint.remove(); hint = null; }
      document.removeEventListener('pointerdown', onAnyPress, true);
    }

    function showHint(text) {
      if (!footer || !footer.isConnected) return;
      hideHint();
      hint = el('div', { class: 'hint-tip bubble', role: 'status', text: text });
      footer.appendChild(hint);
      // исчезает от любого касания — но не от того, что вызвало показ
      setTimeout(function () { if (hint) document.addEventListener('pointerdown', onAnyPress, true); }, 0);
    }

    return {
      make: function () {
        hideHint();
        footer = el('div', { class: 'card-footer' }, [
          el('button', {
            class: 'info-btn', type: 'button', title: title, 'aria-label': title, text: 'i',
            onclick: openDlg,
          }),
        ]);
        return footer;
      },
      showHint: showHint,
      hideHint: hideHint,
      /** правило уже открывали в этой сессии — подсказки про него больше не нужны */
      wasOpened: function () { return opened; },
    };
  }

  /* sessionStorage живёт, пока открыта вкладка; без него — просто помним в памяти страницы */
  function readSession(key) {
    try { return window.sessionStorage.getItem(key) === '1'; } catch (e) { return false; }
  }
  function writeSession(key) {
    try { window.sessionStorage.setItem(key, '1'); } catch (e) { /* не страшно */ }
  }

  var IDLE_HINT_STEPS = [15000, 30000, 60000];    // «долго думает»: от начала задания
  var IDLE_HINT_TEXT = 'Nie wiesz? Sprawdź zasadę.';
  var FIRST_HINT_TEXT = 'Tutaj znajdziesz zasadę.';
  var FIRST_HINT_KEY = 'polski.ruleHintShown';    // показать один раз за всё время

  /** true, если подсказку про правило ещё ни разу не показывали (и сразу помечает как показанную) */
  function takeFirstVisit() {
    try {
      if (window.localStorage.getItem(FIRST_HINT_KEY)) return false;
      window.localStorage.setItem(FIRST_HINT_KEY, '1');
      return true;
    } catch (e) {
      return false; // хранилище недоступно — лучше не показать, чем показывать каждый раз
    }
  }

  /**
   * opts.backHref — куда ведёт кнопка на итоговом экране (по умолчанию главная)
   * opts.title    — полное название для статистики («Liczebniki · Męskoosobowe · Liczebnik»)
   */
  function run(test, root, opts) {
    var backHref = (opts && opts.backHref) || 'index.html';
    var rule = ruleButtonFactory(test);
    var idleTimers = [];
    var firstHintPending = !!rule && takeFirstVisit();
    var state;

    function makeRuleButton() { return rule ? rule.make() : null; }

    /**
     * «долго думает»: без ответа — подсказка над (i) через 15 с, 30 с и 1 мин от начала задания.
     * Если правило в этой сессии уже открывали — не показываем.
     * Логика общая для всех тестов с test.rule; сам тест её не описывает.
     */
    function armIdleHint() {
      clearIdleTimers();
      if (!rule || rule.wasOpened()) return;
      idleTimers = IDLE_HINT_STEPS.map(function (ms) {
        return setTimeout(function () {
          if (!state.answered && !rule.wasOpened()) rule.showHint(IDLE_HINT_TEXT); // если ещё видна — появится заново
        }, ms);
      });
    }

    function clearIdleTimers() {
      idleTimers.forEach(clearTimeout);
      idleTimers = [];
    }

    function stopIdleHint() {
      clearIdleTimers();
      if (rule) rule.hideHint();
    }

    function start() {
      // points / streak — очки и серия верных подряд (core/balance.js); видны только после входа
      // bestStreak / ms — для статистики на главной: лучшая серия и время на заданиях (core/stats.js)
      state = { rng: Polski.createRng(), round: 0, correct: 0, wrong: 0, session: {}, points: 0, streak: 0, gain: 0,
        bestStreak: 0, ms: 0 };
      nextTask();
    }

    function nextTask() {
      if (state.round >= test.rounds) return showSummary();
      state.round += 1;
      state.answered = false;
      state.task = test.generate(state.rng, {
        round: state.round, total: test.rounds, session: state.session,
      });
      showTask();
    }

    /* ---------- экран задания ---------- */

    function showTask() {
      var task = state.task;
      trTips.hide(0);
      var feedback = el('div', { class: 'feedback', 'aria-live': 'polite' });
      var actionBtn = el('button', { class: 'btn btn-wide', type: 'button', text: 'Sprawdź' });
      // «Sprawdź / Dalej» — не под заданием (у заданий разная высота, кнопка прыгала),
      // а закреплена у нижнего края экрана, поверх лёгкого градиента (.action-bar в style.css)
      var actionBar = el('div', { class: 'action-bar' }, [actionBtn]);
      function showAction(on) { actionBtn.hidden = !on; actionBar.hidden = !on; }
      var area = el('div', { class: 'answer-area' });
      var handler;

      var api = {
        test: test,
        setReady: function (ready) { if (!state.answered) actionBtn.disabled = !ready; },
        submit: function (answer) {
          if (state.answered) return null;
          state.answered = true;
          stopIdleHint();
          var res = Polski.checkAnswer(test, task, answer);
          if (res.ok) state.correct += 1; else state.wrong += 1;
          // очки: верно — по серии, «Prawie!» / ошибка — 0 и серия с нуля
          state.streak = res.ok ? state.streak + 1 : 0;
          state.bestStreak = Math.max(state.bestStreak, state.streak);
          var maxMs = ((Polski.balance && Polski.balance.config.taskSecondsMax) || 120) * 1000;
          state.ms += Math.min(maxMs, Math.max(0, Date.now() - state.shownAt));
          state.gain = res.ok && Polski.balance ? Polski.balance.taskPoints(state.streak) : 0;
          state.points += state.gain;
          updateProgress(true);
          if (handler.onResult) handler.onResult(res);
          if (!handler.ownFeedback) showFeedback(feedback, res, task);
          area.classList.add('locked');
          actionBtn.textContent = state.round >= test.rounds ? 'Wynik' : 'Dalej';
          showAction(true);
          actionBtn.disabled = false;
          actionBtn.focus({ preventScroll: true });
          return res;
        },
      };

      actionBtn.addEventListener('click', function () {
        if (state.answered) nextTask();
        else if (handler.getAnswer) api.submit(handler.getAnswer());
      });

      var header = (task.question || task.prompt != null) ? el('div', { class: 'task' }, [
        task.question ? el('p', { class: 'task-question', text: task.question }) : null,
        task.prompt != null ? el('div', { class: 'task-prompt', text: String(task.prompt) }) : null,
      ]) : null;

      root.replaceChildren(el('div', {}, [
        progressBar(), header, area, feedback, actionBar,
        makeRuleButton(),
      ]));

      handler = (TYPES[task.type] || TYPES.input)(task, area, api) || {};
      state.shownAt = Date.now();
      if (handler.getAnswer) actionBtn.disabled = true;
      else showAction(false); // ответ — по клику в самом задании

      armIdleHint();
      if (firstHintPending) {
        // первый заход в тест — один раз за всё время показываем, где правило
        firstHintPending = false;
        setTimeout(function () { if (!state.answered) rule.showHint(FIRST_HINT_TEXT); }, 700);
      }
    }

    function showFeedback(box, res, task) {
      box.className = 'feedback ' + (res.ok ? 'ok' : 'bad');
      box.replaceChildren(el('div', {}, [
        el('strong', { text: res.ok ? 'Dobrze! ✓' : 'Źle ✗' }),
        !res.ok && task.type !== 'choice'
          ? el('div', {}, ['Poprawnie: ', el('b', { text: firstAnswer(task) })])
          : null,
        res.hint ? el('div', { class: 'feedback-hint', text: res.hint }) : null,
        task.explain ? el('div', { class: 'feedback-hint', text: task.explain }) : null,
      ]));
    }

    function showPoints() {
      return !!(Polski.balance && window.PolskiAccount && window.PolskiAccount.user());
    }

    // очки и серия видны только после входа. Вход восстанавливается не сразу (Firebase) —
    // поэтому счётчик есть всегда, но скрыт, и показывается, как только вход подтвердится
    function syncPoints() {
      if (!state || !state.ui || !Polski.balance) return;
      var on = showPoints();
      state.ui.ptsEl.hidden = !on;
      state.ui.streakEl.hidden = !on;
    }
    function hookAccount() {
      var a = window.PolskiAccount;
      if (!a) return;
      a.ready().then(syncPoints);
      if (a.onChange) a.onChange(syncPoints);
    }
    if (window.PolskiAccount) hookAccount();
    else document.addEventListener('DOMContentLoaded', hookAccount); // account.js грузится с defer

    function progressBar() {
      var withPts = !!Polski.balance;
      state.ui = {
        okEl: el('span', { class: 'count-ok', title: 'Dobrze' }),
        badEl: el('span', { class: 'count-bad', title: 'Błędy' }),
        fill: el('div', { class: 'progress-fill' }),
        ptsEl: withPts ? el('span', { class: 'count-pts', title: 'Punkty' }) : null,
        streakEl: withPts ? el('span', { class: 'streak', title: 'Seria poprawnych odpowiedzi' }) : null,
      };
      syncPoints();
      updateProgress(false);
      return el('div', { class: 'progress' }, [
        el('div', { class: 'progress-text' }, [
          el('span', { class: 'progress-round' }, [
            el('span', { text: state.round + ' / ' + test.rounds }),
            state.ui.streakEl,
          ]),
          el('span', { class: 'counts' }, [state.ui.ptsEl, state.ui.okEl, state.ui.badEl]),
        ]),
        el('div', { class: 'progress-track' }, [state.ui.fill]),
      ]);
    }

    function updateProgress(answered) {
      var doneCount = state.round - (answered ? 0 : 1);
      state.ui.fill.style.width = Math.round((doneCount / test.rounds) * 100) + '%';
      state.ui.okEl.textContent = '✓ ' + state.correct;
      state.ui.badEl.textContent = '✗ ' + state.wrong;
      if (state.ui.ptsEl) {
        state.ui.ptsEl.replaceChildren(el('span', { class: 'ico-fuel', 'aria-hidden': 'true' }), ' ' + state.points.toLocaleString('pl-PL'));
        if (answered && state.gain) {
          var pop = el('span', { class: 'pts-pop', text: '+' + state.gain, 'aria-hidden': 'true' });
          pop.addEventListener('animationend', function () { pop.remove(); });
          state.ui.ptsEl.appendChild(pop);
        }
      }
      if (state.ui.streakEl) {
        var mult = Polski.balance.multiplier(state.streak);
        var label = mult > 1 ? '🔥 ×' + String(mult).replace('.', ',') : '';
        if (label && label !== state.ui.streakEl.textContent && answered) {
          state.ui.streakEl.classList.remove('bump');
          void state.ui.streakEl.offsetWidth; // перезапуск анимации
          state.ui.streakEl.classList.add('bump');
        }
        state.ui.streakEl.textContent = label;
      }
    }

    /* ---------- итог ---------- */

    function showSummary() {
      stopIdleHint();
      var pct = Math.round((state.correct / test.rounds) * 100);
      var msg = pct === 100 ? 'Perfekcyjnie! 🎉'
        : pct >= 80 ? 'Świetnie!'
        : pct >= 50 ? 'Nieźle, ćwicz dalej!'
        : 'Spróbuj jeszcze raz!';

      // очки: после входа — сохраняем, без входа — предлагаем войти (core/progress.js); без него блока нет
      var accountBox = el('div', { class: 'summary-account', hidden: true });
      var bonus = Polski.balance ? Polski.balance.testBonus(state.correct, test.rounds) : 0;

      root.replaceChildren(el('div', {}, [
        el('div', { class: 'summary' }, [
          el('div', { class: 'summary-score', text: state.correct + ' / ' + test.rounds }),
          el('div', { class: 'summary-pct', text: pct + '%' }),
          el('p', { class: 'summary-msg', text: msg }),
          el('div', { class: 'summary-actions' }, [
            el('button', { class: 'btn', type: 'button', text: 'Jeszcze raz', onclick: start }),
            el('a', { class: 'btn btn-secondary', href: backHref, text: 'Wstecz' }),
          ]),
          accountBox,
        ]),
        makeRuleButton(),
      ]));

      if (Polski.progress) {
        Polski.progress.mountSummary(accountBox, {
          points: state.points + bonus, bonus: bonus, perfect: bonus > 0,
          // для статистики на главной
          testId: test.id, title: (opts && opts.title) || test.title,
          answered: test.rounds, correct: state.correct, bestStreak: state.bestStreak,
          seconds: Math.round(state.ms / 1000),
        });
      }
    }

    start();
  }

  function showError(root, err) {
    root.replaceChildren(el('p', { class: 'error', text: '⚠️ ' + (err && err.message ? err.message : err) }));
  }

  Polski.ui = { run: run, el: el, showError: showError, types: TYPES };
})();
