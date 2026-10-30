import { useMemo, useState } from 'react';
import { ProjectForm } from '../components/forms/ProjectForm';
import { ProjectCard } from '../components/items';
import { Button } from '../components/ui/Button';
import { SearchInput } from '../components/ui/Fields';
import { EmptyState, GlassCard, Loading, PageHeader } from '../components/ui/Glass';
import { FilterSelect, Toolbar } from '../components/ui/Toolbar';
import { useProjectFinances, useProjects, useTasks } from '../db/hooks';
import type { ProjectStatus } from '../db/types';
import { projectFinance } from '../lib/finance';
import { PROJECT_STATUS } from '../lib/labels';

type Sort = 'new' | 'old' | 'name' | 'result' | 'income';
const SORTS: [Sort, string][] = [
  ['new', 'Сначала новые'],
  ['old', 'Сначала старые'],
  ['name', 'По названию'],
  ['result', 'По результату'],
  ['income', 'По доходу'],
];

type View = 'active' | 'archived' | 'all';

export function ProjectsPage() {
  const projects = useProjects();
  const tasks = useTasks();
  const finances = useProjectFinances();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'all'>('all');
  const [sort, setSort] = useState<Sort>('new');
  const [view, setView] = useState<View>('active');
  const [creating, setCreating] = useState(false);

  const taskMap = useMemo(() => new Map((tasks ?? []).map((t) => [t.id, t])), [tasks]);

  const list = useMemo(() => {
    if (!projects || !finances) return [];
    const q = query.trim().toLowerCase();
    const res = projects.filter(
      (p) =>
        (view === 'all' || (view === 'archived') === p.archived) &&
        (status === 'all' || p.status === status) &&
        (!q || `${p.name} ${p.description} ${p.githubUrl}`.toLowerCase().includes(q)),
    );
    const fin = (id: string) => projectFinance(finances, id);
    const cmp: Record<Sort, (a: (typeof res)[0], b: (typeof res)[0]) => number> = {
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      old: (a, b) => a.createdAt.localeCompare(b.createdAt),
      name: (a, b) => a.name.localeCompare(b.name, 'ru'),
      result: (a, b) => fin(b.id).result - fin(a.id).result,
      income: (a, b) => fin(b.id).income - fin(a.id).income,
    };
    return res.sort(cmp[sort]);
  }, [projects, finances, query, status, sort, view]);

  if (!projects || !finances || !tasks) return <Loading />;

  return (
    <>
      <PageHeader
        title="Проекты"
        subtitle={`${projects.filter((p) => !p.archived).length} в каталоге${projects.some((p) => p.archived) ? ` · ${projects.filter((p) => p.archived).length} в архиве` : ''}`}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            + Проект
          </Button>
        }
      />
      <Toolbar>
        <div className="phone:col-span-2 min-w-[200px] flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Поиск проектов" />
        </div>
        <FilterSelect label="Статус" value={status} onChange={setStatus} options={[['all', 'Все статусы'], ...(Object.entries(PROJECT_STATUS) as [ProjectStatus, string][])]} />
        <FilterSelect label="Сортировка" value={sort} onChange={setSort} options={SORTS} />
        <FilterSelect
          label="Архив"
          value={view}
          onChange={setView}
          className="phone:col-span-2"
          options={[
            ['active', 'Без архива'],
            ['archived', 'Только архив'],
            ['all', 'Все, включая архив'],
          ]}
        />
      </Toolbar>

      {list.length ? (
        <div className="phone:gap-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <ProjectCard key={p.id} project={p} finance={projectFinance(finances, p.id)} nextTask={p.nextTaskId ? taskMap.get(p.nextTaskId) : undefined} />
          ))}
        </div>
      ) : (
        <GlassCard>
          {projects.length ? (
            <EmptyState title="Ничего не найдено" text="Измените поиск или фильтры." />
          ) : (
            <EmptyState title="Проектов пока нет" text="Создайте первый проект кнопкой «+ Проект» или превратите в проект идею." />
          )}
        </GlassCard>
      )}

      {creating && <ProjectForm onClose={() => setCreating(false)} />}
    </>
  );
}
