import { useLiveQuery } from 'dexie-react-hooks';
import { CardTitle, EmptyState, GlassCard, Loading, PageHeader } from '../components/ui/Glass';
import { db } from '../db/db';
import { useSetup } from '../db/settings';
import { calcTotals } from '../lib/finance';
import { formatRub } from '../lib/money';

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'auto' }) {
  const color = tone === 'auto' ? (value > 0 ? 'text-[var(--positive)]' : value < 0 ? 'text-[var(--negative)]' : '') : '';
  return (
    <GlassCard>
      <CardTitle>{label}</CardTitle>
      <div className={`mt-2 text-3xl font-semibold leading-9 tabular-nums tracking-tight ${color}`}>{formatRub(value)}</div>
    </GlassCard>
  );
}

// Одна сетка на всю страницу: 2 колонки на iPad, 4 на компьютере.
// Нижний ряд повторяет колонки показателей: 1 + 3.
export function HomePage() {
  const setup = useSetup();
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const activeProjects = useLiveQuery(() =>
    db.projects.filter((p) => !p.archived && ['dev', 'testing', 'launched'].includes(p.status)).count(),
  );

  if (setup === undefined || transactions === undefined) return <Loading />;
  const totals = calcTotals(transactions, setup?.initialBalance ?? 0);

  return (
    <>
      <PageHeader title="Главная" subtitle="Деньги, проекты и задачи — на одном экране" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Текущий бюджет" value={totals.budget} />
        <Kpi label="Общий доход" value={totals.income} />
        <Kpi label="Общие расходы" value={totals.expense} />
        <Kpi label="Чистая прибыль" value={totals.profit} tone="auto" />
        <GlassCard className="sm:col-span-2 xl:col-span-1">
          <CardTitle>Активные проекты</CardTitle>
          <div className="mt-2 text-3xl font-semibold leading-9 tabular-nums">{activeProjects ?? 0}</div>
          <p className="text-muted mt-1 text-xs leading-4">В разработке, тестировании и запущенные</p>
        </GlassCard>
        <GlassCard className="min-h-[200px] sm:col-span-2 xl:col-span-3">
          <CardTitle>Последние операции</CardTitle>
          <EmptyState title="Операций пока нет" text="Добавьте первый доход или расход — он появится здесь." />
        </GlassCard>
      </div>
    </>
  );
}
