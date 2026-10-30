import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

const control =
  'w-full rounded-xl border border-white/15 bg-black/25 px-3 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-white/45 focus:bg-black/35';

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="text-muted mb-1.5 block text-xs font-medium">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" {...props} className={`${control} h-11 ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${control} min-h-[80px] resize-y py-2.5 ${props.className ?? ''}`} />;
}

export function Select({ options, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { options: [string, string][] }) {
  return (
    <select {...props} className={`${control} h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 12 12%22><path d=%22M2 4l4 4 4-4%22 stroke=%22white%22 stroke-opacity=%220.6%22 fill=%22none%22 stroke-width=%221.5%22/></svg>')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-9 ${props.className ?? ''}`}>
      {options.map(([value, label]) => (
        <option key={value} value={value} className="bg-[#22222c]">
          {label}
        </option>
      ))}
    </select>
  );
}

/** Сегментированный переключатель (например, Доход / Расход). */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-black/25 p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`h-9 flex-1 rounded-lg text-sm transition-colors ${value === v ? 'bg-white/90 font-medium text-black' : 'text-white/75 hover:text-white'}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-[rgb(242_160_160/0.14)] px-3 py-2 text-sm text-[var(--negative)]">
      {message}
    </p>
  );
}

/** Поле поиска для панелей фильтров. */
export function SearchInput({ value, onChange, placeholder = 'Поиск' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${control} h-10`}
    />
  );
}
