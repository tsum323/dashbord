// Работа с суммами в рублях. Внутри приложения — копейки (целые числа).

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatRub(kopecks: number): string {
  return rubFormatter.format(kopecks / 100);
}

/**
 * Разбирает ввод пользователя («1 500», «1500,50», «1500.5 ₽») в копейки.
 * Возвращает null, если сумма пустая, некорректная или не больше нуля
 * (allowZero — для начального остатка, который может быть нулём).
 */
export function parseRub(input: string, { allowZero = false } = {}): number | null {
  const cleaned = input.replace(/[\s ₽]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const kopecks = Math.round(Number(cleaned) * 100);
  if (!Number.isSafeInteger(kopecks)) return null;
  if (kopecks < 0 || (kopecks === 0 && !allowZero)) return null;
  return kopecks;
}
