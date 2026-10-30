const { chromium } = require('playwright');
const fs = require('fs');
// Сквозная проверка 18 сценариев ТЗ в Chromium через интерфейс.
// Запуск: npm run build && npm run preview  (в другом окне)  →  npm run e2e
// Нужен Playwright с Chromium: npm i -D playwright && npx playwright install chromium
const path = require('path');
const os = require('os');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-e2e-'));
const photo = path.join(__dirname, 'fixtures', 'bg-a.jpg');
const photo2 = path.join(__dirname, 'fixtures', 'bg-b.jpg');
const BASE = process.env.E2E_URL || 'http://localhost:4173/dashbord/';
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message.split('\n')[0]]); }
};
const expectText = async (loc, re) => {
  await loc.first().waitFor({ timeout: 4000 });
  const t = await loc.first().innerText();
  if (!re.test(t)) throw new Error(`ожидалось ${re}, получено «${t}»`);
};
const nbsp = (s) => s.replace(/ | /g, ' ');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const URL = BASE + '#/';
  const budget = async () => nbsp(await p.locator('section', { hasText: 'Текущий бюджет' }).first().innerText());
  const dialog = () => p.getByRole('dialog');

  await p.goto(URL);

  await step('1. Мастер: начальный бюджет и импорт 8 проектов', async () => {
    await p.getByLabel('Начальный остаток, ₽').fill('100 000');
    await p.getByRole('button', { name: 'Далее' }).click();
    await p.getByRole('button', { name: /Импортировать 8/ }).click();
    await p.getByRole('heading', { name: 'Главная' }).waitFor();
    if (!/100 000 ₽/.test(await budget())) throw new Error(await budget());
  });

  await step('2. Добавление дохода (быстрая кнопка, связь с проектом)', async () => {
    await p.getByRole('button', { name: 'Доход', exact: true }).click();
    await dialog().getByLabel('Название').fill('Заказ: лендинг');
    await dialog().getByLabel('Сумма, ₽').fill('50000');
    await dialog().getByLabel('Категория').selectOption('clients');
    await dialog().getByLabel('Проект').selectOption({ label: '📈 Trading' });
    await dialog().getByRole('button', { name: 'Добавить' }).click();
    await dialog().waitFor({ state: 'detached' });
    if (!/150 000 ₽/.test(await budget())) throw new Error(await budget());
  });

  await step('3. Добавление расхода', async () => {
    await p.getByRole('button', { name: 'Расход', exact: true }).click();
    await dialog().getByLabel('Название').fill('Claude');
    await dialog().getByLabel('Сумма, ₽').fill('2 000');
    await dialog().getByLabel('Категория').selectOption('ai');
    await dialog().getByLabel('Проект').selectOption({ label: '📈 Trading' });
    await dialog().getByRole('button', { name: 'Добавить' }).click();
    await dialog().waitFor({ state: 'detached' });
    if (!/148 000 ₽/.test(await budget())) throw new Error(await budget());
  });

  await step('3a. Пустая и нулевая сумма отклоняются', async () => {
    await p.getByRole('button', { name: 'Расход', exact: true }).click();
    await dialog().getByLabel('Название').fill('Пусто');
    await dialog().getByLabel('Сумма, ₽').fill('0');
    await dialog().getByRole('button', { name: 'Добавить' }).click();
    await expectText(dialog().getByRole('alert'), /больше нуля/);
    await dialog().getByRole('button', { name: 'Отмена' }).click();
  });

  await step('4. Редактирование операции', async () => {
    await p.getByRole('link', { name: 'Финансы' }).first().click();
    await p.getByRole('button', { name: /^Claude/ }).click();
    await dialog().getByLabel('Сумма, ₽').fill('3000');
    await dialog().getByRole('button', { name: 'Сохранить' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByRole('link', { name: 'Главная' }).first().click();
    if (!/147 000 ₽/.test(await budget())) throw new Error(await budget());
  });

  await step('5. Удаление операции с подтверждением', async () => {
    await p.getByRole('button', { name: 'Расход', exact: true }).click();
    await dialog().getByLabel('Название').fill('Ошибочная');
    await dialog().getByLabel('Сумма, ₽').fill('999');
    await dialog().getByRole('button', { name: 'Добавить' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByRole('link', { name: 'Финансы' }).first().click();
    await p.getByRole('button', { name: 'Удалить операцию «Ошибочная»' }).click();
    await dialog().getByRole('button', { name: 'Отмена' }).click(); // отмена — ничего не удаляется
    if (!(await p.getByRole('button', { name: /^Ошибочная/ }).count())) throw new Error('удалилось после отмены');
    await p.getByRole('button', { name: 'Удалить операцию «Ошибочная»' }).click();
    await dialog().getByRole('button', { name: 'Удалить' }).click();
    await p.getByRole('button', { name: /^Ошибочная/ }).first().waitFor({ state: 'detached' });
    await p.getByRole('link', { name: 'Главная' }).first().click();
    if (!/147 000 ₽/.test(await budget())) throw new Error(await budget());
  });

  await step('5a. Фильтр финансов по проекту и категории', async () => {
    await p.getByRole('link', { name: 'Финансы' }).first().click();
    await p.getByLabel('Категория', { exact: true }).selectOption({ label: 'Расход · AI-сервисы' });
    await expectText(p.getByText(/Найдено операций/), /Найдено операций: 1/);
    await p.getByRole('button', { name: 'Сбросить фильтры' }).click();
    await p.getByLabel('Проект', { exact: true }).selectOption('none');
    await expectText(p.getByText(/Найдено операций/), /Найдено операций: 0/);
    await p.getByRole('button', { name: 'Сбросить фильтры' }).click();
  });

  await step('6. Финансовые показатели проекта', async () => {
    await p.getByRole('link', { name: 'Проекты' }).first().click();
    await p.getByRole('link', { name: /Trading/ }).first().click();
    const fin = nbsp(await p.locator('section', { hasText: 'Финансы проекта' }).innerText());
    if (!/Доход\s+50 000 ₽/.test(fin) || !/Расходы\s+3 000 ₽/.test(fin) || !/Результат\s+\+47 000 ₽/.test(fin)) throw new Error(fin.slice(0, 200));
  });

  await step('7. Создание проекта', async () => {
    await p.getByRole('link', { name: 'Проекты' }).first().click();
    await p.getByRole('button', { name: '+ Проект' }).click();
    await dialog().getByLabel('Название').fill('Телеграм-бот');
    await dialog().getByRole('radio', { name: '🤖' }).click();
    await dialog().getByLabel('Краткое описание').fill('Бот для записи клиентов');
    await dialog().getByRole('button', { name: 'Создать' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByRole('link', { name: /Телеграм-бот/ }).waitFor();
  });

  await step('8. Редактирование проекта и задачи', async () => {
    await p.getByRole('link', { name: /Телеграм-бот/ }).click();
    await p.getByRole('button', { name: 'Редактировать' }).click();
    await dialog().getByLabel('Название').fill('Телеграм-бот записи');
    await dialog().getByLabel('GitHub URL').fill('github.com/x');
    await dialog().getByRole('button', { name: 'Сохранить' }).click();
    await expectText(dialog().getByRole('alert'), /некорректная ссылка/);
    await dialog().getByLabel('GitHub URL').fill('https://github.com/tsum323/bot');
    await dialog().getByRole('button', { name: 'Сохранить' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByRole('heading', { name: 'Телеграм-бот записи' }).waitFor();
  });

  await step('13. Создание задач, главная задача, выполнение', async () => {
    await p.getByRole('button', { name: '+ Задача' }).click();
    await dialog().getByLabel('Название').fill('Сделать MVP');
    await dialog().getByLabel('Приоритет').selectOption('high');
    await dialog().getByLabel('Срок').fill('2026-11-05');
    await dialog().getByRole('button', { name: 'Создать' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByRole('button', { name: '+ Задача' }).click();
    await dialog().getByLabel('Название').fill('Купить домен');
    await dialog().getByRole('button', { name: 'Создать' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByRole('button', { name: 'Сделать главной следующей задачей' }).first().click();
    await p.getByRole('button', { name: 'Отметить задачу «Купить домен» выполненной' }).click();
    await p.getByRole('button', { name: /Показать выполненные · 1/ }).waitFor();
    await p.getByRole('link', { name: 'Проекты' }).first().click();
    await expectText(p.getByRole('link', { name: /Телеграм-бот записи/ }), /Сделать MVP/);
  });

  await step('9. Kanban: перетаскивание меняет статус', async () => {
    await p.getByRole('link', { name: 'Доска проектов' }).click();
    const card = p.locator('[aria-roledescription="Перетаскиваемая карточка проекта"]', { hasText: 'Телеграм-бот записи' });
    const target = p.getByRole('region', { name: /^Тестирование/ });
    const a = await card.boundingBox();
    const t = await target.boundingBox();
    await p.mouse.move(a.x + 40, a.y + 20);
    await p.mouse.down();
    await p.mouse.move(a.x + 60, a.y + 30, { steps: 5 });
    await p.mouse.move(t.x + t.width / 2, t.y + 80, { steps: 15 });
    await p.mouse.up();
    await p.getByRole('region', { name: /^Тестирование/ }).getByText('Телеграм-бот записи').waitFor({ timeout: 4000 });
  });

  await step('9a. Kanban: смена статуса через список на карточке', async () => {
    await p.getByLabel('Статус проекта «Телеграм-бот записи»').selectOption('launched');
    await p.getByRole('region', { name: /^Запущено/ }).getByText('Телеграм-бот записи').waitFor();
    await p.getByPlaceholder('Поиск по доске').fill('телеграм');
    const n = await p.locator('[aria-roledescription="Перетаскиваемая карточка проекта"]').count();
    if (n !== 1) throw new Error(`поиск оставил ${n} карточек`);
    await p.getByPlaceholder('Поиск по доске').fill('');
  });

  await step('11. Создание идеи и смена приоритета', async () => {
    await p.getByRole('link', { name: 'Банк идей' }).click();
    await p.getByRole('button', { name: '+ Идея' }).click();
    await dialog().getByLabel('Название').fill('Шаблон сайта для автосервиса');
    await dialog().getByLabel('Аудитория').fill('Автосервисы Краснодара');
    await dialog().getByLabel('Потенциал заработка').fill('30 000 ₽ за сайт');
    await dialog().getByRole('button', { name: 'Добавить' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByLabel('Приоритет идеи «Шаблон сайта для автосервиса»').selectOption('high');
  });

  await step('12. Превращение идеи в проект (предпросмотр → подтверждение)', async () => {
    await p.getByRole('button', { name: 'Превратить в проект' }).click();
    await expectText(dialog(), /Предварительная карточка/);
    await dialog().getByRole('button', { name: 'Отмена' }).click(); // отмена — проект не создан
    await p.getByRole('button', { name: 'Превратить в проект' }).click();
    await dialog().getByRole('button', { name: 'Подтвердить и создать' }).click();
    await p.getByRole('heading', { name: 'Шаблон сайта для автосервиса' }).waitFor();
    await expectText(p.getByText(/Создан из идеи/), /Шаблон сайта/);
    await p.getByRole('link', { name: 'Банк идей' }).click();
    await p.getByRole('link', { name: /Проект «Шаблон сайта/ }).waitFor();
  });

  await step('10. Лента событий: все типы, без дублей, фильтр', async () => {
    await p.getByRole('link', { name: 'Лента событий' }).click();
    await p.getByText(/Импортирован проект/).first().waitFor();
    const text = await p.locator('main').innerText();
    for (const s of ['Импортирован проект', 'Доход: Заказ: лендинг', 'Расход: Claude', 'Удалена операция «Ошибочная»', 'Создан проект «Телеграм-бот»', '«Телеграм-бот записи»: Тестирование', 'Задача: Сделать MVP', 'Выполнено: Купить домен', 'Идея: Шаблон', 'Изменена идея', '→ проект']) {
      if (!text.includes(s)) throw new Error('нет события: ' + s + ' || ' + text.replace(/\n/g,' / ').slice(-600));
    }
    const statusEvents = (text.match(/«Телеграм-бот записи»: Тестирование/g) || []).length;
    if (statusEvents !== 1) throw new Error(`событие статуса ${statusEvents} раз`);
    await p.getByLabel('Тип событий').selectOption('finance');
    await expectText(p.getByText(/Найдено:/), /Найдено: 4/);
    await p.getByLabel('Тип событий').selectOption('all');
  });

  let backupPath;
  await step('14. Экспорт JSON и дата последнего экспорта', async () => {
    await p.getByRole('link', { name: 'Настройки' }).first().click();
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Экспорт JSON' }).click()]);
    backupPath = path.join(out, dl.suggestedFilename());
    await dl.saveAs(backupPath);
    const json = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    if (json.app !== 'personal-dashboard' || json.formatVersion !== 1 || json.data.projects.length !== 10) throw new Error('структура копии: ' + json.data.projects.length);
    await expectText(p.getByText(/Последний экспорт:/), /Сегодня/);
  });

  await step('15. Импорт JSON: ошибка формата, отмена, замена', async () => {
    const bad = path.join(out, 'bad.json');
    fs.writeFileSync(bad, JSON.stringify({ app: 'personal-dashboard', formatVersion: 7, data: {} }));
    await p.getByLabel('Файл резервной копии').setInputFiles(bad);
    await expectText(dialog(), /более новой версией/);
    await dialog().getByRole('button', { name: 'Закрыть', exact: true }).last().click();

    // Лишний проект, который должен исчезнуть после импорта.
    await p.getByRole('link', { name: 'Проекты' }).first().click();
    await p.getByRole('button', { name: '+ Проект' }).click();
    await dialog().getByLabel('Название').fill('Лишний');
    await dialog().getByRole('button', { name: 'Создать' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByRole('link', { name: 'Настройки' }).first().click();

    await p.getByLabel('Файл резервной копии').setInputFiles(backupPath);
    await expectText(dialog(), /будут заменены/);
    await dialog().getByRole('button', { name: 'Отменить импорт' }).click();
    await p.getByRole('link', { name: 'Проекты' }).first().click();
    await p.getByRole('link', { name: /Лишний/ }).waitFor(); // отмена — данные не тронуты

    await p.getByRole('link', { name: 'Настройки' }).first().click();
    await p.getByLabel('Файл резервной копии').setInputFiles(backupPath);
    await dialog().getByRole('button', { name: 'Заменить данные' }).click();
    await dialog().waitFor({ state: 'detached' });
    await p.getByRole('link', { name: 'Проекты' }).first().click();
    await p.getByRole('link', { name: /Телеграм-бот записи/ }).waitFor();
    if (await p.getByRole('link', { name: /Лишний/ }).count()) throw new Error('импорт не заменил данные');
  });

  await step('17. Замена фонового изображения', async () => {
    await p.getByRole('link', { name: 'Настройки' }).first().click();
    await p.locator('input[type=file][accept="image/*"]').setInputFiles(photo);
    await p.getByLabel('Повернуть против часовой стрелки').click();
    const bg = p.locator('div[aria-hidden].fixed img');
    await bg.waitFor();
    const src1 = await bg.getAttribute('src');
    await p.locator('input[type=file][accept="image/*"]').setInputFiles(photo2);
    await p.waitForFunction((s) => document.querySelector('div[aria-hidden].fixed img')?.getAttribute('src') !== s, src1);
    await p.locator('input[type=file][accept="image/*"]').setInputFiles(photo);
    await p.getByLabel('Повернуть против часовой стрелки').click();
  });

  await step('18. Настройки прозрачности и размытия', async () => {
    const slider = p.getByLabel(/Размытие панелей/);
    await slider.fill('10');
    await p.getByLabel(/Плотность панелей/).fill('0.4');
    await p.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--glass-blur').trim() === '10px');
    const op = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glass-opacity').trim());
    if (op !== '0.4') throw new Error('opacity ' + op);
  });

  await step('16. Сохранение данных после перезапуска', async () => {
    await p.close();
    const p2 = await ctx.newPage();
    await p2.goto(URL);
    await p2.getByRole('heading', { name: 'Главная' }).waitFor();
    if (await p2.getByText('Первый запуск').count()) throw new Error('мастер показан повторно');
    const b2 = nbsp(await p2.locator('section', { hasText: 'Текущий бюджет' }).first().innerText());
    if (!/147 000 ₽/.test(b2)) throw new Error(b2);
    const blur = await p2.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--glass-blur').trim());
    if (blur !== '10px') throw new Error('размытие не сохранилось: ' + blur);
    if (!(await p2.locator('div[aria-hidden].fixed img').count())) throw new Error('фон не сохранился');
    // вернуть стекло по умолчанию для скриншотов
    await p2.goto(URL + 'settings');
    await p2.getByRole('button', { name: 'Сбросить' }).click();
    await p2.close();
  });

  for (const r of results) console.log(r.join(' | '));
  console.log('console/page errors:', errors.length ? errors : 'нет');
  await b.close();
  const failed = results.filter((r) => r[0] === 'FAIL').length + (errors.length ? 1 : 0);
  console.log(failed ? `Провалено: ${failed}` : `Все ${results.length} сценариев пройдены`);
  process.exit(failed ? 1 : 0);
})();
