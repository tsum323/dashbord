import { EmptyState, GlassCard, PageHeader } from '../components/ui/Glass';

export function FeedPage() {
  return (
    <>
      <PageHeader title="Лента событий" subtitle="Хронология активности" />
      <GlassCard>
        <EmptyState title="Раздел в разработке" text="Функции появятся на этапе 5, после утверждения дизайна." />
      </GlassCard>
    </>
  );
}
