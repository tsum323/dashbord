import { EmptyState, GlassCard, PageHeader } from '../components/ui/Glass';

export function FinancePage() {
  return (
    <>
      <PageHeader title="Финансы" subtitle="Журнал доходов и расходов" />
      <GlassCard>
        <EmptyState title="Раздел в разработке" text="Функции появятся на этапе 5, после утверждения дизайна." />
      </GlassCard>
    </>
  );
}
