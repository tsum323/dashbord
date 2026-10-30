import type { ReactNode } from 'react';

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass flex flex-col p-5 ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    // Высота 60 + отступ 24: карточки начинаются на уровне первого пункта меню.
    <header className="mb-6 flex min-h-[60px] flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-shadow text-[28px] font-semibold leading-9 tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted text-shadow mt-1 text-sm leading-5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Единый стиль заголовков внутри карточек. */
export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-muted text-sm font-medium leading-5">{children}</h2>;
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <div className="text-base font-medium">{title}</div>
      <p className="text-muted mt-1 max-w-sm text-sm">{text}</p>
    </div>
  );
}

export function Loading() {
  return <div className="text-muted p-6 text-sm">Загрузка…</div>;
}
