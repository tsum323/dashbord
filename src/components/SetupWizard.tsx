import { useState, type FormEvent } from 'react';
import { CONFIRMED_PROJECTS } from '../data/confirmedProjects';
import { completeSetup } from '../db/repo';
import { PROJECT_STATUS } from '../lib/labels';
import { formatRub, parseRub } from '../lib/money';
import { BackupImportButton } from './BackupImport';
import { Button } from './ui/Button';
import { errorText, useToast } from './ui/Feedback';
import { Field, FormError, TextInput } from './ui/Fields';

/** Мастер первого запуска: начальный остаток → импорт подтверждённых проектов. */
export function SetupWizard() {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [balance, setBalance] = useState('');
  const [selected, setSelected] = useState<Set<number>>(() => new Set(CONFIRMED_PROJECTS.map((_, i) => i)));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = parseRub(balance || '0', { allowZero: true });

  function next(e: FormEvent) {
    e.preventDefault();
    if (parsed === null) return setError('Введите сумму, например 50 000 или 0.');
    setError(null);
    setStep(2);
  }

  async function finish() {
    if (parsed === null) return;
    setSaving(true);
    try {
      await completeSetup(
        parsed,
        CONFIRMED_PROJECTS.filter((_, i) => selected.has(i)),
      );
      toast('Готово! Панель настроена');
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  const toggle = (i: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });

  return (
    <div className="phone:items-start phone:pt-[calc(16px+var(--safe-top))] fixed inset-0 z-40 flex items-center justify-center overflow-y-auto p-4">
      <div className="glass glass-strong my-auto w-full max-w-xl p-6">
        <div className="text-muted text-xs">Первый запуск · шаг {step} из 2</div>
        {step === 1 ? (
          <form onSubmit={next} className="mt-2 grid gap-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Добро пожаловать</h1>
              <p className="text-muted mt-1 text-sm leading-6">
                Укажите, сколько денег у вас сейчас. От этой суммы считается текущий бюджет: остаток + доходы − расходы.
              </p>
            </div>
            <Field label="Начальный остаток, ₽" hint={parsed !== null ? formatRub(parsed) : 'Некорректная сумма'}>
              {(id) => <TextInput id={id} inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" />}
            </Field>
            <FormError message={error} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <BackupImportButton label="Восстановить из копии" />
              <Button variant="primary" type="submit">
                Далее
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-2 grid gap-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Импорт проектов</h1>
              <p className="text-muted mt-1 text-sm leading-6">
                Проекты из GitHub, которые вы подтвердили после аудита. Снимите отметку с тех, что не нужны, — их можно будет добавить позже.
              </p>
            </div>
            <ul className="grid gap-2">
              {CONFIRMED_PROJECTS.map((p, i) => (
                <li key={p.githubUrl}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-black/20 px-3 py-2.5 hover:bg-black/30">
                    <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
                    <span className="text-lg">{p.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="text-muted block truncate text-xs">{p.githubUrl.replace('https://github.com/', '')}</span>
                    </span>
                    <span className="text-muted shrink-0 text-xs">{PROJECT_STATUS[p.status]}</span>
                  </label>
                </li>
              ))}
            </ul>
            <FormError message={error} />
            <div className="flex flex-wrap justify-between gap-2">
              <Button onClick={() => setStep(1)}>Назад</Button>
              <Button variant="primary" onClick={() => void finish()} loading={saving}>
                {selected.size ? `Импортировать ${selected.size} и начать` : 'Начать без проектов'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
