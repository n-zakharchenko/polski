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
 *              task.slots    — { имя: { color: 'yellow'|'green', label, options: [...], answer } }
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

    var source = task.source == null ? null : el('div', { class: 'slots-source' }, [
      el('span', { class: 'slots-caption', text: task.sourceLabel || 'Zdanie' }),
      el('p', { class: 'slots-source-text', text: task.source }),
    ]);

    var sentence = el('div', { class: 'slots-sentence' }, task.sentence.map(function (part) {
      if (typeof part === 'string') return el('span', { class: 'slots-text', text: part });
      if (part.num != null) {
        return el('span', { class: 'slots-num', title: String(part.num), text: part.words || String(part.num) });
      }
      var cfg = task.slots[part.slot];
      var slot = el('button', {
        class: 'slot slot-' + cfg.color, type: 'button', 'aria-label': cfg.label || part.slot,
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
          var chip = el('button', { class: 'chip chip-' + cfg.color, type: 'button', text: opt });
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
        names.forEach(function (name) {
          var ok = res.slots ? res.slots[name] : res.ok;
          var slot = slotEls[name];
          slot.classList.add(ok ? 'right' : 'wrong');
          if (!ok) {
            slot.appendChild(el('span', { class: 'slot-tip', role: 'tooltip', text: task.slots[name].answer }));
          }
        });
        area.appendChild(el('div', {
          class: 'verdict ' + (res.ok ? 'ok' : 'bad'),
          'aria-live': 'polite',
          text: res.ok ? 'Dokładnie!' : 'Prawie',
        }));
      },
    };
  };

  /* ======================================================================
   * Прохождение теста
   * ==================================================================== */

  /** opts.backHref — куда ведёт кнопка на итоговом экране (по умолчанию главная) */
  function run(test, root, opts) {
    var backHref = (opts && opts.backHref) || 'index.html';
    var state;

    function start() {
      state = { rng: Polski.createRng(), round: 0, correct: 0, wrong: 0, session: {} };
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
      var feedback = el('div', { class: 'feedback', 'aria-live': 'polite' });
      var actionBtn = el('button', { class: 'btn btn-wide', type: 'button', text: 'Sprawdź' });
      var area = el('div', { class: 'answer-area' });
      var handler;

      var api = {
        test: test,
        setReady: function (ready) { if (!state.answered) actionBtn.disabled = !ready; },
        submit: function (answer) {
          if (state.answered) return null;
          state.answered = true;
          var res = Polski.checkAnswer(test, task, answer);
          if (res.ok) state.correct += 1; else state.wrong += 1;
          updateProgress(true);
          if (handler.onResult) handler.onResult(res);
          if (!handler.ownFeedback) showFeedback(feedback, res, task);
          area.classList.add('locked');
          actionBtn.textContent = state.round >= test.rounds ? 'Wynik' : 'Dalej';
          actionBtn.hidden = false;
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

      root.replaceChildren(el('div', {}, [progressBar(), header, area, feedback, actionBtn]));

      handler = (TYPES[task.type] || TYPES.input)(task, area, api) || {};
      if (handler.getAnswer) actionBtn.disabled = true;
      else actionBtn.hidden = true; // ответ — по клику в самом задании
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

    function progressBar() {
      state.ui = {
        okEl: el('span', { class: 'count-ok', title: 'Dobrze' }),
        badEl: el('span', { class: 'count-bad', title: 'Błędy' }),
        fill: el('div', { class: 'progress-fill' }),
      };
      updateProgress(false);
      return el('div', { class: 'progress' }, [
        el('div', { class: 'progress-text' }, [
          el('span', { text: state.round + ' / ' + test.rounds }),
          el('span', { class: 'counts' }, [state.ui.okEl, state.ui.badEl]),
        ]),
        el('div', { class: 'progress-track' }, [state.ui.fill]),
      ]);
    }

    function updateProgress(answered) {
      var doneCount = state.round - (answered ? 0 : 1);
      state.ui.fill.style.width = Math.round((doneCount / test.rounds) * 100) + '%';
      state.ui.okEl.textContent = '✓ ' + state.correct;
      state.ui.badEl.textContent = '✗ ' + state.wrong;
    }

    /* ---------- итог ---------- */

    function showSummary() {
      var pct = Math.round((state.correct / test.rounds) * 100);
      var msg = pct === 100 ? 'Perfekcyjnie! 🎉'
        : pct >= 80 ? 'Świetnie!'
        : pct >= 50 ? 'Nieźle, ćwicz dalej!'
        : 'Spróbuj jeszcze raz!';

      root.replaceChildren(
        el('div', { class: 'summary' }, [
          el('div', { class: 'summary-score', text: state.correct + ' / ' + test.rounds }),
          el('div', { class: 'summary-pct', text: pct + '%' }),
          el('p', { class: 'summary-msg', text: msg }),
          el('div', { class: 'summary-actions' }, [
            el('button', { class: 'btn', type: 'button', text: 'Jeszcze raz', onclick: start }),
            el('a', { class: 'btn btn-secondary', href: backHref, text: 'Wstecz' }),
          ]),
        ])
      );
    }

    start();
  }

  function showError(root, err) {
    root.replaceChildren(el('p', { class: 'error', text: '⚠️ ' + (err && err.message ? err.message : err) }));
  }

  Polski.ui = { run: run, el: el, showError: showError, types: TYPES };
})();
