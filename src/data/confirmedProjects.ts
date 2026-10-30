import type { ProjectStatus } from '../db/types';

// Проекты, подтверждённые владельцем после аудита GitHub (30.10.2026).
// Это только предложение для импорта: в базу они попадают, когда пользователь
// отметит их в мастере настройки или в разделе «Проекты».

export interface ConfirmedProject {
  name: string;
  icon: string;
  description: string;
  status: ProjectStatus;
  githubUrl: string;
  demoUrl: string;
}

export const CONFIRMED_PROJECTS: ConfirmedProject[] = [
  {
    name: 'Trading',
    icon: '📈',
    description: 'Аналитический терминал для исследования криптовалютного рынка: свечи, индикаторы, бумажная торговля, журнал гипотез.',
    status: 'dev',
    githubUrl: 'https://github.com/tsum323/trading',
    demoUrl: 'https://tsum323.github.io/trading/',
  },
  {
    name: 'Параллельная жизнь (Gorodok)',
    icon: '🏙️',
    description: 'Пиксельный симулятор жизни города: 21 персонаж и архив идей виртуального Дани.',
    status: 'launched',
    githubUrl: 'https://github.com/tsum323/gorodok',
    demoUrl: 'https://tsum323.github.io/gorodok/',
  },
  {
    name: 'Income Hunter (AI-skaut)',
    icon: '🔭',
    description: 'Поиск и проверка возможностей заработка: сбор с площадок, проверка доступности, рейтинг, ежедневный отчёт.',
    status: 'dev',
    githubUrl: 'https://github.com/tsum323/AI-skaut',
    demoUrl: '',
  },
  {
    name: 'AI Court (Суд идей)',
    icon: '⚖️',
    description: 'Девять AI-агентов рассматривают идею, главный судья выносит вердикт.',
    status: 'testing',
    githubUrl: 'https://github.com/tsum323/sud-idei',
    demoUrl: '',
  },
  {
    name: 'TEHNIKA',
    icon: '🚜',
    description: 'Сайт аренды строительной техники в Краснодарском крае: каталог, заявка, админ-панель.',
    status: 'dev',
    githubUrl: 'https://github.com/tsum323/TEHNIKA',
    demoUrl: '',
  },
  {
    name: 'Monte Barbershop',
    icon: '💈',
    description: 'Макет сайта для барбершопа «Монте», Краснодар.',
    status: 'idea',
    githubUrl: 'https://github.com/tsum323/Monte-Barbershop',
    demoUrl: '',
  },
  {
    name: 'DWeb',
    icon: '📐',
    description: 'Портфолио веб-разработчика: сайты для бизнеса, анкета заявки в Telegram.',
    status: 'launched',
    githubUrl: 'https://github.com/tsum323/DWeb',
    demoUrl: 'https://tsum323.github.io/DWeb/',
  },
  {
    name: 'Barbershop Template',
    icon: '✂️',
    description: 'Шаблон сайта барбершопа для быстрой настройки под нового клиента.',
    status: 'done',
    githubUrl: 'https://github.com/tsum323/barbershop-template',
    demoUrl: 'https://tsum323.github.io/barbershop-template/',
  },
];
