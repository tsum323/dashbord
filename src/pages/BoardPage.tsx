import { EmptyState, GlassCard, PageHeader } from '../components/ui/Glass';

export function BoardPage() {
  return (
    <>
      <PageHeader title="Доска проектов" subtitle="Kanban по этапам разработки" />
      <GlassCard>
        <EmptyState title="Раздел в разработке" text="Функции появятся на этапе 5, после утверждения дизайна." />
      </GlassCard>
    </>
  );
}
