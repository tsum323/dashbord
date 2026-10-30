import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db } from './db';
import type { ID, Project } from './types';
import { calcProjectFinances } from '../lib/finance';
import { errorText, useToast } from '../components/ui/Feedback';

// Чтение данных: компоненты перерисовываются сами при любом изменении в IndexedDB.
// undefined — данные ещё загружаются.

export const useProjects = () => useLiveQuery(() => db.projects.orderBy('createdAt').reverse().toArray());
export const useTransactions = () => useLiveQuery(() => db.transactions.toArray());
export const useTasks = () => useLiveQuery(() => db.tasks.toArray());
export const useIdeas = () => useLiveQuery(() => db.ideas.orderBy('createdAt').reverse().toArray());
export const useEvents = (limit?: number) =>
  useLiveQuery(() => {
    const q = db.events.orderBy('createdAt').reverse();
    return limit ? q.limit(limit).toArray() : q.toArray();
  }, [limit]);

export function useProjectMap(projects: Project[] | undefined): Map<ID, Project> {
  return useMemo(() => new Map((projects ?? []).map((p) => [p.id, p])), [projects]);
}

export function useProjectFinances() {
  const transactions = useTransactions();
  return useMemo(() => (transactions ? calcProjectFinances(transactions) : undefined), [transactions]);
}

export function useLastExport() {
  return useLiveQuery(async () => {
    const r = await db.settings.get('lastExportAt');
    return r?.key === 'lastExportAt' ? r.value : null;
  });
}

/** Отправка формы: состояние сохранения, ошибка в форме, уведомление об успехе. */
export function useSubmit() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      await action();
      toast(success);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    } finally {
      setSaving(false);
    }
  }
  return { saving, error, setError, submit };
}
