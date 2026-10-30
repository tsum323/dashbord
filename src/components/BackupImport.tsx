import { useRef, useState } from 'react';
import { parseBackupFile, restoreBackup, type ValidationResult } from '../db/backup';
import { formatDateTime } from '../lib/date';
import { Button } from './ui/Button';
import { errorText, useToast } from './ui/Feedback';
import { Modal } from './ui/Modal';

const COUNT_LABELS = { projects: 'Проекты', transactions: 'Операции', tasks: 'Задачи', ideas: 'Идеи', events: 'События' } as const;

/**
 * Импорт резервной копии в два шага: выбор и проверка файла → предупреждение
 * о перезаписи с возможностью отмены → замена данных.
 */
export function BackupImportButton({ label = 'Импорт JSON', onDone }: { label?: string; onDone?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setChecking(true);
    setResult(await parseBackupFile(file));
    setChecking(false);
  }

  async function confirm() {
    if (!result?.ok) return;
    setRestoring(true);
    try {
      await restoreBackup(result.backup);
      toast('Данные восстановлены из резервной копии');
      setResult(null);
      onDone?.();
    } catch (e) {
      toast(errorText(e), 'error');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Файл резервной копии"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Button onClick={() => input.current?.click()} loading={checking}>
        {label}
      </Button>
      {result && (
        <Modal
          title={result.ok ? 'Восстановить из копии?' : 'Файл не подходит'}
          onClose={() => setResult(null)}
          footer={
            result.ok ? (
              <>
                <Button onClick={() => setResult(null)}>Отменить импорт</Button>
                <Button variant="danger" onClick={() => void confirm()} loading={restoring}>
                  Заменить данные
                </Button>
              </>
            ) : (
              <Button onClick={() => setResult(null)}>Закрыть</Button>
            )
          }
        >
          {result.ok ? (
            <div className="grid gap-4 text-sm">
              <p className="rounded-xl bg-[rgb(242_160_160/0.14)] px-3 py-2 text-[var(--negative)]">
                Все текущие данные на этом устройстве будут заменены содержимым файла. Это действие нельзя отменить — сначала
                сделайте экспорт, если текущие данные нужны.
              </p>
              <div className="text-muted">
                Копия от {formatDateTime(result.backup.exportedAt)} · версия приложения {result.backup.appVersion} · формат{' '}
                {result.backup.formatVersion}
              </div>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(COUNT_LABELS) as (keyof typeof COUNT_LABELS)[]).map((k) => (
                  <div key={k} className="rounded-xl bg-black/20 px-3 py-2">
                    <dt className="text-muted text-xs">{COUNT_LABELS[k]}</dt>
                    <dd className="text-lg font-semibold tabular-nums">{result.counts[k]}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted text-xs">Фоновое фото и настройки этого устройства сохранятся.</p>
            </div>
          ) : (
            <ul className="grid list-disc gap-1 pl-5 text-sm text-[var(--negative)]">
              {result.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}
