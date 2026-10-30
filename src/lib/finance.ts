import type { ExpenseCategory, ID, Transaction } from '../db/types';

// Все финансовые показатели вычисляются из списка операций и не хранятся отдельно.

export interface Totals {
  income: number;
  expense: number;
  profit: number; // доходы − расходы
  budget: number; // начальный остаток + доходы − расходы
}

export function calcTotals(transactions: Transaction[], initialBalance: number): Totals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, profit: income - expense, budget: initialBalance + income - expense };
}

// Расходы проекта делятся без пересечений:
// «Вложено» — создание продукта (разработка, оборудование);
// «Расходы» — текущие траты (подписки, AI-сервисы, реклама, прочее).
// Результат = доход − вложено − расходы.
export const INVESTMENT_CATEGORIES: ExpenseCategory[] = ['development', 'equipment'];

export interface ProjectFinance {
  invested: number;
  income: number;
  expense: number; // текущие расходы, без вложений
  result: number; // доход − вложено − расходы
}

const EMPTY: ProjectFinance = { invested: 0, income: 0, expense: 0, result: 0 };

/** Показатели по проектам. Операции без проекта сюда не попадают. */
export function calcProjectFinances(transactions: Transaction[]): Map<ID, ProjectFinance> {
  const map = new Map<ID, ProjectFinance>();
  for (const t of transactions) {
    if (!t.projectId) continue;
    const f = map.get(t.projectId) ?? { ...EMPTY };
    if (t.type === 'income') {
      f.income += t.amount;
    } else {
      if (INVESTMENT_CATEGORIES.includes(t.category as ExpenseCategory)) f.invested += t.amount;
      else f.expense += t.amount;
    }
    f.result = f.income - f.invested - f.expense;
    map.set(t.projectId, f);
  }
  return map;
}

export function projectFinance(map: Map<ID, ProjectFinance>, id: ID): ProjectFinance {
  return map.get(id) ?? EMPTY;
}
