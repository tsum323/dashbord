import Dexie, { type EntityTable } from 'dexie';
import type { AppEvent, Idea, Project, SettingsRecord, Task, Transaction } from './types';

export const DB_NAME = 'personal-dashboard';

export class DashboardDB extends Dexie {
  projects!: EntityTable<Project, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  ideas!: EntityTable<Idea, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  events!: EntityTable<AppEvent, 'id'>;
  settings!: EntityTable<SettingsRecord, 'key'>;

  constructor(name = DB_NAME) {
    super(name);
    // Индексы — только поля, по которым идёт поиск и сортировка.
    this.version(1).stores({
      projects: 'id, status, archived, createdAt',
      transactions: 'id, type, date, category, projectId, createdAt',
      ideas: 'id, status, priority, createdAt',
      tasks: 'id, projectId, status, dueDate, createdAt',
      events: 'id, type, createdAt, projectId',
      settings: 'key',
    });
  }
}

export const db = new DashboardDB();

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}
