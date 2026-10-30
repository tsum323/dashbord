import { useAppearance, useBackground } from '../../db/settings';
import { RotatedCover } from '../ui/RotatedCover';

/**
 * Отдельный неподвижный слой с фотографией пользователя.
 * Живёт вне маршрутов, поэтому не перерисовывается при переходах между разделами.
 */
export function BackgroundLayer() {
  const bg = useBackground();
  const { dim } = useAppearance();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {bg && <RotatedCover src={bg.url} rotation={bg.rotation} />}
      <div className="absolute inset-0" style={{ background: `rgb(0 0 0 / ${dim})` }} />
    </div>
  );
}
