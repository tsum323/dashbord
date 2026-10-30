import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { IdeaForm } from '../components/forms/IdeaForm';
import { ProjectForm } from '../components/forms/ProjectForm';
import { TransactionForm } from '../components/forms/TransactionForm';
import { EventRow, ListEmpty, SectionHead, TaskRow, TransactionRow } from '../components/items';
import { Badge } from '../components/ui/Button';
import { CardTitle, GlassCard, Loading, PageHeader } from '../components/ui/Glass';
import { useEvents, useIdeas, useProjectMap, useProjects, useTasks, useTransactions } from '../db/hooks';
import { useSetup } from '../db/settings';
import type { Task, TransactionType } from '../db/types';
import { calcTotals } from '../lib/finance';
import { ACTIVE_STATUSES, IDEA_STATUS, PRIORITY, PRIORITY_RANK } from '../lib/labels';
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

/** Ближайшие незавершённые задачи: сначала со сроком (раньше — выше), затем по приоритету. */
export function upcomingTasks(tasks: Task[], limit: number): Task[] {
  return tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
      if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    })
    .slice(0, limit);
}

type Dialog = { kind: 'tx'; type: TransactionType } | { kind: 'idea' } | { kind: 'project' } | null;

const QUICK = [
  { label: 'Доход', icon: '+', dialog: { kind: 'tx', type: 'income' } },
  { label: 'Расход', icon: '−', dialog: { kind: 'tx', type: 'expense' } },
  { label: 'Идея', icon: '✦', dialog: { kind: 'idea' } },
  { label: 'Проект', icon: '▣', dialog: { kind: 'project' } },
] as const;

// Одна сетка на всю страницу: 2 колонки на телефоне и iPad, 4 на компьютере.
// На узком телефоне бюджет — главная цифра — занимает всю ширину.
export function HomePage() {
  const setup = useSetup();
  const transactions = useTransactions();
  const projects = useProjects();
  const tasks = useTasks();
  const ideas = useIdeas();
  const events = useEvents(6);
  const projectMap = useProjectMap(projects);
  const [dialog, setDialog] = useState<Dialog>(null);

  const recentTx = useMemo(
    () => [...(transactions ?? [])].sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date))).slice(0, 5),
    [transactions],
  );
  const upcoming = useMemo(() => upcomingTasks(tasks ?? [], 5), [tasks]);
  const reviewIdeas = useMemo(
    () =>
      (ideas ?? [])
        .filter((i) => !i.projectId && ['new', 'review', 'interesting'].includes(i.status))
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
        .slice(0, 4),
    [ideas],
  );

  if (!setup || !transactions || !projects || !tasks || !ideas || !events) return <Loading />;
  const totals = calcTotals(transactions, setup.initialBalance);
  const active = projects.filter((p) => !p.archived && ACTIVE_STATUSES.includes(p.status));

  return (
    <>
      <PageHeader title="Главная" subtitle="Деньги, проекты и задачи — на одном экране" />
      <div className="phone:gap-3 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi label="Текущий бюджет" value={totals.budget} className="col-span-2 sm:col-span-1" />
        <Kpi label="Общий доход" value={totals.income} />
        <Kpi label="Общие расходы" value={totals.expense} />
        <Kpi label="Чистая прибыль" value={totals.profit} tone="auto" />

        <GlassCard className="col-span-1 sm:col-span-2 xl:col-span-1">
          <CardTitle>Активные проекты</CardTitle>
          <Link to="/board" className="mt-2 text-3xl font-semibold leading-9 tabular-nums hover:underline">
            {active.length}
          </Link>
          <p className="text-muted mt-1 text-xs leading-4">В работе и запущенные · всего {projects.filter((p) => !p.archived).length}</p>
        </GlassCard>

        <GlassCard className="col-span-2 xl:col-span-3">
          <CardTitle>Быстро добавить</CardTitle>
          <div className="phone:grid-cols-2 mt-3 grid grid-cols-4 gap-2">
            {QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setDialog(q.dialog)}
                className="flex h-11 items-center gap-2 rounded-xl bg-white/8 px-2 text-sm hover:bg-white/15"
              >
                <span aria-hidden className="glass-chip h-7 w-7 text-xs">
                  {q.icon}
                </span>
                <span className="truncate">{q.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="col-span-2">
          <SectionHead title="Ближайшие задачи" />
          {upcoming.length ? (
            upcoming.map((t) => <TaskRow key={t.id} task={t} project={projectMap.get(t.projectId)} />)
          ) : (
            <ListEmpty text="Незавершённых задач нет. Задачи добавляются на странице проекта." />
          )}
        </GlassCard>

        <GlassCard className="col-span-2">
          <SectionHead title="Последние операции" to="/finance" />
          {recentTx.length ? (
            recentTx.map((t) => <TransactionRow key={t.id} t={t} project={t.projectId ? projectMap.get(t.projectId) : undefined} />)
          ) : (
            <ListEmpty text="Операций пока нет. Добавьте первый доход или расход." />
          )}
        </GlassCard>

        <GlassCard className="col-span-2">
          <SectionHead title="Последние события" to="/feed" />
          {events.length ? (
            events.map((e) => <EventRow key={e.id} e={e} project={e.projectId ? projectMap.get(e.projectId) : undefined} />)
          ) : (
            <ListEmpty text="Здесь появится история ваших действий." />
          )}
        </GlassCard>

        <GlassCard className="col-span-2">
          <SectionHead title="Идеи на рассмотрении" to="/ideas" />
          {reviewIdeas.length ? (
            reviewIdeas.map((i) => (
              <Link key={i.id} to="/ideas" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/8">
                <span aria-hidden className="glass-chip h-9 w-9 text-sm">
                  ✦
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{i.title}</span>
                  <span className="text-muted block truncate text-xs">{i.potential || 'Потенциал не указан'}</span>
                </span>
                <Badge tone={i.priority === 'high' ? 'accent' : 'neutral'}>{PRIORITY[i.priority]}</Badge>
                <span className="text-muted hidden text-xs sm:inline">{IDEA_STATUS[i.status]}</span>
              </Link>
            ))
          ) : (
            <ListEmpty text="Новых идей нет. Добавьте идею кнопкой «Идея»." />
          )}
        </GlassCard>
      </div>

      {dialog?.kind === 'tx' && <TransactionForm defaultType={dialog.type} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'idea' && <IdeaForm onClose={() => setDialog(null)} />}
      {dialog?.kind === 'project' && <ProjectForm onClose={() => setDialog(null)} />}
    </>
  );
}
