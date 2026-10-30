import { describe, expect, it } from 'vitest';
import { DashboardDB } from '../src/db/db';

describe('DashboardDB', () => {
  it('данные сохраняются после повторного открытия базы', async () => {
    const name = `test-${Math.random()}`;
    const a = new DashboardDB(name);
    await a.settings.put({ key: 'lastExportAt', value: '2026-10-30T10:00:00.000Z' });
    a.close();
    const b = new DashboardDB(name);
    expect(await b.settings.get('lastExportAt')).toEqual({ key: 'lastExportAt', value: '2026-10-30T10:00:00.000Z' });
    expect(b.tables.map((t) => t.name).sort()).toEqual(['events', 'ideas', 'projects', 'settings', 'tasks', 'transactions']);
    b.close();
  });
});
