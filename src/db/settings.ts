import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { db, nowIso } from './db';
import type { Appearance } from './types';

export const DEFAULT_APPEARANCE: Appearance = { dim: 0.35, blur: 20, opacity: 0.18 };

export const APPEARANCE_LIMITS = {
  dim: { min: 0, max: 0.8, step: 0.05 },
  blur: { min: 0, max: 40, step: 1 },
  opacity: { min: 0.05, max: 0.6, step: 0.01 },
} as const;

export function useAppearance(): Appearance {
  const rec = useLiveQuery(() => db.settings.get('appearance'));
  return rec?.key === 'appearance' ? rec.value : DEFAULT_APPEARANCE;
}

export async function saveAppearance(value: Appearance): Promise<void> {
  await db.settings.put({ key: 'appearance', value });
}

/** undefined — ещё загружается, null — первичная настройка не пройдена. */
export function useSetup() {
  return useLiveQuery(async () => {
    const rec = await db.settings.get('setup');
    return rec?.key === 'setup' ? rec.value : null;
  });
}

export const MAX_BACKGROUND_BYTES = 15 * 1024 * 1024;

export async function saveBackground(file: File): Promise<void> {
  if (!file.type.startsWith('image/')) throw new Error('Это не изображение. Выберите JPG, PNG, WebP или HEIC-фото.');
  if (file.size > MAX_BACKGROUND_BYTES) throw new Error('Файл больше 15 МБ. Выберите фото поменьше.');
  await db.settings.put({ key: 'background', value: { blob: file, name: file.name, updatedAt: nowIso() } });
}

export async function removeBackground(): Promise<void> {
  await db.settings.delete('background');
}

/**
 * URL фоновой фотографии из IndexedDB. Создаётся один раз на изменение фото,
 * поэтому фон не перезагружается при переходах между разделами.
 */
export function useBackgroundUrl(): string | null {
  const rec = useLiveQuery(() => db.settings.get('background'));
  const blob = rec?.key === 'background' ? rec.value.blob : null;
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
