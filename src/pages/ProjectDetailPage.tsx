import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProjectForm } from '../components/forms/ProjectForm';
import { TaskForm } from '../components/forms/TaskForm';
import { TransactionForm } from '../components/forms/TransactionForm';
import { EventRow, ListEmpty, Money, SectionHead, statusTone, TaskRow, TransactionRow } from '../components/items';
import { Badge, Button } from '../components/ui/Button';
import { errorText, useConfirm, useToast } from '../components/ui/Feedback';
import { EmptyState, GlassCard, Loading } from '../components/ui/Glass';
import { FilterSelect } from '../components/ui/Toolbar';
import { db } from '../db/db';
import { deleteProject, deleteTask, setNextTask, setProjectArchived, setProjectStatus } from '../db/repo';
import type { ProjectStatus, Task, Transaction, TransactionType } from '../db/types';
import { formatDate } from '../lib/date';
import { calcProjectFinances, projectFinance } from '../lib/finance';
import { PRIORITY_RANK, PROJECT_STATUS } from '../lib/labels';

type Dialog =
  | { kind: 'edit' }
  | { kind: 'task'; task?: Task }
  | { kind: 'tx'; type: TransactionType; tx?: Transaction }
  | null;

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [showDone, setShowDone] = useState(false);

  const data = useLiveQuery(async () => {
    const project = await db.projects.get(id);
    if (!project) return { project: null };
    const [tasks, transactions, events, idea] = await Promise.all([
      db.tasks.where('projectId').equals(id).toArray(),
      db.transactions.where('projectId').equals(id).toArray(),
      db.events.where('projectId').equals(id).toArray(),
      project.sourceIdeaId ? db.ideas.get(project.sourceIdeaId) : undefined,
    ]);
    return { project, tasks, transactions, events, idea };
  }, [id]);

  const finance = useMemo(() => (data?.project ? projectFinance(calcProjectFinances(data.transactions), id) : null), [data, id]);

  if (!data) return <Loading />;
  const { project } = data;
  if (!project) {
    return (
      <GlassCard>
        <EmptyState title="Проект не найден" text="Возможно, он был удалён." />
        <Link to="/projects" className="text-muted mx-auto text-sm hover:text-white">
          ← К проектам
        </Link>
      </GlassCard>
    );
  }
  const { tasks, transactions, events, idea } = data;

  const openTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9'));
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const sortedTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const sortedEvents = [...events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function run(action: () => Promise<void>, success: string) {
    try {
      await action();
      toast(success);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: 'Удалить проект?',
      text: `«${project!.name}» и его задачи будут удалены. Операции проекта останутся в финансах без привязки, история событий сохранится.`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    await run(() => deleteProject(project!.id), 'Проект удалён');
    navigate('/projects');
  }

  async function onDeleteTask(t: Task) {
    if (await confirm({ title: 'Удалить задачу?', text: `«${t.title}» будет удалена.`, confirmLabel: 'Удалить', danger: true }))
      await run(() => deleteTask(t.id), 'Задача удалена');
  }

  const taskExtra = (t: Task) => (
    <div className="flex shrink-0 gap-1">
      {t.status !== 'done' && (
        <button
          type="button"
          onClick={() => void run(() => setNextTask(project.id, project.nextTaskId === t.id ? null : t.id), project.nextTaskId === t.id ? 'Главная задача снята' : 'Главная задача выбрана')}
          aria-label={project.nextTaskId === t.id ? 'Снять главную задачу' : 'Сделать главной следующей задачей'}
          title={project.nextTaskId === t.id ? 'Снять главную задачу' : 'Сделать главной'}
          className={`h-9 w-9 rounded-lg hover:bg-white/10 ${project.nextTaskId === t.id ? 'text-[var(--accent)]' : 'text-white/40'}`}
        >
          ★
        </button>
      )}
      <button type="button" onClick={() => void onDeleteTask(t)} aria-label={`Удалить задачу «${t.title}»`} className="h-9 w-9 rounded-lg text-white/40 hover:bg-white/10 hover:text-[var(--negative)]">
        ✕
      </button>
    </div>
  );

  return (
    <>
      <Link to="/projects" className="text-muted mb-3 inline-block text-sm hover:text-white">
        ← Проекты
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden className="glass-chip h-14 w-14 rounded-2xl text-2xl">
            {project.icon}
          </span>
          <div className="min-w-0">
            <h1 className="text-shadow truncate text-[28px] font-semibold leading-9 tracking-tight">{project.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone(project.status)}>{PROJECT_STATUS[project.status]}</Badge>
              {project.archived && <Badge tone="muted">Архив</Badge>}
              <span className="text-muted text-xs">Добавлен {formatDate(project.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog({ kind: 'edit' })}>Редактировать</Button>
          <Button onClick={() => void run(() => setProjectArchived(project.id, !project.archived), project.archived ? 'Проект возвращён из архива' : 'Проект в архиве')}>
            {project.archived ? 'Из архива' : 'В архив'}
          </Button>
          <Button variant="danger" onClick={() => void onDelete()}>
            Удалить
          </Button>
        </div>
      </header>

      <div className="phone:gap-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <SectionHead title="Описание" />
          <p className="whitespace-pre-line text-sm leading-6 text-white/85">{project.description || <span className="text-white/40">Описание не заполнено</span>}</p>
          {idea && (
            <p className="text-muted mt-3 text-xs">
              Создан из идеи «<Link to="/ideas" className="underline underline-offset-2 hover:text-white">{idea.title}</Link>»
            </p>
          )}
        </GlassCard>

        <GlassCard>
          <SectionHead title="Статус и ссылки" />
          <FilterSelect
            label="Статус разработки"
            value={project.status}
            onChange={(s: ProjectStatus) => void run(() => setProjectStatus(project.id, s), `Статус: ${PROJECT_STATUS[s]}`)}
            options={Object.entries(PROJECT_STATUS) as [ProjectStatus, string][]}
            className="w-full"
          />
          <div className="mt-3 grid gap-2 text-sm">
            {[
              ['GitHub', project.githubUrl],
              ['Demo', project.demoUrl],
            ].map(([label, url]) =>
              url ? (
                <a key={label} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl bg-white/8 px-3 py-2.5 hover:bg-white/15">
                  <span>{label}</span>
                  <span className="text-muted truncate text-xs">{url.replace(/^https?:\/\//, '')} ↗</span>
                </a>
              ) : (
                <div key={label} className="rounded-xl bg-black/15 px-3 py-2.5 text-white/40">
                  {label}: не указано
                </div>
              ),
            )}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-3">
          <SectionHead
            title="Финансы проекта"
            action={
              <div className="flex gap-2">
                <Button size="sm" onClick={() => setDialog({ kind: 'tx', type: 'income' })}>
                  + Доход
                </Button>
                <Button size="sm" onClick={() => setDialog({ kind: 'tx', type: 'expense' })}>
                  + Расход
                </Button>
              </div>
            }
          />
          <dl className="phone:grid-cols-2 grid grid-cols-4 gap-2">
            {[
              ['Вложено', finance!.invested, false],
              ['Доход', finance!.income, false],
              ['Расходы', finance!.expense, false],
              ['Результат', finance!.result, true],
            ].map(([label, value, signed]) => (
              <div key={label as string} className="rounded-xl bg-black/15 px-3 py-2.5">
                <dt className="text-muted text-xs">{label as string}</dt>
                <dd className="mt-0.5 text-lg font-semibold">
                  <Money value={value as number} signed={signed as boolean} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted mt-2 text-xs">Вложено — разработка и оборудование; расходы — подписки, AI-сервисы, реклама, прочее.</p>
          <div className="mt-3">
            {sortedTx.length ? (
              sortedTx.map((t) => <TransactionRow key={t.id} t={t} onClick={() => setDialog({ kind: 'tx', type: t.type, tx: t })} />)
            ) : (
              <ListEmpty text="Операций по проекту нет." />
            )}
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <SectionHead
            title={`Задачи · ${openTasks.length}`}
            action={
              <Button size="sm" onClick={() => setDialog({ kind: 'task' })}>
                + Задача
              </Button>
            }
          />
          {openTasks.length ? (
            openTasks.map((t) => <TaskRow key={t.id} task={t} isMain={project.nextTaskId === t.id} onEdit={() => setDialog({ kind: 'task', task: t })} extra={taskExtra(t)} />)
          ) : (
            <ListEmpty text="Открытых задач нет." />
          )}
          {doneTasks.length > 0 && (
            <div className="mt-2 border-t border-white/10 pt-2">
              <button type="button" onClick={() => setShowDone((v) => !v)} className="text-muted px-2 py-1 text-xs hover:text-white">
                {showDone ? 'Скрыть' : 'Показать'} выполненные · {doneTasks.length}
              </button>
              {showDone && doneTasks.map((t) => <TaskRow key={t.id} task={t} onEdit={() => setDialog({ kind: 'task', task: t })} extra={taskExtra(t)} />)}
            </div>
          )}
          <p className="text-muted mt-2 px-2 text-xs">★ — главная следующая задача, она показывается в карточке проекта.</p>
        </GlassCard>

        <GlassCard>
          <SectionHead title="История" />
          {sortedEvents.length ? sortedEvents.slice(0, 20).map((e) => <EventRow key={e.id} e={e} />) : <ListEmpty text="Событий пока нет." />}
        </GlassCard>
      </div>

      {dialog?.kind === 'edit' && <ProjectForm project={project} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'task' && <TaskForm task={dialog.task} projectId={project.id} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'tx' && <TransactionForm transaction={dialog.tx} defaultType={dialog.type} defaultProjectId={project.id} onClose={() => setDialog(null)} />}
    </>
  );
}
