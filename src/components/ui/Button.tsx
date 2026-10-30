import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-white/90 text-black font-medium hover:bg-white',
  secondary: 'bg-white/10 hover:bg-white/20',
  danger: 'bg-[rgb(242_160_160/0.18)] text-[var(--negative)] hover:bg-[rgb(242_160_160/0.28)]',
  ghost: 'hover:bg-white/10 text-white/80 hover:text-white',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', loading, disabled, className = '', children, ...rest }: Props) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm';
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? 'Подождите…' : children}
    </button>
  );
}

/** Маленькая цветная метка статуса. */
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'positive' | 'negative' | 'muted' }) {
  const tones = {
    neutral: 'bg-white/12 text-white/90',
    accent: 'bg-[rgb(184_166_255/0.2)] text-[#d9d0ff]',
    positive: 'bg-[rgb(127_216_168/0.16)] text-[var(--positive)]',
    negative: 'bg-[rgb(242_160_160/0.16)] text-[var(--negative)]',
    muted: 'bg-white/6 text-white/55',
  };
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-lg px-2 text-xs ${tones[tone]}`}>{children}</span>;
}
