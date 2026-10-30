import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { SETTINGS } from './Sidebar';

// На телефоне 5 основных разделов внизу, остальные — в «Ещё».
const TABS = [
  { to: '/', label: 'Главная', icon: '◎' },
  { to: '/projects', label: 'Проекты', icon: '▣' },
  { to: '/board', label: 'Доска', icon: '▥' },
  { to: '/finance', label: 'Финансы', icon: '₽' },
  { to: '/ideas', label: 'Идеи', icon: '✦' },
];

const MORE = [{ to: '/feed', label: 'Лента событий', icon: '≋' }, SETTINGS];

// Плашка 28 + промежуток 4 + подпись 16 = 48 из 52px внутренней высоты панели.
const tabClass = 'nav-item flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] leading-4 max-[359px]:text-[9.5px] max-[359px]:tracking-tight';

/** Нижняя стеклянная панель вкладок для телефона. Учитывает «домашнюю» полоску iPhone. */
export function BottomNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const moreActive = MORE.some((m) => m.to === pathname);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="phone:block hidden">
      {open && (
        <>
          <button
            type="button"
            aria-label="Закрыть меню"
            className="fixed inset-0 z-20 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div
            id="more-menu"
            className="glass glass-strong fixed bottom-[calc(var(--tabbar-h)+var(--safe-bottom)+24px)] right-[calc(16px+var(--safe-right))] z-30 flex w-56 flex-col gap-1 p-2"
          >
            {MORE.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                className={({ isActive }) =>
                  `nav-item flex h-12 items-center gap-3 rounded-xl px-2 text-sm ${isActive ? 'bg-white/10' : 'hover:bg-white/6'}`
                }
              >
                <span aria-hidden className="glass-chip">{m.icon}</span>
                {m.label}
              </NavLink>
            ))}
          </div>
        </>
      )}
      <nav
        aria-label="Разделы"
        className="glass fixed bottom-[calc(var(--safe-bottom)+12px)] left-[calc(12px+var(--safe-left))] right-[calc(12px+var(--safe-right))] z-30 mx-auto flex max-w-[520px] h-[var(--tabbar-h)] items-stretch gap-1 rounded-[1.5rem] p-1.5"
      >
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `${tabClass} ${isActive ? 'bg-white/10 text-white' : 'text-white/75'}`}>
            <span aria-hidden className="glass-chip h-7 w-7 text-xs">{t.icon}</span>
            <span className="w-full truncate text-center">{t.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="more-menu"
          aria-current={moreActive ? 'page' : undefined}
          onClick={() => setOpen((v) => !v)}
          className={`${tabClass} ${open || moreActive ? 'bg-white/10 text-white' : 'text-white/75'}`}
        >
          <span aria-hidden className="glass-chip h-7 w-7 text-xs">⋯</span>
          <span>Ещё</span>
        </button>
      </nav>
    </div>
  );
}
