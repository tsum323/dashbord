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
      <main className="min-h-dvh py-6 pl-[84px] pr-4 md:pr-6 lg:pl-[260px] lg:pr-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </>
  );
}
