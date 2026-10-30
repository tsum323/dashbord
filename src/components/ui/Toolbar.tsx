import type { ReactNode } from 'react';

/** Панель фильтров над списками. На телефоне элементы встают в колонку. */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="glass phone:grid phone:grid-cols-2 phone:p-3 mb-4 flex flex-wrap items-center gap-2 p-3">{children}</div>;
}

/** Компактный select для панели фильтров. */
export function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={`h-10 min-w-0 appearance-none rounded-xl border border-white/15 bg-black/25 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M2 4l4 4 4-4%22 stroke=%22white%22 stroke-opacity=%220.6%22 fill=%22none%22 stroke-width=%221.5%22/></svg>')] bg-[length:12px] phone:pl-2.5 phone:pr-7 bg-[right_10px_center] bg-no-repeat pl-3 pr-8 text-sm text-white outline-none focus:border-white/45 ${className}`}
    >
      {options.map(([v, l]) => (
        <option key={v} value={v} className="bg-[#22222c]">
          {l}
        </option>
      ))}
    </select>
  );
}
