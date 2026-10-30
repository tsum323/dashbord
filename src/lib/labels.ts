import type {
  EventType,
  ExpenseCategory,
  IdeaStatus,
  IncomeCategory,
  Priority,
  ProjectStatus,
  TaskStatus,
  TransactionType,
} from '../db/types';

// Порядок ключей — порядок колонок и пунктов в списках.

export const PROJECT_STATUS: Record<ProjectStatus, string> = {
  idea: 'Идея',
  dev: 'В разработке',
  testing: 'Тестирование',
  launched: 'Запущено',
  paused: 'Пауза',
  done: 'Завершено',
};
export const PROJECT_STATUSES = Object.keys(PROJECT_STATUS) as ProjectStatus[];
export const ACTIVE_STATUSES: ProjectStatus[] = ['dev', 'testing', 'launched'];

export const TRANSACTION_TYPE: Record<TransactionType, string> = { income: 'Доход', expense: 'Расход' };

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  development: 'Разработка',
  subscriptions: 'Подписки',
  ai: 'AI-сервисы',
  ads: 'Реклама',
  equipment: 'Оборудование',
  other: 'Прочее',
};

export const INCOME_CATEGORY: Record<IncomeCategory, string> = {
  clients: 'Клиентские заказы',
  products: 'Продажи продуктов',
  ads: 'Реклама',
  other: 'Прочее',
};

export function categoriesFor(type: TransactionType): Record<string, string> {
  return type === 'income' ? INCOME_CATEGORY : EXPENSE_CATEGORY;
}

export function categoryLabel(type: TransactionType, category: string): string {
  return categoriesFor(type)[category] ?? category;
}

export const PRIORITY: Record<Priority, string> = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
export const PRIORITIES = Object.keys(PRIORITY) as Priority[];
export const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

export const TASK_STATUS: Record<TaskStatus, string> = { todo: 'К выполнению', in_progress: 'В процессе', done: 'Выполнено' };
export const TASK_STATUSES = Object.keys(TASK_STATUS) as TaskStatus[];

export const IDEA_STATUS: Record<IdeaStatus, string> = {
  new: 'Новая',
  review: 'На рассмотрении',
  interesting: 'Интересная',
  postponed: 'Отложена',
  rejected: 'Отклонена',
};
export const IDEA_STATUSES = Object.keys(IDEA_STATUS) as IdeaStatus[];

export const EVENT_TYPE: Record<EventType, string> = {
  project_created: 'Создание проекта',
  project_status: 'Смена статуса',
  income_added: 'Доход',
  expense_added: 'Расход',
  transaction_deleted: 'Удаление операции',
  task_created: 'Новая задача',
  task_completed: 'Задача выполнена',
  idea_created: 'Новая идея',
  idea_updated: 'Изменение идеи',
  idea_converted: 'Идея → проект',
};
export const EVENT_TYPES = Object.keys(EVENT_TYPE) as EventType[];

export const EVENT_ICON: Record<EventType, string> = {
  project_created: '▣',
  project_status: '⇄',
  income_added: '+',
  expense_added: '−',
  transaction_deleted: '✕',
  task_created: '☐',
  task_completed: '☑',
  idea_created: '✦',
  idea_updated: '✎',
  idea_converted: '➜',
};
