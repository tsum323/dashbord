import { useLiveQuery } from 'dexie-react-hooks';
import { CardTitle, EmptyState, GlassCard, Loading, PageHeader } from '../components/ui/Glass';
import { db } from '../db/db';
import { useSetup } from '../db/settings';
import { calcTotals } from '../lib/finance';
import { formatRub } from '../lib/money';

function Kpi({ label, value, tone, className = '' }: { label: string; value: number; tone?: 'auto'; className?: string }) {
  const color = tone === 'auto' ? (value > 0 ? 'text-[var(--positive)]' : value < 0 ? 'text-[var(--negative)]' : '') : '';
  return (
    <GlassCard className={className}>
      <CardTitle>{label}</CardTitle>
      <div className={`phone:text-2xl phone:leading-8 mt-2 break-words text-3xl font-semibold leading-9 tabular-nums tracking-tight ${color}`}>
        {formatRub(value)}
      </div>
    </GlassCard>
  );
}

// Одна сетка на всю страницу: 2 колонки на телефоне и iPad, 4 на компьютере.
// Нижний ряд повторяет колонки показателей: 1 + 3.
// На узком телефоне бюджет — главная цифра — занимает всю ширину.
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
      <div className="phone:gap-3 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Текущий бюджет" value={totals.budget} className="col-span-2 sm:col-span-1" />
        <Kpi label="Общий доход" value={totals.income} />
        <Kpi label="Общие расходы" value={totals.expense} />
        <Kpi label="Чистая прибыль" value={totals.profit} tone="auto" />
        <GlassCard className="sm:col-span-2 xl:col-span-1">
          <CardTitle>Активные проекты</CardTitle>
          <div className="mt-2 text-3xl font-semibold leading-9 tabular-nums">{activeProjects ?? 0}</div>
          <p className="text-muted mt-1 text-xs leading-4">В работе и запущенные</p>
        </GlassCard>
        <GlassCard className="col-span-2 min-h-[200px] xl:col-span-3">
          <CardTitle>Последние операции</CardTitle>
          <EmptyState title="Операций пока нет" text="Добавьте первый доход или расход — он появится здесь." />
        </GlassCard>
      </div>
    </>
  );
}
