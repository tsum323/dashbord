import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/db';
import { buildBackup, restoreBackup, validateBackup } from '../src/db/backup';
import { addTransaction, completeSetup, createIdea, createProject, createTask } from '../src/db/repo';
import { saveAppearance } from '../src/db/settings';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function seed() {
  await completeSetup(10_000_00, []);
  const p = await createProject({ name: 'P', icon: '▣', description: '', status: 'dev', githubUrl: '', demoUrl: '' });
  await addTransaction({ title: 'Заказ', type: 'income', amount: 5_000_00, date: '2026-10-01', category: 'clients', projectId: p.id, comment: '' });
  await createTask({ title: 'T', description: '', projectId: p.id, priority: 'high', dueDate: null, status: 'todo' });
  await createIdea({ title: 'I', description: '', audience: '', potential: '', priority: 'low', status: 'new', comments: '' });
  await saveAppearance({ dim: 0.5, blur: 10, opacity: 0.3 });
}

describe('14–15. Экспорт и импорт JSON', () => {
  it('экспорт → JSON → импорт восстанавливает все данные', async () => {
    await seed();
    const json = JSON.stringify(await buildBackup());
    const before = await buildBackup();

    await db.delete();
    await db.open();
    const res = validateBackup(JSON.parse(json));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.counts).toEqual({ projects: 1, transactions: 1, ideas: 1, tasks: 1, events: 4 });
    await restoreBackup(res.backup);

    const after = await buildBackup();
    expect(after.data).toEqual(before.data);
  });

  it('импорт заменяет существующие данные, а не дополняет', async () => {
    await seed();
    const backup = await buildBackup();
    await createProject({ name: 'Лишний', icon: '', description: '', status: 'idea', githubUrl: '', demoUrl: '' });
    await restoreBackup(backup);
    expect(await db.projects.count()).toBe(1);
  });

  it('проверка структуры и версии', async () => {
    await seed();
    const good = JSON.parse(JSON.stringify(await buildBackup()));

    expect(validateBackup('text').ok).toBe(false);
    expect(validateBackup({ ...good, app: 'other' }).ok).toBe(false);

    const newer = validateBackup({ ...good, formatVersion: 99 });
    expect(newer.ok).toBe(false);
    if (!newer.ok) expect(newer.errors[0]).toMatch(/новой версией/);

    const noVersion = { ...good };
    delete noVersion.formatVersion;
    expect(validateBackup(noVersion).ok).toBe(false);

    const badAmount = structuredClone(good);
    badAmount.data.transactions[0].amount = -5;
    const r = validateBackup(badAmount);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/amount/);

    const brokenRef = structuredClone(good);
    brokenRef.data.tasks[0].projectId = 'missing';
    expect(validateBackup(brokenRef).ok).toBe(false);

    const dupId = structuredClone(good);
    dupId.data.ideas[0].id = dupId.data.projects[0].id;
    expect(validateBackup(dupId).ok).toBe(false);
  });

  it('проверка не трогает базу: неудачный импорт оставляет данные как были', async () => {
    await seed();
    const r = validateBackup({ app: 'personal-dashboard', formatVersion: 1, data: {} });
    expect(r.ok).toBe(false);
    expect(await db.projects.count()).toBe(1);
  });
});

describe('18. Настройки внешнего вида', () => {
  it('изменения разных ползунков подряд не затирают друг друга', async () => {
    const { updateAppearance, DEFAULT_APPEARANCE } = await import('../src/db/settings');
    await Promise.all([updateAppearance({ blur: 10 }), updateAppearance({ opacity: 0.4 }), updateAppearance({ dim: 0.6 })]);
    const rec = await db.settings.get('appearance');
    expect(rec?.value).toEqual({ ...DEFAULT_APPEARANCE, blur: 10, opacity: 0.4, dim: 0.6 });
  });
});
