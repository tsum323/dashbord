# Personal Dashboard

Личная панель управления проектами, финансами, задачами и идеями.
Работает в браузере, все данные хранятся локально (IndexedDB). Сервера и авторизации нет.

**Сайт:** https://tsum323.github.io/dashbord/

> Статус: этап 2 — каркас приложения. Полное описание появится на этапе документации.

## Запуск

Нужен Node.js 22+.

```bash
npm install
npm run dev        # http://localhost:5173/dashbord/
npm test           # автотесты (vitest)
npm run typecheck  # проверка типов
npm run build      # сборка в dist/
```

## Публикация

`.github/workflows/pages.yml` собирает и публикует сайт при каждом изменении `main`.
Однократно: Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Структура

```
src/
  db/           Dexie-схема, типы данных, настройки внешнего вида
  lib/          деньги (копейки ↔ рубли), финансовые расчёты
  data/         подтверждённые проекты из аудита GitHub (для импорта)
  components/   layout/ — фон, боковое меню, каркас; ui/ — стеклянные карточки
  pages/        разделы приложения
tests/          vitest + fake-indexeddb
```

Деньги хранятся в копейках (целые числа); все показатели вычисляются из операций.
