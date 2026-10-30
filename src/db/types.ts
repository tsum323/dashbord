// Модели данных Personal Dashboard.
// Деньги везде хранятся в копейках (целые числа), чтобы не было ошибок округления.
// Даты операций и сроки задач — строки 'YYYY-MM-DD'; моменты времени — ISO-строки.

export type ID = string;

export type ProjectStatus = 'idea' | 'dev' | 'testing' | 'launched' | 'paused' | 'done';

export interface Project {
  id: ID;
  name: string;
  icon: string; // эмодзи
  description: string;
  status: ProjectStatus;
  archived: boolean;
  githubUrl: string;
  demoUrl: string;
  nextTaskId: ID | null; // главная следующая задача
  sourceIdeaId: ID | null; // идея, из которой создан проект
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'income' | 'expense';

export type ExpenseCategory = 'development' | 'subscriptions' | 'ai' | 'ads' | 'equipment' | 'other';
export type IncomeCategory = 'clients' | 'products' | 'ads' | 'other';

export interface Transaction {
  id: ID;
  title: string;
  type: TransactionType;
  amount: number; // копейки, > 0
  date: string; // YYYY-MM-DD
  category: ExpenseCategory | IncomeCategory;
  projectId: ID | null;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export type IdeaStatus = 'new' | 'review' | 'interesting' | 'postponed' | 'rejected';
export type Priority = 'low' | 'medium' | 'high';

export interface Idea {
  id: ID;
  title: string;
  description: string;
  audience: string;
  potential: string; // потенциал заработка, свободный текст
  priority: Priority;
  status: IdeaStatus;
  comments: string;
  projectId: ID | null; // проект, в который превращена идея
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: ID;
  title: string;
  description: string;
  projectId: ID;
  priority: Priority;
  dueDate: string | null; // YYYY-MM-DD
  status: TaskStatus;
  createdAt: string;
  completedAt: string | null;
}

export type EventType =
  | 'project_created'
  | 'project_status'
  | 'income_added'
  | 'expense_added'
  | 'transaction_deleted'
  | 'task_created'
  | 'task_completed'
  | 'idea_created'
  | 'idea_updated'
  | 'idea_converted';

export interface AppEvent {
  id: ID;
  type: EventType;
  title: string;
  description: string;
  createdAt: string;
  projectId: ID | null;
}

export interface Appearance {
  dim: number; // затемнение фона, 0..0.8
  blur: number; // размытие панелей, px 0..40
  opacity: number; // непрозрачность панелей, 0.05..0.6
}

// Поворот фото применяется при показе (CSS), сам файл не пересжимается.
export type Rotation = 0 | 90 | 180 | 270;

// Таблица settings — пары ключ/значение.
export type SettingsRecord =
  | { key: 'setup'; value: { initialBalance: number; completedAt: string } }
  | { key: 'appearance'; value: Appearance }
  | { key: 'background'; value: { blob: Blob; name: string; rotation?: Rotation; updatedAt: string } }
  | { key: 'lastExportAt'; value: string };

export type SettingsKey = SettingsRecord['key'];
