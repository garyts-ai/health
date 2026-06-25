export type PremiumSurfaceTransform = {
  rotateX: number;
  rotateY: number;
  pointerX: number;
  pointerY: number;
};

const MAX_TILT = 1.5;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function getPremiumSurfaceTransform({
  clientX,
  clientY,
  left,
  top,
  width,
  height,
}: {
  clientX: number;
  clientY: number;
  left: number;
  top: number;
  width: number;
  height: number;
}): PremiumSurfaceTransform {
  if (width <= 0 || height <= 0) {
    return { rotateX: 0, rotateY: 0, pointerX: 50, pointerY: 50 };
  }

  const pointerX = clamp(((clientX - left) / width) * 100, 0, 100);
  const pointerY = clamp(((clientY - top) / height) * 100, 0, 100);
  return {
    pointerX,
    pointerY,
    rotateX: clamp(((50 - pointerY) / 50) * MAX_TILT, -MAX_TILT, MAX_TILT),
    rotateY: clamp(((pointerX - 50) / 50) * MAX_TILT, -MAX_TILT, MAX_TILT),
  };
}

export const RESET_PREMIUM_SURFACE_TRANSFORM: PremiumSurfaceTransform = {
  rotateX: 0,
  rotateY: 0,
  pointerX: 50,
  pointerY: 50,
};
