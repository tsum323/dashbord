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
      aria-label={label}
      className={({ isActive }) =>
        `nav-item flex h-11 items-center gap-3 rounded-xl px-1 text-sm transition-colors lg:px-2 ${
          isActive ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/6 hover:text-white'
        }`
      }
    >
      <span aria-hidden className="glass-chip text-sm">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </NavLink>
  );
}

/**
 * Геометрия (см. «Сетка» в index.css): меню отстоит от краёв экрана на 16px,
 * внутренний отступ 12px. Заголовок меню и заголовок страницы начинаются на одной высоте,
 * первый пункт меню — на уровне верхнего края первой карточки.
 * Компьютер (≥1024px): меню 240px с подписями. iPad в портрете: колонка 64px с иконками.
 */
export function Sidebar() {
  return (
    <nav
      aria-label="Разделы"
      className="glass fixed bottom-4 left-4 top-4 z-20 flex w-16 flex-col gap-1 p-3 lg:w-60"
    >
      <div className="h-[79px] shrink-0 lg:px-2">
        <div className="text-shadow text-center text-lg font-semibold leading-7 tracking-tight lg:text-left">
          <span className="lg:hidden">PD</span>
          <span className="hidden lg:inline">Personal Dashboard</span>
        </div>
        <div className="text-muted hidden text-xs leading-4 lg:block">Командный центр</div>
      </div>
      {NAV_ITEMS.map((item) => (
        <Item key={item.to} {...item} />
      ))}
      <div className="mt-auto">
        <Item {...SETTINGS} />
      </div>
    </nav>
  );
}
