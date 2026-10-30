import { db, nowIso } from './db';
import type { Appearance, AppEvent, Idea, Project, Task, Transaction } from './types';
import { isValidISODate } from '../lib/date';
import { EVENT_TYPE, EXPENSE_CATEGORY, IDEA_STATUS, INCOME_CATEGORY, PRIORITY, PROJECT_STATUS, TASK_STATUS } from '../lib/labels';

export const BACKUP_APP = 'personal-dashboard';
export const BACKUP_FORMAT_VERSION = 1;

/** Фоновое фото в копию не входит: оно хранится только на устройстве. */
export interface Backup {
  app: typeof BACKUP_APP;
  formatVersion: number;
  appVersion: string;
  exportedAt: string;
  data: {
    projects: Project[];
    transactions: Transaction[];
    ideas: Idea[];
    tasks: Task[];
    events: AppEvent[];
    settings: { initialBalance: number | null; setupCompletedAt: string | null; appearance: Appearance | null };
  };
}

export async function buildBackup(): Promise<Backup> {
  return db.transaction('r', [db.projects, db.transactions, db.ideas, db.tasks, db.events, db.settings], async () => {
    const setup = await db.settings.get('setup');
    const appearance = await db.settings.get('appearance');
    return {
      app: BACKUP_APP,
      formatVersion: BACKUP_FORMAT_VERSION,
      appVersion: __APP_VERSION__,
      exportedAt: nowIso(),
      data: {
        projects: await db.projects.toArray(),
        transactions: await db.transactions.toArray(),
        ideas: await db.ideas.toArray(),
        tasks: await db.tasks.toArray(),
        events: await db.events.toArray(),
        settings: {
          initialBalance: setup?.key === 'setup' ? setup.value.initialBalance : null,
          setupCompletedAt: setup?.key === 'setup' ? setup.value.completedAt : null,
          appearance: appearance?.key === 'appearance' ? appearance.value : null,
        },
      },
    };
  });
}

export async function markExported(at = nowIso()): Promise<void> {
  await db.settings.put({ key: 'lastExportAt', value: at });
}

export function backupFileName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `personal-dashboard-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}.json`;
}

// ───────────────────────── Проверка файла ─────────────────────────

export type ValidationResult =
  | { ok: true; backup: Backup; counts: Record<'projects' | 'transactions' | 'ideas' | 'tasks' | 'events', number> }
  | { ok: false; errors: string[] };

type Rec = Record<string, unknown>;
const isObj = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNullableStr = (v: unknown) => v === null || isStr(v);
const isIso = (v: unknown) => isStr(v) && !Number.isNaN(Date.parse(v));

const MAX_ERRORS = 10;

export function validateBackup(raw: unknown): ValidationResult {
  const errors: string[] = [];
  const err = (msg: string) => errors.length < MAX_ERRORS && errors.push(msg);

  if (!isObj(raw)) return { ok: false, errors: ['Файл не похож на резервную копию: ожидался JSON-объект.'] };
  if (raw.app !== BACKUP_APP) return { ok: false, errors: ['Это не резервная копия Personal Dashboard.'] };
  if (typeof raw.formatVersion !== 'number' || !Number.isInteger(raw.formatVersion))
    return { ok: false, errors: ['В файле нет версии формата.'] };
  if (raw.formatVersion > BACKUP_FORMAT_VERSION)
    return { ok: false, errors: [`Файл создан более новой версией приложения (формат ${raw.formatVersion}). Обновите страницу.`] };
  if (raw.formatVersion < 1) return { ok: false, errors: [`Неизвестная версия формата: ${raw.formatVersion}.`] };
  if (!isObj(raw.data)) return { ok: false, errors: ['В файле нет раздела data.'] };

  const d = raw.data;
  const tables = ['projects', 'transactions', 'ideas', 'tasks', 'events'] as const;
  for (const t of tables) if (!Array.isArray(d[t])) err(`Раздел «${t}» отсутствует или не является списком.`);
  if (!isObj(d.settings)) err('Раздел «settings» отсутствует.');
  if (errors.length) return { ok: false, errors };

  const ids = new Set<string>();
  const check = (table: string, i: number, cond: boolean, field: string) => {
    if (!cond) err(`${table}[${i}]: некорректное поле «${field}».`);
  };
  const checkId = (table: string, i: number, r: Rec) => {
    check(table, i, isStr(r.id) && r.id.length > 0, 'id');
    if (isStr(r.id)) {
      if (ids.has(r.id)) err(`${table}[${i}]: повторяющийся id.`);
      ids.add(r.id);
    }
  };

  const projects = d.projects as unknown[];
  const projectIds = new Set<string>();
  projects.forEach((r, i) => {
    if (!isObj(r)) return err(`projects[${i}]: не объект.`);
    checkId('projects', i, r);
    if (isStr(r.id)) projectIds.add(r.id);
    check('projects', i, isStr(r.name) && r.name.trim() !== '', 'name');
    check('projects', i, isStr(r.status) && r.status in PROJECT_STATUS, 'status');
    check('projects', i, typeof r.archived === 'boolean', 'archived');
    for (const f of ['icon', 'description', 'githubUrl', 'demoUrl']) check('projects', i, isStr(r[f]), f);
    for (const f of ['nextTaskId', 'sourceIdeaId']) check('projects', i, isNullableStr(r[f]), f);
    check('projects', i, isIso(r.createdAt), 'createdAt');
  });
  const projectRef = (table: string, i: number, v: unknown, nullable: boolean) => {
    if (v === null && nullable) return;
    if (!isStr(v) || !projectIds.has(v)) err(`${table}[${i}]: ссылка на несуществующий проект.`);
  };

  (d.transactions as unknown[]).forEach((r, i) => {
    if (!isObj(r)) return err(`transactions[${i}]: не объект.`);
    checkId('transactions', i, r);
    check('transactions', i, isStr(r.title) && r.title.trim() !== '', 'title');
    check('transactions', i, r.type === 'income' || r.type === 'expense', 'type');
    check('transactions', i, typeof r.amount === 'number' && Number.isSafeInteger(r.amount) && r.amount > 0, 'amount');
    check('transactions', i, isStr(r.date) && isValidISODate(r.date), 'date');
    const cats = r.type === 'income' ? INCOME_CATEGORY : EXPENSE_CATEGORY;
    check('transactions', i, isStr(r.category) && r.category in cats, 'category');
    check('transactions', i, isStr(r.comment), 'comment');
    projectRef('transactions', i, r.projectId, true);
  });

  (d.ideas as unknown[]).forEach((r, i) => {
    if (!isObj(r)) return err(`ideas[${i}]: не объект.`);
    checkId('ideas', i, r);
    check('ideas', i, isStr(r.title) && r.title.trim() !== '', 'title');
    check('ideas', i, isStr(r.status) && r.status in IDEA_STATUS, 'status');
    check('ideas', i, isStr(r.priority) && r.priority in PRIORITY, 'priority');
    for (const f of ['description', 'audience', 'potential', 'comments']) check('ideas', i, isStr(r[f]), f);
    projectRef('ideas', i, r.projectId, true);
  });

  (d.tasks as unknown[]).forEach((r, i) => {
    if (!isObj(r)) return err(`tasks[${i}]: не объект.`);
    checkId('tasks', i, r);
    check('tasks', i, isStr(r.title) && r.title.trim() !== '', 'title');
    check('tasks', i, isStr(r.status) && r.status in TASK_STATUS, 'status');
    check('tasks', i, isStr(r.priority) && r.priority in PRIORITY, 'priority');
    check('tasks', i, r.dueDate === null || (isStr(r.dueDate) && isValidISODate(r.dueDate)), 'dueDate');
    projectRef('tasks', i, r.projectId, false);
  });

  (d.events as unknown[]).forEach((r, i) => {
    if (!isObj(r)) return err(`events[${i}]: не объект.`);
    checkId('events', i, r);
    check('events', i, isStr(r.type) && r.type in EVENT_TYPE, 'type');
    check('events', i, isStr(r.title), 'title');
    check('events', i, isIso(r.createdAt), 'createdAt');
    // События могут ссылаться на удалённые проекты — это история.
    check('events', i, isNullableStr(r.projectId), 'projectId');
  });

  const s = d.settings as Rec;
  const ib = s.initialBalance;
  if (!(ib === null || (typeof ib === 'number' && Number.isSafeInteger(ib) && ib >= 0))) err('settings: некорректный начальный остаток.');
  if (s.appearance !== null && s.appearance !== undefined) {
    const a = s.appearance;
    if (!isObj(a) || !['dim', 'blur', 'opacity'].every((k) => typeof a[k] === 'number')) err('settings: некорректные настройки внешнего вида.');
  }

  if (errors.length) return { ok: false, errors };
  const backup = raw as unknown as Backup;
  return {
    ok: true,
    backup,
    counts: {
      projects: backup.data.projects.length,
      transactions: backup.data.transactions.length,
      ideas: backup.data.ideas.length,
      tasks: backup.data.tasks.length,
      events: backup.data.events.length,
    },
  };
}

export async function parseBackupFile(file: File): Promise<ValidationResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { ok: false, errors: ['Файл повреждён или это не JSON.'] };
  }
  return validateBackup(raw);
}

/**
 * Полностью заменяет данные содержимым копии. Фоновое фото и дата последнего экспорта
 * остаются от текущего устройства.
 */
export async function restoreBackup(backup: Backup): Promise<void> {
  const { data } = backup;
  await db.transaction('rw', [db.projects, db.transactions, db.ideas, db.tasks, db.events, db.settings], async () => {
    await Promise.all([db.projects.clear(), db.transactions.clear(), db.ideas.clear(), db.tasks.clear(), db.events.clear()]);
    await db.settings.bulkDelete(['setup', 'appearance']);
    await db.projects.bulkAdd(data.projects);
    await db.transactions.bulkAdd(data.transactions);
    await db.ideas.bulkAdd(data.ideas);
    await db.tasks.bulkAdd(data.tasks);
    await db.events.bulkAdd(data.events);
    if (data.settings.initialBalance !== null) {
      await db.settings.put({
        key: 'setup',
        value: { initialBalance: data.settings.initialBalance, completedAt: data.settings.setupCompletedAt ?? nowIso() },
      });
    }
    if (data.settings.appearance) await db.settings.put({ key: 'appearance', value: data.settings.appearance });
  });
}
