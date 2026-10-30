import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/db';
import {
  addTransaction,
  completeSetup,
  convertIdeaToProject,
  createIdea,
  createProject,
  createTask,
  deleteProject,
  deleteTask,
  deleteTransaction,
  setNextTask,
  setProjectStatus,
  setTaskStatus,
  updateIdea,
  updateProject,
  updateTransaction,
  ValidationError,
  type IdeaInput,
  type ProjectInput,
  type TransactionInput,
} from '../src/db/repo';
import { calcProjectFinances, calcTotals, projectFinance } from '../src/lib/finance';

const project = (p: Partial<ProjectInput> = {}): ProjectInput => ({
  name: 'Проект',
  icon: '▣',
  description: '',
  status: 'dev',
  githubUrl: '',
  demoUrl: '',
  ...p,
});

const tx = (p: Partial<TransactionInput> = {}): TransactionInput => ({
  title: 'Операция',
  type: 'income',
  amount: 100_00,
  date: '2026-10-30',
  category: 'clients',
  projectId: null,
  comment: '',
  ...p,
});

const idea = (p: Partial<IdeaInput> = {}): IdeaInput => ({
  title: 'Идея',
  description: '',
  audience: '',
  potential: '',
  priority: 'medium',
  status: 'new',
  comments: '',
  ...p,
});

async function totals() {
  const setup = await db.settings.get('setup');
  return calcTotals(await db.transactions.toArray(), setup?.key === 'setup' ? setup.value.initialBalance : 0);
}

const eventTypes = async () => (await db.events.orderBy('createdAt').toArray()).map((e) => e.type);

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('1. Начальный бюджет', () => {
  it('бюджет равен начальному остатку, импорт создаёт проекты и события', async () => {
    await completeSetup(25_000_00, [project({ name: 'A' }), project({ name: 'B', status: 'launched' })]);
    expect((await totals()).budget).toBe(25_000_00);
    expect(await db.projects.count()).toBe(2);
    expect(await eventTypes()).toEqual(['project_created', 'project_created']);
  });

  it('отрицательный остаток отклоняется', async () => {
    await expect(completeSetup(-1, [])).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('2–5. Операции', () => {
  beforeEach(() => completeSetup(10_000_00, []));

  it('доход увеличивает бюджет и пишет событие', async () => {
    await addTransaction(tx({ amount: 5_000_00 }));
    expect(await totals()).toMatchObject({ income: 5_000_00, budget: 15_000_00, profit: 5_000_00 });
    expect(await eventTypes()).toEqual(['income_added']);
  });

  it('расход уменьшает бюджет и пишет событие', async () => {
    await addTransaction(tx({ type: 'expense', category: 'ai', amount: 1_990_00 }));
    expect(await totals()).toMatchObject({ expense: 1_990_00, budget: 8_010_00, profit: -1_990_00 });
    expect(await eventTypes()).toEqual(['expense_added']);
  });

  it('редактирование пересчитывает показатели', async () => {
    const t = await addTransaction(tx({ amount: 1_000_00 }));
    await updateTransaction(t.id, tx({ amount: 3_000_00, type: 'expense', category: 'ads' }));
    expect(await totals()).toMatchObject({ income: 0, expense: 3_000_00, budget: 7_000_00 });
  });

  it('удаление убирает операцию из бюджета и пишет событие', async () => {
    const t = await addTransaction(tx({ amount: 1_000_00 }));
    await deleteTransaction(t.id);
    expect((await totals()).budget).toBe(10_000_00);
    expect(await eventTypes()).toEqual(['income_added', 'transaction_deleted']);
  });

  it.each([
    ['нулевая сумма', { amount: 0 }],
    ['отрицательная сумма', { amount: -5 }],
    ['дробные копейки', { amount: 1.5 }],
    ['пустое название', { title: '  ' }],
    ['неверная дата', { date: '2026-02-30' }],
    ['чужая категория', { category: 'ai' as const }],
    ['несуществующий проект', { projectId: 'nope' }],
  ])('отклоняет: %s', async (_, patch) => {
    await expect(addTransaction(tx(patch))).rejects.toBeInstanceOf(ValidationError);
    expect(await db.transactions.count()).toBe(0);
    expect(await db.events.count()).toBe(0);
  });
});

describe('6. Финансы проектов', () => {
  it('считаются из операций; операции без проекта влияют только на общий бюджет', async () => {
    await completeSetup(0, []);
    const p = await createProject(project());
    await addTransaction(tx({ amount: 50_000_00, projectId: p.id }));
    await addTransaction(tx({ type: 'expense', category: 'development', amount: 20_000_00, projectId: p.id }));
    await addTransaction(tx({ type: 'expense', category: 'subscriptions', amount: 2_000_00, projectId: p.id }));
    await addTransaction(tx({ type: 'expense', category: 'other', amount: 7_000_00 }));
    const f = projectFinance(calcProjectFinances(await db.transactions.toArray()), p.id);
    expect(f).toEqual({ income: 50_000_00, invested: 20_000_00, expense: 2_000_00, result: 28_000_00 });
    expect((await totals()).budget).toBe(21_000_00);
  });

  it('удаление проекта оставляет его операции в бюджете без привязки', async () => {
    const p = await createProject(project());
    await addTransaction(tx({ amount: 1_000_00, projectId: p.id }));
    await createTask({ title: 'T', description: '', projectId: p.id, priority: 'low', dueDate: null, status: 'todo' });
    await deleteProject(p.id);
    const [t] = await db.transactions.toArray();
    expect(t.projectId).toBeNull();
    expect(await db.tasks.count()).toBe(0);
  });
});

describe('7–10. Проекты, статусы, события', () => {
  it('создание и редактирование проекта; смена статуса пишет одно событие', async () => {
    const p = await createProject(project({ name: 'Сайт' }));
    await updateProject(p.id, project({ name: 'Сайт 2', description: 'новое' }));
    expect((await db.projects.get(p.id))?.name).toBe('Сайт 2');
    expect(await eventTypes()).toEqual(['project_created']);

    await updateProject(p.id, project({ name: 'Сайт 2', status: 'testing' }));
    expect(await eventTypes()).toEqual(['project_created', 'project_status']);
  });

  it('перемещение на Kanban: повтор того же статуса событие не дублирует', async () => {
    const p = await createProject(project());
    await setProjectStatus(p.id, 'launched');
    await setProjectStatus(p.id, 'launched');
    expect((await db.projects.get(p.id))?.status).toBe('launched');
    expect((await eventTypes()).filter((t) => t === 'project_status')).toHaveLength(1);
  });

  it('некорректная ссылка отклоняется', async () => {
    await expect(createProject(project({ githubUrl: 'github.com/x' }))).rejects.toBeInstanceOf(ValidationError);
    await expect(createProject(project({ name: '' }))).rejects.toBeInstanceOf(ValidationError);
  });
});

describe('11–12. Идеи', () => {
  it('создание и изменение идеи пишут события; без изменений — без события', async () => {
    const i = await createIdea(idea({ title: 'Бот' }));
    await updateIdea(i.id, { priority: 'high' });
    await updateIdea(i.id, { priority: 'high' });
    expect(await eventTypes()).toEqual(['idea_created', 'idea_updated']);
  });

  it('превращение идеи в проект связывает их и пишет событие', async () => {
    const i = await createIdea(idea({ title: 'Бот' }));
    const p = await convertIdeaToProject(i.id, project({ name: 'Бот', status: 'idea' }));
    expect(p.sourceIdeaId).toBe(i.id);
    expect((await db.ideas.get(i.id))?.projectId).toBe(p.id);
    expect((await eventTypes()).at(-1)).toBe('idea_converted');
    await expect(convertIdeaToProject(i.id, project())).rejects.toBeInstanceOf(ValidationError);
    expect(await db.projects.count()).toBe(1);
  });
});

describe('13. Задачи', () => {
  it('создание, завершение и главная задача', async () => {
    const p = await createProject(project());
    const t = await createTask({ title: 'Лендинг', description: '', projectId: p.id, priority: 'high', dueDate: '2026-11-05', status: 'todo' });
    await setNextTask(p.id, t.id);
    expect((await db.projects.get(p.id))?.nextTaskId).toBe(t.id);

    await setTaskStatus(t.id, 'done');
    await setTaskStatus(t.id, 'done');
    const done = await db.tasks.get(t.id);
    expect(done?.status).toBe('done');
    expect(done?.completedAt).not.toBeNull();
    expect((await eventTypes()).filter((x) => x === 'task_completed')).toHaveLength(1);

    await deleteTask(t.id);
    expect((await db.projects.get(p.id))?.nextTaskId).toBeNull();
  });

  it('задача без проекта отклоняется', async () => {
    await expect(
      createTask({ title: 'X', description: '', projectId: 'nope', priority: 'low', dueDate: null, status: 'todo' }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
