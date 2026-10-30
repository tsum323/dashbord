import { Link } from 'react-router-dom';
import { setTaskStatus } from '../db/repo';
import type { AppEvent, Project, Task, Transaction } from '../db/types';
import { dueLabel, formatDate, formatDateTime } from '../lib/date';
import type { ProjectFinance } from '../lib/finance';
import { categoryLabel, EVENT_ICON, PRIORITY, PROJECT_STATUS } from '../lib/labels';
import { formatRub } from '../lib/money';
import { Badge } from './ui/Button';
import { errorText, useToast } from './ui/Feedback';
import { CardTitle } from './ui/Glass';

export function statusTone(status: Project['status']) {
  return status === 'launched' ? 'positive' : status === 'done' ? 'muted' : status === 'paused' ? 'negative' : status === 'idea' ? 'neutral' : 'accent';
}

export function Money({ value, signed, className = '' }: { value: number; signed?: boolean; className?: string }) {
  const color = signed ? (value > 0 ? 'text-[var(--positive)]' : value < 0 ? 'text-[var(--negative)]' : '') : '';
  return <span className={`tabular-nums ${color} ${className}`}>{signed && value > 0 ? '+' : ''}{formatRub(value)}</span>;
}

/** Заголовок блока внутри карточки со ссылкой «Все →». */
export function SectionHead({ title, to, action }: { title: string; to?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
      <CardTitle>{title}</CardTitle>
      {to && (
        <Link to={to} className="text-muted text-xs hover:text-white">
          Все →
        </Link>
      )}
      {action}
    </div>
  );
}

// ───────────── Карточка проекта ─────────────

export function ProjectCard({ project, finance, nextTask }: { project: Project; finance: ProjectFinance; nextTask?: Task }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className={`glass phone:p-4 group flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5 ${project.archived ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className="glass-chip h-11 w-11 text-xl">
          {project.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-6">{project.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge tone={statusTone(project.status)}>{PROJECT_STATUS[project.status]}</Badge>
            {project.archived && <Badge tone="muted">Архив</Badge>}
          </div>
        </div>
      </div>
      {project.description && <p className="text-muted line-clamp-2 text-sm leading-5">{project.description}</p>}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-black/15 p-3 text-xs">
        <div>
          <dt className="text-muted">Вложено</dt>
          <dd className="mt-0.5 text-sm"><Money value={finance.invested} /></dd>
        </div>
        <div>
          <dt className="text-muted">Доход</dt>
          <dd className="mt-0.5 text-sm"><Money value={finance.income} /></dd>
        </div>
        <div>
          <dt className="text-muted">Расходы</dt>
          <dd className="mt-0.5 text-sm"><Money value={finance.expense} /></dd>
        </div>
        <div>
          <dt className="text-muted">Результат</dt>
          <dd className="mt-0.5 text-sm font-medium"><Money value={finance.result} signed /></dd>
        </div>
      </dl>
      <div className="text-sm">
        <span className="text-muted text-xs">Следующая задача</span>
        <div className="truncate">{nextTask ? nextTask.title : <span className="text-white/40">не выбрана</span>}</div>
      </div>
      <div className="text-muted mt-auto flex items-center justify-between gap-2 text-xs">
        <span>Добавлен {formatDate(project.createdAt)}</span>
        <span className="flex gap-2">
          {project.githubUrl && <span title="Есть ссылка на GitHub">GitHub</span>}
          {project.demoUrl && <span title="Есть ссылка на демо">Demo</span>}
        </span>
      </div>
    </Link>
  );
}

// ───────────── Строки списков ─────────────

export function TransactionRow({ t, project, onClick }: { t: Transaction; project?: Project; onClick?: () => void }) {
  const content = (
    <>
      <span aria-hidden className={`glass-chip h-9 w-9 text-sm ${t.type === 'income' ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
        {t.type === 'income' ? '+' : '−'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{t.title}</span>
        <span className="text-muted block truncate text-xs">
          {formatDate(t.date)} · {categoryLabel(t.type, t.category)}
          {project ? ` · ${project.name}` : ''}
        </span>
      </span>
      <Money value={t.type === 'income' ? t.amount : -t.amount} signed className="shrink-0 text-sm font-medium" />
    </>
  );
  const cls = 'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} hover:bg-white/8`}>
      {content}
    </button>
  ) : (
    <div className={cls}>{content}</div>
  );
}

export function EventRow({ e, project }: { e: AppEvent; project?: Project }) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-2 py-2">
      <span aria-hidden className="glass-chip h-9 w-9 text-sm">
        {EVENT_ICON[e.type]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-5">{e.title}</div>
        <div className="text-muted mt-0.5 text-xs">
          {formatDateTime(e.createdAt)}
          {e.description && ` · ${e.description}`}
          {project && (
            <>
              {' · '}
              <Link to={`/projects/${project.id}`} className="underline decoration-white/30 underline-offset-2 hover:text-white">
                {project.name}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function TaskRow({
  task,
  project,
  isMain,
  onEdit,
  extra,
}: {
  task: Task;
  project?: Project;
  isMain?: boolean;
  onEdit?: () => void;
  extra?: React.ReactNode;
}) {
  const toast = useToast();
  const done = task.status === 'done';
  const due = task.dueDate ? dueLabel(task.dueDate) : null;

  async function toggle() {
    try {
      await setTaskStatus(task.id, done ? 'todo' : 'done');
      if (!done) toast('Задача выполнена');
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-white/5">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={done ? `Вернуть задачу «${task.title}» в работу` : `Отметить задачу «${task.title}» выполненной`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs ${done ? 'border-[var(--positive)] bg-[rgb(127_216_168/0.25)] text-[var(--positive)]' : 'border-white/35 hover:border-white/70'}`}
      >
        {done ? '✓' : ''}
      </button>
      <button type="button" onClick={onEdit} disabled={!onEdit} className="min-w-0 flex-1 py-1 text-left">
        <span className={`block truncate text-sm ${done ? 'text-white/45 line-through' : ''}`}>
          {isMain && <span className="mr-1 text-[var(--accent)]" title="Главная следующая задача">★</span>}
          {task.title}
        </span>
        <span className="text-muted block truncate text-xs">
          {PRIORITY[task.priority]} приоритет
          {task.status === 'in_progress' ? ' · в процессе' : ''}
          {due && <span className={due.overdue && !done ? 'text-[var(--negative)]' : ''}> · {due.text}</span>}
          {project ? ` · ${project.name}` : ''}
        </span>
      </button>
      {extra}
    </div>
  );
}

export function ListEmpty({ text }: { text: string }) {
  return <p className="text-muted px-2 py-6 text-center text-sm">{text}</p>;
}
