import type { Rotation } from '../../db/types';

/**
 * Изображение, заполняющее родителя как object-fit: cover, с поворотом на 0/90/180/270°.
 * При 90° и 270° стороны меняются местами через единицы контейнера (cqw/cqh),
 * поэтому пропорции фото не искажаются. Родитель должен иметь размер.
 */
export function RotatedCover({ src, rotation, alt = '' }: { src: string; rotation: Rotation; alt?: string }) {
  const sideways = rotation === 90 || rotation === 270;
  return (
    <div className="absolute inset-0 overflow-hidden [container-type:size]">
      <img
        src={src}
        alt={alt}
        decoding="async"
        className="absolute left-1/2 top-1/2 max-w-none object-cover"
        style={{
          width: sideways ? '100cqh' : '100cqw',
          height: sideways ? '100cqw' : '100cqh',
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
      />
    </div>
  );
}
