/*
 * Polski — интерфейс прохождения теста.
 * Polski.ui.run(test, rootElement) — запускает тест: задания, проверка, итог.
 *
 * Типы заданий (task.type):
 *   'input'  — ввод текста; task.answer: строка или массив допустимых вариантов
 *   'choice' — выбор варианта; task.options: массив строк, task.answer: правильная строка
 *   'custom' — бандл рисует сам: test.render(task, container, submit)
 * Общие поля: task.question — инструкция ("Napisz słownie:"), task.prompt — то, что крупно.
 */
(function () {
  'use strict';

  var Polski = window.Polski;
  var POLISH_LETTERS = ['ą', 'ć', 'ę', 'ł', 'ń', 'ó', 'ś', 'ź', 'ż'];

  /** el('div', { class: 'x', onclick: fn }, [детиИлиТекст]) */
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

  /** opts.backHref — куда ведёт кнопка на итоговом экране (по умолчанию главная) */
  function run(test, root, opts) {
    var backHref = (opts && opts.backHref) || 'index.html';
    var state;

    function start() {
      state = { rng: Polski.createRng(), round: 0, score: 0 };
      nextTask();
    }

    function nextTask() {
      if (state.round >= test.rounds) return showSummary();
      state.round += 1;
      state.answered = false;
      state.task = test.generate(state.rng, { round: state.round, total: test.rounds });
      showTask();
    }

    /* ---------- экран задания ---------- */

    function showTask() {
      var task = state.task;
      var feedback = el('div', { class: 'feedback', 'aria-live': 'polite' });
      var actionBtn = el('button', { class: 'btn btn-wide', type: 'button', text: 'Sprawdź' });
      var answerArea = el('div', { class: 'answer-area' });

      function submit(answer) {
        if (state.answered) return;
        state.answered = true;
        var res = Polski.checkAnswer(test, task, answer);
        if (res.ok) state.score += 1;
        state.scoreEl.textContent = 'Punkty: ' + state.score;
        showFeedback(feedback, res, task);
        answerArea.classList.add('locked');
        actionBtn.textContent = state.round >= test.rounds ? 'Wynik' : 'Dalej';
        actionBtn.disabled = false;
        actionBtn.focus();
        return res;
      }

      actionBtn.addEventListener('click', function () {
        if (state.answered) nextTask();
        else if (getAnswer) submit(getAnswer());
      });

      var getAnswer = null;

      if (task.type === 'choice') {
        actionBtn.hidden = true; // ответ — по клику на вариант
        var opts = el('div', { class: 'options' });
        task.options.forEach(function (opt) {
          var b = el('button', { class: 'option', type: 'button', text: opt });
          b.addEventListener('click', function () {
            if (state.answered) return;
            var res = submit(opt);
            Array.prototype.forEach.call(opts.children, function (o) {
              if (o.textContent === task.answer) o.classList.add('correct');
            });
            if (!res.ok) b.classList.add('wrong');
            actionBtn.hidden = false;
          });
          opts.appendChild(b);
        });
        answerArea.appendChild(opts);
      } else if (task.type === 'custom' && typeof test.render === 'function') {
        actionBtn.hidden = true;
        test.render(task, answerArea, function (answer) {
          var res = submit(answer);
          actionBtn.hidden = false;
          return res;
        });
      } else {
        // 'input' (по умолчанию)
        var input = el('input', {
          class: 'text-input', type: 'text', autocomplete: 'off', autocapitalize: 'off',
          autocorrect: 'off', spellcheck: 'false', placeholder: 'Twoja odpowiedź…', lang: 'pl',
        });
        getAnswer = function () { return input.value; };
        actionBtn.disabled = true;
        input.addEventListener('input', function () {
          if (!state.answered) actionBtn.disabled = input.value.trim() === '';
        });
        input.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          if (!state.answered && input.value.trim() !== '') submit(input.value);
        });

        var keys = el('div', { class: 'pl-keys' }, POLISH_LETTERS.map(function (ch) {
          return el('button', {
            class: 'pl-key', type: 'button', text: ch, tabindex: '-1',
            onmousedown: function (e) { e.preventDefault(); }, // не терять фокус поля
            onclick: function () {
              if (state.answered) return;
              var s = input.selectionStart, e2 = input.selectionEnd;
              input.value = input.value.slice(0, s) + ch + input.value.slice(e2);
              input.setSelectionRange(s + 1, s + 1);
              input.focus();
              input.dispatchEvent(new Event('input'));
            },
          });
        }));

        answerArea.appendChild(input);
        answerArea.appendChild(keys);
        setTimeout(function () { input.focus(); }, 0);
      }

      root.replaceChildren(
        progressBar(),
        el('div', { class: 'task' }, [
          task.question ? el('p', { class: 'task-question', text: task.question }) : null,
          task.prompt != null ? el('div', { class: 'task-prompt', text: String(task.prompt) }) : null,
        ]),
        answerArea,
        feedback,
        actionBtn
      );
    }

    function showFeedback(box, res, task) {
      box.className = 'feedback ' + (res.ok ? 'ok' : 'bad');
      // replaceChildren превращает null в текст "null", поэтому собираем через el(), он пропускает null
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
      var pct = Math.round(((state.round - 1) / test.rounds) * 100);
      state.scoreEl = el('span', { text: 'Punkty: ' + state.score });
      return el('div', { class: 'progress' }, [
        el('div', { class: 'progress-text' }, [
          el('span', { text: 'Pytanie ' + state.round + ' / ' + test.rounds }),
          state.scoreEl,
        ]),
        el('div', { class: 'progress-track' }, [
          el('div', { class: 'progress-fill', style: 'width:' + pct + '%' }),
        ]),
      ]);
    }

    /* ---------- итог ---------- */

    function showSummary() {
      var pct = Math.round((state.score / test.rounds) * 100);
      var msg = pct === 100 ? 'Perfekcyjnie! 🎉'
        : pct >= 80 ? 'Świetnie!'
        : pct >= 50 ? 'Nieźle, ćwicz dalej!'
        : 'Spróbuj jeszcze raz!';

      root.replaceChildren(
        el('div', { class: 'summary' }, [
          el('div', { class: 'summary-score', text: state.score + ' / ' + test.rounds }),
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

  Polski.ui = { run: run, el: el, showError: showError };
})();
