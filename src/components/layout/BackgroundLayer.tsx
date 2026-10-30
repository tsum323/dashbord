import { useAppearance, useBackgroundUrl } from '../../db/settings';

/**
 * Отдельный неподвижный слой с фотографией пользователя.
 * Живёт вне маршрутов, поэтому не перерисовывается при переходах между разделами.
 */
export function BackgroundLayer() {
  const url = useBackgroundUrl();
  const { dim } = useAppearance();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {url && <img src={url} alt="" className="h-full w-full object-cover" decoding="async" />}
      <div className="absolute inset-0" style={{ background: `rgb(0 0 0 / ${dim})` }} />
    </div>
  );
}
