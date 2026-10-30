import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Money } from '../components/items';
import { errorText, useToast } from '../components/ui/Feedback';
import { SearchInput } from '../components/ui/Fields';
import { Loading, PageHeader } from '../components/ui/Glass';
import { FilterSelect, Toolbar } from '../components/ui/Toolbar';
import { useProjectFinances, useProjects } from '../db/hooks';
import { setProjectStatus } from '../db/repo';
import type { Project, ProjectStatus } from '../db/types';
import { projectFinance, type ProjectFinance } from '../lib/finance';
import { PROJECT_STATUS, PROJECT_STATUSES } from '../lib/labels';

function CardBody({ project, finance }: { project: Project; finance: ProjectFinance }) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="glass-chip h-8 w-8 text-base">
          {project.icon}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
      </div>
      {project.description && <p className="text-muted mt-2 line-clamp-2 text-xs leading-4">{project.description}</p>}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted">Результат</span>
        <Money value={finance.result} signed />
      </div>
    </>
  );
}

function BoardCard({ project, finance, onMove }: { project: Project; finance: ProjectFinance; onMove: (s: ProjectStatus) => void }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: project.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => navigate(`/projects/${project.id}`)}
      aria-roledescription="Перетаскиваемая карточка проекта"
      aria-label={`${project.name}, ${PROJECT_STATUS[project.status]}. Нажмите, чтобы открыть; удерживайте и перетащите, чтобы сменить статус.`}
      className={`cursor-grab touch-manipulation select-none rounded-2xl border border-white/15 bg-white/8 p-3 transition-opacity hover:bg-white/12 active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <CardBody project={project} finance={finance} />
      {/* Запасной способ без перетаскивания — удобно на телефоне. */}
      <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="mt-2">
        <FilterSelect label={`Статус проекта «${project.name}»`} value={project.status} onChange={onMove} options={Object.entries(PROJECT_STATUS) as [ProjectStatus, string][]} className="!h-8 w-full text-xs" />
      </div>
    </div>
  );
}

function Column({ status, children, count }: { status: ProjectStatus; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${PROJECT_STATUS[status]}: ${count}`}
      className={`glass phone:w-[78vw] flex w-[260px] shrink-0 snap-start flex-col p-3 transition-shadow xl:w-auto xl:min-w-0 xl:flex-1 ${isOver ? 'ring-2 ring-[var(--accent)]' : ''}`}
    >
      <header className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-medium">{PROJECT_STATUS[status]}</h2>
        <span className="text-muted rounded-lg bg-white/10 px-2 py-0.5 text-xs tabular-nums">{count}</span>
      </header>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2">{children}</div>
    </section>
  );
}

export function BoardPage() {
  const projects = useProjects();
  const finances = useProjectFinances();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState<'hide' | 'show'>('hide');
  const [activeId, setActiveId] = useState<string | null>(null);

  // Мышь: перетаскивание после сдвига на 6px (клик открывает проект).
  // Палец: после удержания 250 мс, чтобы не мешать прокрутке доски.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (projects ?? []).filter((p) => (archived === 'show' || !p.archived) && (!q || `${p.name} ${p.description}`.toLowerCase().includes(q)));
  }, [projects, query, archived]);

  if (!projects || !finances) return <Loading />;

  async function move(id: string, status: ProjectStatus) {
    const p = projects!.find((x) => x.id === id);
    if (!p || p.status === status) return;
    try {
      await setProjectStatus(id, status);
      toast(`«${p.name}» → ${PROJECT_STATUS[status]}`);
    } catch (e) {
      toast(errorText(e), 'error');
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (e.over) void move(String(e.active.id), e.over.id as ProjectStatus);
  }

  const active = activeId ? projects.find((p) => p.id === activeId) : null;

  return (
    <>
      <PageHeader title="Доска проектов" subtitle="Перетащите карточку в другую колонку, чтобы сменить этап" />
      <Toolbar>
        <div className="phone:col-span-2 min-w-[200px] flex-1">
          <SearchInput value={query} onChange={setQuery} placeholder="Поиск по доске" />
        </div>
        <FilterSelect
          label="Архив"
          value={archived}
          onChange={setArchived}
          className="phone:col-span-2"
          options={[
            ['hide', 'Без архивных'],
            ['show', 'С архивными'],
          ]}
        />
      </Toolbar>
      <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        {/* Колонки прокручиваются по горизонтали на iPad и телефоне; на широком экране — все шесть в ряд. */}
        <div className="phone:-mx-4 phone:px-4 -mr-4 flex snap-x gap-3 overflow-x-auto pb-3 pr-4 xl:mr-0 xl:overflow-visible xl:pr-0">
          {PROJECT_STATUSES.map((status) => {
            const items = visible.filter((p) => p.status === status);
            return (
              <Column key={status} status={status} count={items.length}>
                {items.map((p) => (
                  <BoardCard key={p.id} project={p} finance={projectFinance(finances, p.id)} onMove={(s) => void move(p.id, s)} />
                ))}
                {!items.length && <p className="text-muted m-auto py-6 text-center text-xs">Перетащите сюда</p>}
              </Column>
            );
          })}
        </div>
        <DragOverlay>
          {active ? (
            <div className="glass glass-strong w-[240px] rotate-2 cursor-grabbing p-3">
              <CardBody project={active} finance={projectFinance(finances, active.id)} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}
