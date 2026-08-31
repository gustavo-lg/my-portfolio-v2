export interface Point {
  x: number;
  y: number;
}

/** Frame-rate-independent-ish lerp toward a target. `ease` in (0,1]. */
export function lerp2d(current: Point, target: Point, ease: number): Point {
  const k = ease < 0 ? 0 : ease > 1 ? 1 : ease;
  return {
    x: current.x + (target.x - current.x) * k,
    y: current.y + (target.y - current.y) * k,
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
