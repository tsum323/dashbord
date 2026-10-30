import { useLiveQuery } from 'dexie-react-hooks';
import { EmptyState, GlassCard, Loading, PageHeader } from '../components/ui/Glass';
import { db } from '../db/db';
import { useSetup } from '../db/settings';
import { calcTotals } from '../lib/finance';
import { formatRub } from '../lib/money';

function Kpi({ label, value, tone }: { label: string; value: number; tone?: 'auto' }) {
  const color = tone === 'auto' ? (value > 0 ? 'text-[var(--positive)]' : value < 0 ? 'text-[var(--negative)]' : '') : '';
  return (
    <GlassCard>
      <div className="text-muted text-sm">{label}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight md:text-3xl ${color}`}>{formatRub(value)}</div>
    </GlassCard>
  );
}

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
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard>
          <div className="text-muted text-sm">Активные проекты</div>
          <div className="mt-2 text-3xl font-semibold">{activeProjects ?? 0}</div>
        </GlassCard>
        <GlassCard className="lg:col-span-2">
          <h2 className="font-medium">Последние операции</h2>
          <EmptyState title="Операций пока нет" text="Добавьте первый доход или расход — он появится здесь." />
        </GlassCard>
      </div>
    </>
  );
}
