import { describe, expect, it } from 'vitest';
import type { Transaction } from '../src/db/types';
import { calcProjectFinances, calcTotals, projectFinance } from '../src/lib/finance';
import { parseRub } from '../src/lib/money';

let n = 0;
function tx(p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount'>): Transaction {
  n += 1;
  return {
    id: `t${n}`,
    title: 'op',
    date: '2026-10-30',
    category: 'other',
    projectId: null,
    comment: '',
    createdAt: '',
    updatedAt: '',
    ...p,
  };
}

describe('calcTotals', () => {
  it('без операций бюджет равен начальному остатку', () => {
    expect(calcTotals([], 1_000_00)).toEqual({ income: 0, expense: 0, profit: 0, budget: 1_000_00 });
  });

  it('бюджет = остаток + доходы − расходы', () => {
    const t = calcTotals(
      [tx({ type: 'income', amount: 50_000_00 }), tx({ type: 'expense', amount: 12_500_50 })],
      10_000_00,
    );
    expect(t).toEqual({ income: 50_000_00, expense: 12_500_50, profit: 37_499_50, budget: 47_499_50 });
  });
});

describe('calcProjectFinances', () => {
  it('операции без проекта не попадают в показатели проектов', () => {
    const map = calcProjectFinances([
      tx({ type: 'income', amount: 100_00, projectId: 'a' }),
      tx({ type: 'expense', amount: 30_00, projectId: 'a', category: 'development' }),
      tx({ type: 'expense', amount: 20_00, projectId: 'a', category: 'subscriptions' }),
      tx({ type: 'expense', amount: 999_00 }),
    ]);
    expect(projectFinance(map, 'a')).toEqual({ invested: 30_00, income: 100_00, expense: 50_00, result: 50_00 });
    expect(projectFinance(map, 'missing').result).toBe(0);
    expect(map.size).toBe(1);
  });
});

describe('parseRub', () => {
  it.each([
    ['1500', 150000],
    ['1 500,5', 150050],
    ['1500.25 ₽', 150025],
  ])('%s → %i коп.', (input, expected) => expect(parseRub(input)).toBe(expected));

  it.each(['', '0', '-5', 'abc', '1.234', '1,2,3'])('отклоняет «%s»', (input) => expect(parseRub(input)).toBeNull());

  it('ноль допустим для начального остатка', () => expect(parseRub('0', { allowZero: true })).toBe(0));
});
