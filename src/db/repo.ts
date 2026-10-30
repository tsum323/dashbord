import { db, newId, nowIso } from './db';
import type {
  AppEvent,
  EventType,
  ExpenseCategory,
  ID,
  Idea,
  IncomeCategory,
  Project,
  ProjectStatus,
  Task,
  TaskStatus,
  Transaction,
} from './types';
import { EXPENSE_CATEGORY, INCOME_CATEGORY, PROJECT_STATUS } from '../lib/labels';
import { formatRub } from '../lib/money';
import { isValidISODate } from '../lib/date';

/**
 * Все изменения данных идут через эти функции.
 * Событие ленты пишется в той же транзакции, что и само изменение, — ровно один раз
 * на действие пользователя. Повторная отрисовка интерфейса событий не создаёт.
 */

export class ValidationError extends Error {}

function required(value: string, field: string): string {
  const v = value.trim();
  if (!v) throw new ValidationError(`Заполните поле «${field}».`);
  return v;
}

// Время событий строго возрастает: события из одного действия (импорт нескольких проектов)
// не получают одинаковую метку и не меняются местами в ленте.
let lastEventTs = 0;
function eventTimestamp(): string {
  lastEventTs = Math.max(Date.now(), lastEventTs + 1);
  return new Date(lastEventTs).toISOString();
}

async function logEvent(type: EventType, title: string, description = '', projectId: ID | null = null) {
  const event: AppEvent = { id: newId(), type, title, description, createdAt: eventTimestamp(), projectId };
  await db.events.add(event);
}

const ALL_TABLES = () => [db.projects, db.transactions, db.ideas, db.tasks, db.events, db.settings];

// ───────────────────────── Настройка ─────────────────────────

export interface ProjectInput {
  name: string;
  icon: string;
  description: string;
  status: ProjectStatus;
  githubUrl: string;
  demoUrl: string;
}

function cleanUrl(url: string, field: string): string {
  const v = url.trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    return v;
  } catch {
    throw new ValidationError(`«${field}» — некорректная ссылка. Начните с https://`);
  }
}

function cleanProject(input: ProjectInput): ProjectInput {
  if (!(input.status in PROJECT_STATUS)) throw new ValidationError('Неизвестный статус проекта.');
  return {
    name: required(input.name, 'Название'),
    icon: input.icon.trim() || '▣',
    description: input.description.trim(),
    status: input.status,
    githubUrl: cleanUrl(input.githubUrl, 'GitHub'),
    demoUrl: cleanUrl(input.demoUrl, 'Demo'),
  };
}

function buildProject(input: ProjectInput, sourceIdeaId: ID | null = null): Project {
  const now = nowIso();
  return {
    ...cleanProject(input),
    id: newId(),
    archived: false,
    nextTaskId: null,
    sourceIdeaId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Первичная настройка: начальный остаток и (по желанию) импорт подтверждённых проектов. */
export async function completeSetup(initialBalance: number, projects: ProjectInput[]): Promise<void> {
  if (!Number.isSafeInteger(initialBalance) || initialBalance < 0) throw new ValidationError('Некорректный начальный остаток.');
  await db.transaction('rw', db.settings, db.projects, db.events, async () => {
    await db.settings.put({ key: 'setup', value: { initialBalance, completedAt: nowIso() } });
    for (const input of projects) {
      const p = buildProject(input);
      await db.projects.add(p);
      await logEvent('project_created', `Импортирован проект «${p.name}»`, 'Из GitHub', p.id);
    }
  });
}

export async function setInitialBalance(initialBalance: number): Promise<void> {
  if (!Number.isSafeInteger(initialBalance) || initialBalance < 0) throw new ValidationError('Некорректный начальный остаток.');
  const rec = await db.settings.get('setup');
  const completedAt = rec?.key === 'setup' ? rec.value.completedAt : nowIso();
  await db.settings.put({ key: 'setup', value: { initialBalance, completedAt } });
}

// ───────────────────────── Проекты ─────────────────────────

export async function createProject(input: ProjectInput): Promise<Project> {
  const p = buildProject(input);
  await db.transaction('rw', db.projects, db.events, async () => {
    await db.projects.add(p);
    await logEvent('project_created', `Создан проект «${p.name}»`, PROJECT_STATUS[p.status], p.id);
  });
  return p;
}

export async function updateProject(id: ID, input: ProjectInput): Promise<void> {
  const clean = cleanProject(input);
  await db.transaction('rw', db.projects, db.events, async () => {
    const old = await db.projects.get(id);
    if (!old) throw new ValidationError('Проект не найден.');
    await db.projects.update(id, { ...clean, updatedAt: nowIso() });
    if (old.status !== clean.status) await logStatusChange(clean.name, old.status, clean.status, id);
  });
}

async function logStatusChange(name: string, from: ProjectStatus, to: ProjectStatus, id: ID) {
  await logEvent('project_status', `«${name}»: ${PROJECT_STATUS[to]}`, `${PROJECT_STATUS[from]} → ${PROJECT_STATUS[to]}`, id);
}

/** Смена статуса (Kanban). Если статус не изменился — ничего не пишет. */
export async function setProjectStatus(id: ID, status: ProjectStatus): Promise<void> {
  await db.transaction('rw', db.projects, db.events, async () => {
    const p = await db.projects.get(id);
    if (!p || p.status === status) return;
    await db.projects.update(id, { status, updatedAt: nowIso() });
    await logStatusChange(p.name, p.status, status, id);
  });
}

export async function setProjectArchived(id: ID, archived: boolean): Promise<void> {
  await db.projects.update(id, { archived, updatedAt: nowIso() });
}

/**
 * Удаление проекта: задачи проекта удаляются, операции остаются в бюджете без привязки,
 * у идеи снимается ссылка на проект. События остаются в истории.
 */
export async function deleteProject(id: ID): Promise<void> {
  await db.transaction('rw', [db.projects, db.tasks, db.transactions, db.ideas], async () => {
    await db.tasks.where('projectId').equals(id).delete();
    await db.transactions.where('projectId').equals(id).modify({ projectId: null });
    await db.ideas.filter((i) => i.projectId === id).modify({ projectId: null });
    await db.projects.delete(id);
  });
}

// ───────────────────────── Операции ─────────────────────────

export interface TransactionInput {
  title: string;
  type: Transaction['type'];
  amount: number; // копейки
  date: string;
  category: ExpenseCategory | IncomeCategory;
  projectId: ID | null;
  comment: string;
}

async function cleanTransaction(input: TransactionInput): Promise<TransactionInput> {
  if (input.type !== 'income' && input.type !== 'expense') throw new ValidationError('Выберите тип операции.');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new ValidationError('Сумма должна быть больше нуля.');
  if (!isValidISODate(input.date)) throw new ValidationError('Укажите корректную дату.');
  const cats = input.type === 'income' ? INCOME_CATEGORY : EXPENSE_CATEGORY;
  if (!(input.category in cats)) throw new ValidationError('Выберите категорию.');
  if (input.projectId && !(await db.projects.get(input.projectId))) throw new ValidationError('Связанный проект не найден.');
  return { ...input, title: required(input.title, 'Название'), comment: input.comment.trim(), projectId: input.projectId || null };
}

export async function addTransaction(input: TransactionInput): Promise<Transaction> {
  const clean = await cleanTransaction(input);
  const now = nowIso();
  const t: Transaction = { ...clean, id: newId(), createdAt: now, updatedAt: now };
  await db.transaction('rw', db.transactions, db.events, async () => {
    await db.transactions.add(t);
    const income = t.type === 'income';
    await logEvent(
      income ? 'income_added' : 'expense_added',
      `${income ? 'Доход' : 'Расход'}: ${t.title}`,
      `${income ? '+' : '−'}${formatRub(t.amount)}`,
      t.projectId,
    );
  });
  return t;
}

export async function updateTransaction(id: ID, input: TransactionInput): Promise<void> {
  const clean = await cleanTransaction(input);
  const n = await db.transactions.update(id, { ...clean, updatedAt: nowIso() });
  if (!n && !(await db.transactions.get(id))) throw new ValidationError('Операция не найдена.');
}

export async function deleteTransaction(id: ID): Promise<void> {
  await db.transaction('rw', db.transactions, db.events, async () => {
    const t = await db.transactions.get(id);
    if (!t) return;
    await db.transactions.delete(id);
    await logEvent(
      'transaction_deleted',
      `Удалена операция «${t.title}»`,
      `${t.type === 'income' ? 'Доход' : 'Расход'} ${formatRub(t.amount)}`,
      t.projectId,
    );
  });
}

// ───────────────────────── Задачи ─────────────────────────

export interface TaskInput {
  title: string;
  description: string;
  projectId: ID;
  priority: Task['priority'];
  dueDate: string | null;
  status: TaskStatus;
}

async function cleanTask(input: TaskInput): Promise<TaskInput> {
  if (!input.projectId || !(await db.projects.get(input.projectId))) throw new ValidationError('Выберите проект.');
  if (input.dueDate && !isValidISODate(input.dueDate)) throw new ValidationError('Укажите корректный срок.');
  return { ...input, title: required(input.title, 'Название'), description: input.description.trim(), dueDate: input.dueDate || null };
}

export async function createTask(input: TaskInput): Promise<Task> {
  const clean = await cleanTask(input);
  const t: Task = {
    ...clean,
    id: newId(),
    createdAt: nowIso(),
    completedAt: clean.status === 'done' ? nowIso() : null,
  };
  await db.transaction('rw', db.tasks, db.events, async () => {
    await db.tasks.add(t);
    await logEvent('task_created', `Задача: ${t.title}`, '', t.projectId);
  });
  return t;
}

export async function updateTask(id: ID, input: TaskInput): Promise<void> {
  const clean = await cleanTask(input);
  await db.transaction('rw', [db.tasks, db.projects, db.events], async () => {
    const old = await db.tasks.get(id);
    if (!old) throw new ValidationError('Задача не найдена.');
    await db.tasks.update(id, { ...clean, completedAt: completedAtFor(old, clean.status) });
    if (old.projectId !== clean.projectId) await clearNextTask(old.projectId, id);
    if (old.status !== 'done' && clean.status === 'done') await logTaskCompleted({ ...old, ...clean });
  });
}

function completedAtFor(old: Task, status: TaskStatus): string | null {
  if (status !== 'done') return null;
  return old.completedAt ?? nowIso();
}

async function logTaskCompleted(t: Task) {
  await logEvent('task_completed', `Выполнено: ${t.title}`, '', t.projectId);
}

export async function setTaskStatus(id: ID, status: TaskStatus): Promise<void> {
  await db.transaction('rw', db.tasks, db.events, async () => {
    const t = await db.tasks.get(id);
    if (!t || t.status === status) return;
    await db.tasks.update(id, { status, completedAt: completedAtFor(t, status) });
    if (status === 'done') await logTaskCompleted(t);
  });
}

async function clearNextTask(projectId: ID, taskId: ID) {
  const p = await db.projects.get(projectId);
  if (p?.nextTaskId === taskId) await db.projects.update(projectId, { nextTaskId: null });
}

export async function deleteTask(id: ID): Promise<void> {
  await db.transaction('rw', db.tasks, db.projects, async () => {
    const t = await db.tasks.get(id);
    if (!t) return;
    await db.tasks.delete(id);
    await clearNextTask(t.projectId, id);
  });
}

/** Главная следующая задача проекта (null — снять). */
export async function setNextTask(projectId: ID, taskId: ID | null): Promise<void> {
  if (taskId) {
    const t = await db.tasks.get(taskId);
    if (!t || t.projectId !== projectId) throw new ValidationError('Задача не относится к проекту.');
  }
  await db.projects.update(projectId, { nextTaskId: taskId, updatedAt: nowIso() });
}

// ───────────────────────── Идеи ─────────────────────────

export interface IdeaInput {
  title: string;
  description: string;
  audience: string;
  potential: string;
  priority: Idea['priority'];
  status: Idea['status'];
  comments: string;
}

function cleanIdea(input: IdeaInput): IdeaInput {
  return {
    ...input,
    title: required(input.title, 'Название'),
    description: input.description.trim(),
    audience: input.audience.trim(),
    potential: input.potential.trim(),
    comments: input.comments.trim(),
  };
}

export async function createIdea(input: IdeaInput): Promise<Idea> {
  const now = nowIso();
  const idea: Idea = { ...cleanIdea(input), id: newId(), projectId: null, createdAt: now, updatedAt: now };
  await db.transaction('rw', db.ideas, db.events, async () => {
    await db.ideas.add(idea);
    await logEvent('idea_created', `Идея: ${idea.title}`);
  });
  return idea;
}

export async function updateIdea(id: ID, patch: Partial<IdeaInput>): Promise<void> {
  await db.transaction('rw', db.ideas, db.events, async () => {
    const old = await db.ideas.get(id);
    if (!old) throw new ValidationError('Идея не найдена.');
    const next = cleanIdea({ ...old, ...patch });
    const changed = (Object.keys(next) as (keyof IdeaInput)[]).filter((k) => next[k] !== old[k]);
    if (!changed.length) return;
    await db.ideas.update(id, { ...next, updatedAt: nowIso() });
    await logEvent('idea_updated', `Изменена идея «${next.title}»`, '', old.projectId);
  });
}

export async function deleteIdea(id: ID): Promise<void> {
  await db.ideas.delete(id);
}

/** Превращает идею в проект (после подтверждения в интерфейсе) и связывает их. */
export async function convertIdeaToProject(ideaId: ID, input: ProjectInput): Promise<Project> {
  let project!: Project;
  await db.transaction('rw', db.ideas, db.projects, db.events, async () => {
    const idea = await db.ideas.get(ideaId);
    if (!idea) throw new ValidationError('Идея не найдена.');
    if (idea.projectId && (await db.projects.get(idea.projectId))) throw new ValidationError('Идея уже превращена в проект.');
    project = buildProject(input, ideaId);
    await db.projects.add(project);
    await db.ideas.update(ideaId, { projectId: project.id, updatedAt: nowIso() });
    await logEvent('idea_converted', `Идея «${idea.title}» → проект «${project.name}»`, '', project.id);
  });
  return project;
}

/** Только для резервного копирования: полная очистка. */
export async function clearAll(): Promise<void> {
  await db.transaction('rw', ALL_TABLES(), async () => {
    await Promise.all(ALL_TABLES().map((t) => t.clear()));
  });
}
