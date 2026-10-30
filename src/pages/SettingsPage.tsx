import { useRef, useState } from 'react';
import { GlassCard, PageHeader } from '../components/ui/Glass';
import type { Appearance } from '../db/types';
import {
  APPEARANCE_LIMITS,
  DEFAULT_APPEARANCE,
  removeBackground,
  rotateBackground,
  saveAppearance,
  saveBackground,
  useAppearance,
  useBackgroundUrl,
} from '../db/settings';

const LABELS: Record<keyof Appearance, { title: string; format: (v: number) => string }> = {
  dim: { title: 'Затемнение фона', format: (v) => `${Math.round(v * 100)}%` },
  blur: { title: 'Размытие панелей', format: (v) => `${v} px` },
  opacity: { title: 'Плотность панелей', format: (v) => `${Math.round(v * 100)}%` },
};

export function SettingsPage() {
  const appearance = useAppearance();
  const bgUrl = useBackgroundUrl();
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="font-medium">Фоновая фотография</h2>
          <p className="text-muted mt-1 text-sm">
            Фото хранится только в этом браузере (IndexedDB) и никуда не загружается.
          </p>
          {bgUrl ? (
            <img src={bgUrl} alt="Текущий фон" className="mt-4 aspect-video w-full rounded-xl object-cover" />
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
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-xl bg-white/90 px-4 py-2 text-sm font-medium text-black hover:bg-white"
            >
              {bgUrl ? 'Заменить фото' : 'Выбрать фото'}
            </button>
            {bgUrl && (
              <>
                <button
                  type="button"
                  onClick={() => void rotate(-1)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                >
                  ↺ Повернуть
                </button>
                <button
                  type="button"
                  onClick={() => void rotate(1)}
                  className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                >
                  ↻ Повернуть
                </button>
              </>
            )}
            {bgUrl && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Убрать фоновую фотографию?')) void removeBackground();
                }}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
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
          <h2 className="font-medium">Стекло и фон</h2>
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
                    onChange={(e) => void saveAppearance({ ...appearance, [key]: Number(e.target.value) })}
                    className="mt-2 w-full accent-white"
                  />
                </label>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => void saveAppearance(DEFAULT_APPEARANCE)}
            className="mt-5 rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          >
            Сбросить
          </button>
        </GlassCard>
      </div>
    </>
  );
}
