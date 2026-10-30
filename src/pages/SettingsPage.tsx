import { useRef, useState } from 'react';
import { AboutCard, BackupCard, BudgetCard } from '../components/DataSettings';
import { useConfirm } from '../components/ui/Feedback';
import { CardTitle, GlassCard, PageHeader } from '../components/ui/Glass';
import { RotatedCover } from '../components/ui/RotatedCover';
import type { Appearance } from '../db/types';
import {
  APPEARANCE_LIMITS,
  DEFAULT_APPEARANCE,
  removeBackground,
  rotateBackground,
  saveAppearance,
  saveBackground,
  updateAppearance,
  useAppearance,
  useBackground,
} from '../db/settings';

const LABELS: Record<keyof Appearance, { title: string; format: (v: number) => string }> = {
  dim: { title: 'Затемнение фона', format: (v) => `${Math.round(v * 100)}%` },
  blur: { title: 'Размытие панелей', format: (v) => `${v} px` },
  opacity: { title: 'Плотность панелей', format: (v) => `${Math.round(v * 100)}%` },
};

export function SettingsPage() {
  const appearance = useAppearance();
  const bg = useBackground();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      await saveBackground(file);
      setMessage({ ok: true, text: 'Фон сохранён на этом устройстве.' });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Не удалось сохранить фото.' });
    }
  }

  async function rotate(direction: 1 | -1) {
    try {
      await rotateBackground(direction);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Не удалось повернуть фото.' });
    }
  }

  return (
    <>
      <PageHeader title="Настройки" subtitle="Внешний вид и данные" />
      <div className="phone:gap-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard>
          <CardTitle>Фоновая фотография</CardTitle>
          <p className="text-muted mt-1 text-sm">
            Фото хранится только в этом браузере (IndexedDB) и никуда не загружается.
          </p>
          {bg ? (
            <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl">
              <RotatedCover src={bg.url} rotation={bg.rotation} alt="Текущий фон" />
            </div>
          ) : (
            <div className="text-muted mt-4 flex aspect-video items-center justify-center rounded-xl border border-dashed border-white/25 text-sm">
              Фото не выбрано
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {/* На телефоне — сетка в одну строку: «Заменить» сжимается, остальное фиксировано. */}
          <div className="phone:grid phone:grid-cols-[1fr_40px_40px_auto] mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="phone:px-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-medium text-black hover:bg-white"
            >
              {bg ? 'Заменить' : 'Выбрать фото'}
            </button>
            {bg && (
              <>
                <button
                  type="button"
                  onClick={() => void rotate(-1)}
                  title="Повернуть против часовой стрелки"
                  aria-label="Повернуть против часовой стрелки"
                  className="w-10 rounded-xl bg-white/10 py-2 text-sm hover:bg-white/20"
                >
                  ↺
                </button>
                <button
                  type="button"
                  onClick={() => void rotate(1)}
                  title="Повернуть по часовой стрелке"
                  aria-label="Повернуть по часовой стрелке"
                  className="w-10 rounded-xl bg-white/10 py-2 text-sm hover:bg-white/20"
                >
                  ↻
                </button>
              </>
            )}
            {bg && (
              <button
                type="button"
                onClick={async () => {
                  if (await confirm({ title: 'Убрать фото?', text: 'Фон станет однотонным. Фото можно будет выбрать снова.', confirmLabel: 'Убрать', danger: true }))
                    await removeBackground();
                }}
                className="phone:px-3 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
              >
                Убрать
              </button>
            )}
          </div>
          {message && (
            <p role="status" className={`mt-3 text-sm ${message.ok ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
              {message.text}
            </p>
          )}
        </GlassCard>

        <GlassCard>
          <CardTitle>Стекло и фон</CardTitle>
          <div className="mt-4 space-y-5">
            {(Object.keys(LABELS) as (keyof Appearance)[]).map((key) => {
              const lim = APPEARANCE_LIMITS[key];
              return (
                <label key={key} className="block">
                  <div className="flex justify-between text-sm">
                    <span>{LABELS[key].title}</span>
                    <span className="text-muted tabular-nums">{LABELS[key].format(appearance[key])}</span>
                  </div>
                  <input
                    type="range"
                    min={lim.min}
                    max={lim.max}
                    step={lim.step}
                    value={appearance[key]}
                    onChange={(e) => void updateAppearance({ [key]: Number(e.target.value) })}
                    className="mt-2 w-full accent-white"
                  />
                </label>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void saveAppearance(DEFAULT_APPEARANCE)}
            className="mt-5 self-start rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Сбросить
          </button>
        </GlassCard>
        <BudgetCard />
        <BackupCard />
        <AboutCard />
      </div>
    </>
  );
}
