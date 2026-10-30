import type { ReactNode } from 'react';

export function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`glass p-5 ${className}`}>{children}</section>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-shadow text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="text-muted text-shadow mt-1 text-sm">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="text-base font-medium">{title}</div>
      <p className="text-muted mt-1 max-w-sm text-sm">{text}</p>
    </div>
  );
}

export function Loading() {
  return <div className="text-muted p-6 text-sm">Загрузка…</div>;
}
