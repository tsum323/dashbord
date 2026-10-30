import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppearance } from '../../db/settings';
import { BackgroundLayer } from './BackgroundLayer';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const { blur, opacity, dim } = useAppearance();

  useEffect(() => {
    const s = document.documentElement.style;
    s.setProperty('--glass-blur', `${blur}px`);
    s.setProperty('--glass-opacity', String(opacity));
    s.setProperty('--bg-dim', String(dim));
  }, [blur, opacity, dim]);

  return (
    <>
      <BackgroundLayer />
      <Sidebar />
      {/* Слева: отступ 16 + меню (64 / 240) + отступ 16; справа 16. Сверху 28 — на уровне заголовка меню. */}
      <main className="min-h-dvh pb-4 pl-24 pr-4 pt-7 lg:pl-[272px]">
        <div>
          <Outlet />
        </div>
      </main>
    </>
  );
}
