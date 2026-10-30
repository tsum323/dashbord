import { useMemo, useState } from 'react';
import { TransactionForm } from '../components/forms/TransactionForm';
import { Money, TransactionRow } from '../components/items';
import { Button } from '../components/ui/Button';
import { errorText, useConfirm, useToast } from '../components/ui/Feedback';
import { SearchInput } from '../components/ui/Fields';
import { CardTitle, EmptyState, GlassCard, Loading, PageHeader } from '../components/ui/Glass';
import { FilterSelect, Toolbar } from '../components/ui/Toolbar';
import { useProjectMap, useProjects, useTransactions } from '../db/hooks';
import { deleteTransaction } from '../db/repo';
import type { Transaction, TransactionType } from '../db/types';
import { formatDate, toLocalISODate } from '../lib/date';
import { calcTotals } from '../lib/finance';
import { EXPENSE_CATEGORY, INCOME_CATEGORY } from '../lib/labels';

type Period = 'all' | 'month' | 'prev' | 'year' | 'custom';

/** Границы периода включительно, 'YYYY-MM-DD'. */
export function periodRange(period: Period, from: string, to: string, now = new Date()): [string, string] {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (period) {
    case 'month':
      return [toLocalISODate(new Date(y, m, 1)), toLocalISODate(new Date(y, m + 1, 0))];
    case 'prev':
      return [toLocalISODate(new Date(y, m - 1, 1)), toLocalISODate(new Date(y, m, 0))];
    case 'year':
      return [`${y}-01-01`, `${y}-12-31`];
    case 'custom':
      return [from || '0000-01-01', to || '9999-12-31'];
    default:
      return ['0000-01-01', '9999-12-31'];
  }
}

type Dialog = { type: TransactionType; tx?: Transaction } | null;

export function FinancePage() {
  const transactions = useTransactions();
  const projects = useProjects();
  const projectMap = useProjectMap(projects);
  const confirm = useConfirm();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);

  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [period, setPeriod] = useState<Period>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [project, setProject] = useState('all');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');

  const categoryOptions: [string, string][] = [
    ['all', 'Все категории'],
    ...(type !== 'expense' ? Object.entries(INCOME_CATEGORY).map(([k, v]): [string, string] => [`income:${k}`, type === 'all' ? `Доход · ${v}` : v]) : []),
    ...(type !== 'income' ? Object.entries(EXPENSE_CATEGORY).map(([k, v]): [string, string] => [`expense:${k}`, type === 'all' ? `Расход · ${v}` : v]) : []),
  ];

  const filtered = useMemo(() => {
    if (!transactions) return [];
    const [start, end] = periodRange(period, from, to);
    const q = query.trim().toLowerCase();
    return transactions
      .filter(
        (t) =>
          (type === 'all' || t.type === type) &&
          t.date >= start &&
          t.date <= end &&
          (project === 'all' || (project === 'none' ? !t.projectId : t.projectId === project)) &&
          (category === 'all' || category === `${t.type}:${t.category}`) &&
          (!q || `${t.title} ${t.comment}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [transactions, type, period, from, to, project, category, query]);

  if (!transactions || !projects) return <Loading />;

  const totals = calcTotals(filtered, 0);
  const isFiltered = type !== 'all' || period !== 'all' || project !== 'all' || category !== 'all' || query !== '';

  // Группировка по дате для читаемой истории.
  const groups: [string, Transaction[]][] = [];
  for (const t of filtered) {
    const last = groups.at(-1);
    if (last && last[0] === t.date) last[1].push(t);
    else groups.push([t.date, [t]]);
  }

  async function onDelete(t: Transaction) {
    const ok = await confirm({
      title: 'Удалить операцию?',
      text: `«${t.title}» на ${t.type === 'income' ? '+' : '−'}${(t.amount / 100).toLocaleString('ru-RU')} ₽ будет удалена, бюджет пересчитается.`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteTransaction(t.id);
      toast('Операция удалена');
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  function resetFilters() {
    setType('all');
    setPeriod('all');
    setFrom('');
    setTo('');
    setProject('all');
    setCategory('all');
    setQuery('');
  }

  return (
    <>
      <PageHeader
        title="Финансы"
        subtitle="Журнал доходов и расходов в рублях"
        actions={
          <>
            <Button onClick={() => setDialog({ type: 'expense' })}>− Расход</Button>
            <Button variant="primary" onClick={() => setDialog({ type: 'income' })}>
              + Доход
            </Button>
          </>
        }
      />

      <Toolbar>
        <div className="phone:col-span-2 min-w-[180px] flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Поиск по названию" />
        </div>
        <FilterSelect
          label="Тип"
          value={type}
          onChange={(v) => {
            setType(v);
            setCategory('all');
          }}
          options={[
            ['all', 'Все операции'],
            ['income', 'Доходы'],
            ['expense', 'Расходы'],
          ]}
        />
        <FilterSelect
          label="Период"
          value={period}
          onChange={setPeriod}
          options={[
            ['all', 'За всё время'],
            ['month', 'Этот месяц'],
            ['prev', 'Прошлый месяц'],
            ['year', 'Этот год'],
            ['custom', 'Свой период'],
          ]}
        />
        {period === 'custom' && (
          <>
            <input type="date" aria-label="С даты" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 min-w-0 rounded-xl border border-white/15 bg-black/25 px-3 text-sm outline-none focus:border-white/45" />
            <input type="date" aria-label="По дату" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 min-w-0 rounded-xl border border-white/15 bg-black/25 px-3 text-sm outline-none focus:border-white/45" />
          </>
        )}
        <FilterSelect
          label="Проект"
          value={project}
          onChange={setProject}
          options={[['all', 'Все проекты'], ['none', 'Без проекта'], ...projects.map((p): [string, string] => [p.id, p.name])]}
        />
        <FilterSelect label="Категория" value={category} onChange={setCategory} options={categoryOptions} />
        {isFiltered && (
          <Button variant="ghost" onClick={resetFilters} className="phone:col-span-2">
            Сбросить фильтры
          </Button>
        )}
      </Toolbar>

      <div className="phone:gap-3 phone:grid-cols-2 mb-4 grid grid-cols-3 gap-4">
        {[
          ['Доходы', totals.income, false],
          ['Расходы', -totals.expense, false],
          ['Итого', totals.profit, true],
        ].map(([label, value, signed]) => (
          <GlassCard key={label as string} className={`phone:p-3 ${signed ? 'phone:col-span-2' : ''}`}>
            <CardTitle>{label as string}</CardTitle>
            <div className="mt-1 truncate text-xl font-semibold">
              <Money value={value as number} signed={signed as boolean} />
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <div className="mb-2 flex items-center justify-between">
          <CardTitle>{isFiltered ? `Найдено операций: ${filtered.length}` : `История операций · ${filtered.length}`}</CardTitle>
        </div>
        {groups.length ? (
          groups.map(([date, items]) => (
            <div key={date} className="mb-2">
              <div className="text-muted px-2 pb-1 pt-2 text-xs font-medium">{formatDate(date)}</div>
              {items.map((t) => (
                <div key={t.id} className="flex items-center gap-1">
                  <div className="min-w-0 flex-1">
                    <TransactionRow t={t} project={t.projectId ? projectMap.get(t.projectId) : undefined} onClick={() => setDialog({ type: t.type, tx: t })} />
                  </div>
                  <button type="button" onClick={() => void onDelete(t)} aria-label={`Удалить операцию «${t.title}»`} className="h-9 w-9 shrink-0 rounded-lg text-white/40 hover:bg-white/10 hover:text-[var(--negative)]">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ))
        ) : transactions.length ? (
          <EmptyState title="Ничего не найдено" text="Под выбранные фильтры операций нет." />
        ) : (
          <EmptyState title="Операций пока нет" text="Добавьте первый доход или расход — бюджет пересчитается автоматически." />
        )}
      </GlassCard>

      {dialog && <TransactionForm transaction={dialog.tx} defaultType={dialog.type} onClose={() => setDialog(null)} />}
    </>
  );
}
