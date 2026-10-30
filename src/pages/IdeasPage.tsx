import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IdeaForm } from '../components/forms/IdeaForm';
import { ProjectForm } from '../components/forms/ProjectForm';
import { Badge, Button } from '../components/ui/Button';
import { errorText, useConfirm, useToast } from '../components/ui/Feedback';
import { SearchInput } from '../components/ui/Fields';
import { EmptyState, GlassCard, Loading, PageHeader } from '../components/ui/Glass';
import { FilterSelect, Toolbar } from '../components/ui/Toolbar';
import { useIdeas, useProjectMap, useProjects } from '../db/hooks';
import { convertIdeaToProject, deleteIdea, updateIdea } from '../db/repo';
import type { Idea, IdeaStatus, Priority } from '../db/types';
import { formatDate } from '../lib/date';
import { IDEA_STATUS, PRIORITY, PRIORITY_RANK } from '../lib/labels';

type Sort = 'new' | 'old' | 'priority' | 'title';
type Dialog = { kind: 'edit'; idea?: Idea } | { kind: 'convert'; idea: Idea } | null;

const STATUS_TONE: Record<IdeaStatus, 'neutral' | 'accent' | 'positive' | 'muted' | 'negative'> = {
  new: 'neutral',
  review: 'accent',
  interesting: 'positive',
  postponed: 'muted',
  rejected: 'negative',
};

export function IdeasPage() {
  const ideas = useIdeas();
  const projects = useProjects();
  const projectMap = useProjectMap(projects);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<IdeaStatus | 'all' | 'open'>('open');
  const [priority, setPriority] = useState<Priority | 'all'>('all');
  const [sort, setSort] = useState<Sort>('new');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const res = (ideas ?? []).filter(
      (i) =>
        (status === 'all' || (status === 'open' ? i.status !== 'rejected' : i.status === status)) &&
        (priority === 'all' || i.priority === priority) &&
        (!q || `${i.title} ${i.description} ${i.audience} ${i.potential} ${i.comments}`.toLowerCase().includes(q)),
    );
    const cmp: Record<Sort, (a: Idea, b: Idea) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      old: (a, b) => a.createdAt.localeCompare(b.createdAt),
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.createdAt.localeCompare(a.createdAt),
      title: (a, b) => a.title.localeCompare(b.title, 'ru'),
    };
    return res.sort(cmp[sort]);
  }, [ideas, query, status, priority, sort]);

  if (!ideas || !projects) return <Loading />;

  async function run(action: () => Promise<void>, success: string) {
    try {
      await action();
      toast(success);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  async function onDelete(i: Idea) {
    if (await confirm({ title: 'Удалить идею?', text: `«${i.title}» будет удалена без возможности восстановления.`, confirmLabel: 'Удалить', danger: true }))
      await run(() => deleteIdea(i.id), 'Идея удалена');
  }

  return (
    <>
      <PageHeader
        title="Банк идей"
        subtitle={`${ideas.length} ${ideas.length === 1 ? 'идея' : 'идей'} · ${ideas.filter((i) => i.projectId).length} стали проектами`}
        actions={
          <Button variant="primary" onClick={() => setDialog({ kind: 'edit' })}>
            + Идея
          </Button>
        }
      />
      <Toolbar>
        <div className="phone:col-span-2 min-w-[200px] flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Поиск идей" />
        </div>
        <FilterSelect
          label="Статус"
          value={status}
          onChange={setStatus}
          options={[['open', 'Актуальные'], ['all', 'Все статусы'], ...(Object.entries(IDEA_STATUS) as [IdeaStatus, string][])]}
        />
        <FilterSelect
          label="Сортировка"
          value={sort}
          onChange={setSort}
          options={[
            ['new', 'Сначала новые'],
            ['old', 'Сначала старые'],
            ['priority', 'По приоритету'],
            ['title', 'По названию'],
          ]}
        />
        <FilterSelect
          label="Приоритет"
          value={priority}
          onChange={setPriority}
          className="phone:col-span-2"
          options={[['all', 'Все приоритеты'], ...(Object.entries(PRIORITY) as [Priority, string][])]}
        />
      </Toolbar>

      {list.length ? (
        <div className="phone:gap-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((i) => {
            const project = i.projectId ? projectMap.get(i.projectId) : undefined;
            return (
              <GlassCard key={i.id} className="gap-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 font-semibold leading-6">{i.title}</h3>
                  <Badge tone={STATUS_TONE[i.status]}>{IDEA_STATUS[i.status]}</Badge>
                </div>
                {i.description && <p className="text-muted line-clamp-3 whitespace-pre-line text-sm leading-5">{i.description}</p>}
                <dl className="grid gap-1.5 text-xs">
                  <div className="flex gap-2">
                    <dt className="text-muted w-24 shrink-0">Аудитория</dt>
                    <dd className="min-w-0">{i.audience || '—'}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted w-24 shrink-0">Потенциал</dt>
                    <dd className="min-w-0">{i.potential || '—'}</dd>
                  </div>
                  {i.comments && (
                    <div className="flex gap-2">
                      <dt className="text-muted w-24 shrink-0">Комментарии</dt>
                      <dd className="line-clamp-2 min-w-0">{i.comments}</dd>
                    </div>
                  )}
                </dl>
                <div className="grid grid-cols-2 gap-2">
                  <FilterSelect
                    label={`Приоритет идеи «${i.title}»`}
                    value={i.priority}
                    onChange={(p: Priority) => void run(() => updateIdea(i.id, { priority: p }), `Приоритет: ${PRIORITY[p].toLowerCase()}`)}
                    options={Object.entries(PRIORITY) as [Priority, string][]}
                    className="!h-9 text-xs"
                  />
                  <FilterSelect
                    label={`Статус идеи «${i.title}»`}
                    value={i.status}
                    onChange={(s: IdeaStatus) => void run(() => updateIdea(i.id, { status: s }), `Статус: ${IDEA_STATUS[s].toLowerCase()}`)}
                    options={Object.entries(IDEA_STATUS) as [IdeaStatus, string][]}
                    className="!h-9 text-xs"
                  />
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                  {project ? (
                    <Link to={`/projects/${project.id}`} className="text-sm text-[#d9d0ff] hover:underline">
                      ➜ Проект «{project.name}»
                    </Link>
                  ) : (
                    <Button size="sm" variant="primary" onClick={() => setDialog({ kind: 'convert', idea: i })}>
                      Превратить в проект
                    </Button>
                  )}
                  <span className="ml-auto flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'edit', idea: i })}>
                      Изменить
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void onDelete(i)} aria-label={`Удалить идею «${i.title}»`}>
                      Удалить
                    </Button>
                  </span>
                </div>
                <div className="text-muted text-xs">Создана {formatDate(i.createdAt)}</div>
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard>
          {ideas.length ? (
            <EmptyState title="Ничего не найдено" text="Измените поиск или фильтры." />
          ) : (
            <EmptyState title="Идей пока нет" text="Записывайте сюда всё, что может стать проектом или источником дохода." />
          )}
        </GlassCard>
      )}

      {dialog?.kind === 'edit' && <IdeaForm idea={dialog.idea} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'convert' && (
        <ProjectForm
          title="Превратить в проект"
          note={`Предварительная карточка проекта из идеи «${dialog.idea.title}». Проверьте поля — проект будет создан только после подтверждения.`}
          submitLabel="Подтвердить и создать"
          initial={{
            name: dialog.idea.title,
            icon: '💡',
            description: [dialog.idea.description, dialog.idea.audience && `Аудитория: ${dialog.idea.audience}`, dialog.idea.potential && `Потенциал: ${dialog.idea.potential}`]
              .filter(Boolean)
              .join('\n'),
            status: 'idea',
            githubUrl: '',
            demoUrl: '',
          }}
          onSubmitOverride={async (input) => {
            const p = await convertIdeaToProject(dialog.idea.id, input);
            navigate(`/projects/${p.id}`);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
