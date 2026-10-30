// Даты операций и сроков — 'YYYY-MM-DD' в местном часовом поясе (не UTC),
// иначе после полуночи по Москве «сегодня» превращалось бы во «вчера».

export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toLocalISODate(new Date());
}

export function isValidISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function parseLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });

/** «30 окт. 2026»; для текущего года — «30 окт.». */
export function formatDate(iso: string): string {
  const d = iso.length === 10 ? parseLocal(iso) : new Date(iso);
  return d.getFullYear() === new Date().getFullYear() ? shortFmt.format(d) : dateFmt.format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const today = todayISO();
  const day = toLocalISODate(d);
  const yesterday = toLocalISODate(new Date(Date.now() - 86_400_000));
  const prefix = day === today ? 'Сегодня' : day === yesterday ? 'Вчера' : formatDate(iso);
  return `${prefix}, ${timeFmt.format(d)}`;
}

/** Сколько дней до срока: отрицательное — просрочено. */
export function daysUntil(isoDate: string, from = todayISO()): number {
  return Math.round((parseLocal(isoDate).getTime() - parseLocal(from).getTime()) / 86_400_000);
}

export function dueLabel(isoDate: string): { text: string; overdue: boolean } {
  const n = daysUntil(isoDate);
  if (n < 0) return { text: `просрочено на ${-n} дн.`, overdue: true };
  if (n === 0) return { text: 'сегодня', overdue: false };
  if (n === 1) return { text: 'завтра', overdue: false };
  return { text: formatDate(isoDate), overdue: false };
}
