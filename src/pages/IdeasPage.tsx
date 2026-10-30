import { EmptyState, GlassCard, PageHeader } from '../components/ui/Glass';

export function IdeasPage() {
  return (
    <>
      <PageHeader title="Банк идей" subtitle="Идеи и их потенциал" />
      <GlassCard>
        <EmptyState title="Раздел в разработке" text="Функции появятся на этапе 5, после утверждения дизайна." />
      </GlassCard>
    </>
  );
}
