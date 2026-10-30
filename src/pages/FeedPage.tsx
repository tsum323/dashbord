import { useState } from 'react';
import { EventRow } from '../components/items';
import { EmptyState, GlassCard, Loading, PageHeader } from '../components/ui/Glass';
import { FilterSelect, Toolbar } from '../components/ui/Toolbar';
import { useEvents, useProjectMap, useProjects } from '../db/hooks';
import type { AppEvent, EventType } from '../db/types';
import { formatDate, toLocalISODate } from '../lib/date';
import { EVENT_TYPE } from '../lib/labels';

// Группы фильтра: близкие типы событий объединены.
const GROUPS: Record<string, { label: string; types: EventType[] }> = {
  all: { label: 'Все события', types: [] },
  projects: { label: 'Проекты', types: ['project_created', 'project_status'] },
  finance: { label: 'Финансы', types: ['income_added', 'expense_added', 'transaction_deleted'] },
  tasks: { label: 'Задачи', types: ['task_created', 'task_completed'] },
  ideas: { label: 'Идеи', types: ['idea_created', 'idea_updated', 'idea_converted'] },
};

const PAGE = 50;

export function FeedPage() {
  const events = useEvents();
  const projects = useProjects();
  const projectMap = useProjectMap(projects);
  const [filter, setFilter] = useState<string>('all');
  const [limit, setLimit] = useState(PAGE);

  if (!events || !projects) return <Loading />;

  const types = filter in GROUPS ? GROUPS[filter].types : [filter as EventType];
  const filtered = events.filter((e) => !types.length || types.includes(e.type));
  const shown = filtered.slice(0, limit);

  const days: [string, AppEvent[]][] = [];
  for (const e of shown) {
    const day = toLocalISODate(new Date(e.createdAt));
    const last = days.at(-1);
    if (last && last[0] === day) last[1].push(e);
    else days.push([day, [e]]);
  }

  return (
    <>
      <PageHeader title="Лента событий" subtitle="Всё, что происходило, — от новых к старым" />
      <Toolbar>
        <FilterSelect
          label="Тип событий"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setLimit(PAGE);
          }}
          className="phone:col-span-2 min-w-[220px]"
          options={[
            ...Object.entries(GROUPS).map(([k, g]): [string, string] => [k, g.label]),
            ...Object.entries(EVENT_TYPE).map(([k, l]): [string, string] => [k, `· ${l}`]),
          ]}
        />
        <span className="text-muted phone:col-span-2 text-sm">Найдено: {filtered.length}</span>
      </Toolbar>
      <GlassCard>
        {days.length ? (
          days.map(([day, items]) => (
            <div key={day} className="mb-2">
              <div className="text-muted px-2 pb-1 pt-2 text-xs font-medium">{formatDate(day)}</div>
              {items.map((e) => (
                <EventRow key={e.id} e={e} project={e.projectId ? projectMap.get(e.projectId) : undefined} />
              ))}
            </div>
          ))
        ) : (
          <EmptyState title="Событий нет" text={events.length ? 'Под выбранный фильтр событий нет.' : 'Здесь появится история: проекты, операции, задачи и идеи.'} />
        )}
        {filtered.length > limit && (
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="text-muted mx-auto mt-2 block rounded-xl px-4 py-2 text-sm hover:bg-white/10 hover:text-white">
            Показать ещё
          </button>
        )}
      </GlassCard>
    </>
  );
}
