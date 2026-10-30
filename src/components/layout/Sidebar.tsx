import { NavLink } from 'react-router-dom';

export const NAV_ITEMS = [
  { to: '/', label: 'Главная', icon: '◎' },
  { to: '/projects', label: 'Проекты', icon: '▣' },
  { to: '/board', label: 'Доска проектов', icon: '▥' },
  { to: '/finance', label: 'Финансы', icon: '₽' },
  { to: '/feed', label: 'Лента событий', icon: '≋' },
  { to: '/ideas', label: 'Банк идей', icon: '✦' },
] as const;

const SETTINGS = { to: '/settings', label: 'Настройки', icon: '⚙' };

function Item({ to, label, icon }: { to: string; label: string; icon: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={label}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
          isActive ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/8 hover:text-white'
        }`
      }
    >
      <span className="w-5 shrink-0 text-center text-base">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );
}

/**
 * Компьютер (≥1024px): полное меню с подписями.
 * iPad в портретной ориентации: узкая колонка с иконками.
 */
export function Sidebar() {
  return (
    <nav
      aria-label="Разделы"
      className="glass fixed inset-y-3 left-3 z-20 flex w-[60px] flex-col gap-1 p-2 lg:w-[232px] lg:p-3"
    >
      <div className="mb-4 hidden px-3 pt-2 lg:block">
        <div className="text-shadow text-lg font-semibold tracking-tight">Personal Dashboard</div>
        <div className="text-muted text-xs">Командный центр</div>
      </div>
      <div className="mb-3 mt-1 text-center text-lg font-semibold lg:hidden">PD</div>
      {NAV_ITEMS.map((item) => (
        <Item key={item.to} {...item} />
      ))}
      <div className="mt-auto">
        <Item {...SETTINGS} />
      </div>
    </nav>
  );
}
