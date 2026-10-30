import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { backupFileName, buildBackup, markExported } from '../db/backup';
import { db } from '../db/db';
import { useLastExport } from '../db/hooks';
import { setInitialBalance } from '../db/repo';
import { useSetup } from '../db/settings';
import { formatDateTime } from '../lib/date';
import { formatRub, parseRub } from '../lib/money';
import { BackupImportButton } from './BackupImport';
import { Button } from './ui/Button';
import { errorText, useToast } from './ui/Feedback';
import { Field, FormError, TextInput } from './ui/Fields';
import { CardTitle, GlassCard } from './ui/Glass';

export function BudgetCard() {
  const setup = useSetup();
  const toast = useToast();
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = setup?.initialBalance ?? 0;
  const text = value ?? String(current / 100).replace('.', ',');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = parseRub(text, { allowZero: true });
    if (parsed === null) return setError('Введите сумму, например 50 000 или 0.');
    try {
      await setInitialBalance(parsed);
      setError(null);
      setValue(null);
      toast('Начальный остаток сохранён');
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <GlassCard>
      <CardTitle>Начальный бюджет</CardTitle>
      <p className="text-muted mt-1 text-sm">Текущий бюджет = начальный остаток + доходы − расходы.</p>
      <form onSubmit={onSubmit} className="mt-4 flex items-end gap-2">
        <Field label="Начальный остаток, ₽" className="flex-1">
          {(id) => <TextInput id={id} inputMode="decimal" value={text} onChange={(e) => setValue(e.target.value)} />}
        </Field>
        <Button type="submit" variant="primary" disabled={value === null} className="!h-11">
          Сохранить
        </Button>
      </form>
      <p className="text-muted mt-2 text-xs">Сейчас: {formatRub(current)}</p>
      <div className="mt-2">
        <FormError message={error} />
      </div>
    </GlassCard>
  );
}

/** Отдаёт файл: на телефоне — через «Поделиться» (можно сохранить в «Файлы»), иначе — скачивание. */
async function deliverFile(json: string, name: string) {
  const file = new File([json], name, { type: 'application/json' });
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  if (coarse && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      // Если «Поделиться» недоступно — скачиваем обычным способом.
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function BackupCard() {
  const toast = useToast();
  const lastExport = useLastExport();
  const [busy, setBusy] = useState(false);

  async function exportJson() {
    setBusy(true);
    try {
      const backup = await buildBackup();
      await deliverFile(JSON.stringify(backup, null, 2), backupFileName());
      await markExported(backup.exportedAt);
      toast('Резервная копия сохранена');
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) toast(errorText(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <GlassCard>
      <CardTitle>Резервное копирование</CardTitle>
      <p className="text-muted mt-1 text-sm leading-5">
        Данные хранятся только в этом браузере. Сохраняйте копию регулярно — так их можно перенести на другое устройство или восстановить.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void exportJson()} loading={busy}>
          Экспорт JSON
        </Button>
        <BackupImportButton />
      </div>
      <p className="text-muted mt-3 text-xs">
        Последний экспорт: {lastExport ? formatDateTime(lastExport) : 'ещё не делали'}
      </p>
    </GlassCard>
  );
}

export function AboutCard() {
  const counts = useLiveQuery(async () => ({
    projects: await db.projects.count(),
    transactions: await db.transactions.count(),
    tasks: await db.tasks.count(),
    ideas: await db.ideas.count(),
    events: await db.events.count(),
  }));
  return (
    <GlassCard>
      <CardTitle>О приложении</CardTitle>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Версия</dt>
          <dd className="tabular-nums">{__APP_VERSION__}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted">Хранилище</dt>
          <dd>IndexedDB, только это устройство</dd>
        </div>
        {counts && (
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Записей</dt>
            <dd className="text-right">
              {counts.projects} проектов · {counts.transactions} операций · {counts.tasks} задач · {counts.ideas} идей · {counts.events} событий
            </dd>
          </div>
        )}
      </dl>
    </GlassCard>
  );
}
