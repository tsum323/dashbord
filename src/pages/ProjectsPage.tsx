import { EmptyState, GlassCard, PageHeader } from '../components/ui/Glass';

export function ProjectsPage() {
  return (
    <>
      <PageHeader title="Проекты" subtitle="Каталог подтверждённых проектов" />
      <GlassCard>
        <EmptyState title="Раздел в разработке" text="Функции появятся на этапе 5, после утверждения дизайна." />
      </GlassCard>
    </>
  );
}
