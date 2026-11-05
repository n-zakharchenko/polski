# Rajd Polskiej Gramatyki — тесты польского языка

Статический сайт: HTML + CSS + JS, без сборки и зависимостей.
Открывается двойным кликом по `index.html` и так же работает на любом статическом хостинге.

## Структура

```
index.html            главная; index.html?g=<id> — страница раздела
test.html?id=<id>     общая страница прохождения теста
style.css             стили всего сайта
core/engine.js        реестр тестов, рандом, проверка ответов, дерево манифеста, загрузка бандлов
core/ui.js            экраны: задание → проверка → итог; готовые типы заданий
core/settings.js      тема и окно «Ustawienia» (PolskiSettings.addSection — свои секции)
core/account.js       вход через Google (Firebase Auth), секция «Konto», блок входа на итоге теста
core/balance.js       БАЛАНС: очки за ответы, серии, бонус, стоимость отрезков — все числа игры здесь
core/progress.js      очки пользователя в Firestore (users/{uid}), блок очков на итоге теста
journey/route.js      маршрут малюха: города по кругу (name, lat, lon, major, tier, label)
journey/poland.js     контур Польши (Natural Earth 1:50m)
journey/maluch.webp   малюх: 32 изометрических кадра из 3D-модели (Martin Trafas, CC BY 4.0)
journey/relief.webp   отмывка рельефа (Terrain Tiles, z7): серый 50% = без изменений, на карте через mix-blend-mode
journey/terrain-light.webp, terrain-dark.webp
                      пастельная раскраска: лес и вода (ESA WorldCover 2021), горы (по высоте); своя картинка на тему
journey/rivers.js     реки Natural Earth 1:10m (упрощённые), рисуются линиями внутри контура Польши
journey/journey.js    карта на главной: маршрут, пройденная часть, малюх; locate(points)
firestore.rules       правила доступа к Firestore (выкладываются командой, см. «Аккаунты»)
firebase.json, .firebaserc  настройки Firebase CLI: где правила, какой проект
privacy.html          Polityka prywatności
tests/manifest.js     дерево разделов и тестов
tests/<раздел>/<тест>/  бандл теста
```

## Манифест

```js
Polski.manifest = [
  {                                   // раздел: метаданные тут, логики нет
    id: 'liczebniki', title: 'Liczebniki', desc: '…', icon: '123',
    items: [
      { id: 'liczebniki-x', files: ['liczebniki/_data.js', 'liczebniki/x/test.js'] },  // тест
      // разделы могут быть вложенными
    ],
  },
];
```

`files` — пути относительно `tests/`, в порядке загрузки. Общие данные раздела
и бандлы, от которых тест зависит (например, «микс» из двух других), идут раньше него.

## Как добавить тест

1. Создать папку `tests/<раздел>/<тест>/` с `test.js` (и, если нужно, файлами данных).
2. Добавить запись в нужный раздел `tests/manifest.js`.

Бандлы — обычные скрипты, а не JSON или ES-модули: так сайт работает и с `file://`.
Пока логики нет, тест регистрируется с `soon: true`: карточка видна с меткой «Wkrótce», но неактивна.

## Формат бандла

```js
// tests/<id>/words.js — данные (необязательно)
Polski.data.myTest = { nouns: [ /* … */ ] };

// tests/<id>/test.js — логика
Polski.register({
  id: 'myTest',           // = имя папки
  title: 'Nazwa testu',   // заголовок на кнопке и на странице
  desc: 'Krótki opis',    // подпись на кнопке
  icon: 'Ab',             // 1–3 символа в плашке
  rounds: 10,             // сколько заданий за проход
  soon: false,            // true — заглушка без generate
  rule: { title: 'Zasada', html: '<table>…</table>' },  // необязательно: кнопка (i) внизу карточки

  // Обязательно. Генерирует одно задание.
  // rng: int(min,max), pick(arr), shuffle(arr), sample(arr,n), chance(p), float()
  // session — объект, общий для всех заданий одного прохода (план, без повторов …)
  generate(rng, { round, total, session }) {
    return { type: 'input', question: 'Napisz…', prompt: '…', answer: ['…'] };
  },

  // Необязательно. Своя проверка: вернуть true/false или { ok, hint }.
  check(task, userAnswer) { /* … */ },

  // Необязательно. Своё задание для type: 'custom'.
  render(task, container, submit) { /* нарисовать в container, вызвать submit(answer) */ },
});
```

### Задание (что возвращает `generate`)

| поле       | для        | смысл |
|------------|------------|-------|
| `type`     | все        | `'input'` \| `'choice'` \| `'slots'` \| `'custom'` |
| `question` | все        | инструкция мелко: «Napisz słownie:» |
| `prompt`   | все        | то, что крупно: «7» |
| `answer`   | все        | правильный ответ; для `input` можно массив допустимых вариантов |
| `options`  | `choice`   | варианты ответа (среди них должен быть `answer`) |
| `explain`  | все        | пояснение после ответа (необязательно) |
| …          | `custom`   | любые свои поля |

### Тип `slots` — предложение с цветными рамками

```js
{
  type: 'slots',
  source: 'Pies leży na trawie.',                       // исходное предложение сверху
  sentence: [{ num: 5 }, { slot: 'noun' }, { slot: 'verb' }, 'na trawie.'],
  slots: {
    noun: { color: 'yellow', label: 'Rzeczownik', options: ['pies', 'psy', 'psów'], answer: 'psów' },
    verb: { color: 'green',  label: 'Czasownik',  options: ['leżeć', 'leży', 'leżą'], answer: 'leży' },
  },
}
```

Клик по варианту — слово летит в рамку своего цвета; когда заполнены все рамки, ответ проверяется:
«Dokładnie!» (0 ошибок), «Prawie!» (1), «O kurde!» (2) и подсказка с правильным словом над ошибочной рамкой.
До проверки клик по заполненной рамке возвращает слово обратно.

Переводы (долгое нажатие пальцем или задержка курсора):
- `source` и текстовые части `sentence` могут быть `{ text, tr }`;
- у числа `{ num }` подсказкой по умолчанию служат цифры;
- `slots.<имя>.tr` — строка (одна для всех вариантов) или `{ вариант: перевод }`.
Работает для любого элемента с атрибутом `data-tr`; после долгого нажатия вариант не выбирается.

### Помощники движка

- `Polski.mixedSequence(rng, ['A', 'B'], n, { maxRun: 3 })` — перемешанная последовательность меток:
  поровну, не больше `maxRun` подряд, без строгого чередования.

Проверка по умолчанию не учитывает регистр и лишние пробелы. Если в ответе пропущены польские буквы (`piec` вместо `pięć`), ответ не засчитывается, но выводится подсказка.

## Аккаунты (Firebase)

- Проект Firebase `polski-3f3c1`; конфиг — в `core/account.js`. Он публичный по замыслу Firebase,
  данные защищают правила из `firestore.rules`. Сервисные ключи в репозиторий не кладём.
- Правила меняем только в `firestore.rules` и выкладываем командой (в консоли руками не правим,
  иначе файл и база разъедутся). Один раз на машине: `npx firebase-tools@15.34.1 login`. Дальше:

  ```
  npx firebase-tools@15.34.1 deploy --only firestore:rules
  ```
- Без входа Firebase не загружается. SDK (`gstatic.com/firebasejs/<версия>/`) грузится при открытии
  настроек, на итоге теста или сразу, если в браузере уже был вход (`localStorage['polski.account']`).
- Вход только popup-окном: редирект на чужом домене (github.io) ломается из-за блокировки сторонних cookie.
- Данные пользователя — в `users/{uid}` (без e-mail). Модуль данных регистрирует удаление своих данных
  через `PolskiAccount.onBeforeDelete(fn)`, чтобы «Usuń konto» стирало всё.
- С `file://` вход не работает (секция «Konto» это пишет).

## Podróż: очки и карта

- Очки считаются в `core/ui.js` по правилам `core/balance.js` и видны только после входа.
  Сохраняются один раз — на итоге теста (`Polski.progress.mountSummary`); вошёл прямо на итоге — тест тоже сохранится.
- Малюх едет непрерывно: сумма очков = пробег по маршруту (`Polski.journey.locate`).
- Поменяли баланс так, что максимум за тест (`Polski.balance.maxForTest`) больше 5000, — поднимите лимит в `firestore.rules`.

## Публикация и кэш

GitHub Pages и браузеры кэшируют файлы (~10 минут), и без защиты после пуша страница могла взять
новый `journey.js` со старым `progress.js`. Поэтому у всех наших файлов есть метка версии `?v=ГГГГММДД-ЧЧММ`
(`window.POLSKI_V` в `<head>` каждой страницы; бандлы тестов и картинки карты получают её через `Polski.withVersion`).

Перед каждым `git push`:

```
node tools/bump-version.js
```

Новая страница или новый подключаемый файл — добавьте его с `?v=…` (и страницу — в `PAGES` в скрипте).

## Стили оформления (Styl) и пробы новых

- На сайте два стиля: **Pastelowy** (`designs/01-retro-pastel.css`, по умолчанию) и **Gazeta**
  (`designs/02-gazeta.css` + шапка главной `designs/02-gazeta.js`). Выбор — «Ustawienia → Styl»,
  хранится в localStorage `polski.style`. Оба CSS подключены в `<head>` каждой страницы и ограничены
  атрибутом `<html data-design="…">` (его ставит `core/settings.js` до отрисовки) — без мигания.
- Каждый стиль поверх `style.css`; у каждого своя дневная и ночная палитра (Motyw).
- Шрифты стилей — Google Fonts (указано в политике конфиденциальности).
- Форму вариантов ответов и рамок (`.chip`, `.slot`) стили не меняют; их цвета — только по просьбе.

Пробы новых вариантов — **только на localhost**:
- новый вариант — `designs/<id>.css` (+ необязательный `designs/<id>.js`) и строка в `designs/list.js`;
  `?design=<id>` включает его (файлы подгружаются на лету), `?design=none` — базовый `style.css` без стилей;
- внизу слева переключатель 🎨, ⧉ — сравнение `designs/compare.html` (все варианты рядом в ширине телефона),
  🎛 — живой редактор цветов `designs/colors.js` («Скопировать CSS» → переносим в файл варианта),
  «📌 Вердикты» — неподвижные образцы плашек «Dokładnie! / Prawie! / O kurde!»;
- готовый вариант в продакшен: подключить его CSS (и JS) в `<head>` страниц и добавить в `STYLES` в `core/settings.js`.

## Локальный запуск

Двойной клик по `index.html`. Если нужен «как на хостинге» — `python3 -m http.server` в папке проекта и http://localhost:8000.
