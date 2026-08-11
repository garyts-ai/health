import type { AnatomyHeroLayerAsset } from "@/lib/anatomy-hero-manifest";

export const ANATOMY_CYCLE_DELAY_MS = 1400;
export const ANATOMY_CYCLE_TOTAL_MS = 10800;
export const ANATOMY_CYCLE_EXPLODE_AT = 0.28;
export const ANATOMY_CYCLE_RESEAT_AT = 0.64;

function transform(x: number, y: number, rotate: number, scale: number) {
  return `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotate.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
}

/**
 * A long, calm loop: hold assembled, open the suit into its authored directions,
 * carry the loose pieces through a shallow orbital pass, then reseat them.
 * The artwork stays orthographic; the orbit is communicated by stagger and depth,
 * not by pretending the front illustration contains a back view.
 */
export function recurringKeyframesForLayer(asset: AnatomyHeroLayerAsset): Keyframe[] {
  if (!asset.assembly) {
    return [
      { transform: transform(0, 0, 0, 1), offset: 0 },
      { transform: transform(-1.5, 0, -0.18, .998), offset: .4 },
      { transform: transform(1.5, 0, .18, 1.002), offset: .61 },
      { transform: transform(0, 0, 0, 1), offset: 1 },
    ];
  }

  const { x, y, rotate, scale } = asset.explodedTransform;
  const depth = asset.depthPlane + 1;
  const lateralDirection = Math.sign(x) || (asset.id.endsWith("left") ? -1 : 1);
  const phaseOffset = Math.min(.055, asset.assembly.delayMs / 22000);
  const openStart = ANATOMY_CYCLE_EXPLODE_AT + phaseOffset;
  const openSeat = openStart + .115;
  const orbitPass = openSeat + .105;
  const returnStart = ANATOMY_CYCLE_RESEAT_AT - phaseOffset * .35;
  const returnSeat = Math.min(.84, returnStart + .13);
  const distance = 1.18 + depth * .08;
  const orbitX = lateralDirection * (3.5 + depth * 2.25);
  const orbitY = (depth - 2) * -2.25;

  return [
    { transform: transform(0, 0, 0, 1), opacity: 1, offset: 0 },
    { transform: transform(0, 0, 0, 1), opacity: 1, offset: openStart },
    {
      transform: transform(x * distance, y * distance, rotate, scale),
      opacity: .98,
      offset: openSeat,
    },
    {
      transform: transform(x * distance + orbitX, y * distance + orbitY, rotate * -.55, scale * .994),
      opacity: 1,
      offset: orbitPass,
    },
    {
      transform: transform(x * distance - orbitX * .42, y * distance - orbitY * .35, rotate * .38, scale),
      opacity: .98,
      offset: returnStart,
    },
    {
      transform: transform(x * -.045, y * -.045, rotate * -.04, 1.006),
      opacity: 1,
      offset: returnSeat,
    },
    { transform: transform(0, 0, 0, 1), opacity: 1, offset: .82 },
    { transform: transform(0, 0, 0, 1), opacity: 1, offset: 1 },
  ];
}

export function cycleTiming() {
  return {
    delay: ANATOMY_CYCLE_DELAY_MS,
    duration: ANATOMY_CYCLE_TOTAL_MS,
    easing: "linear",
    fill: "both" as const,
    iterations: Infinity,
  };
}
