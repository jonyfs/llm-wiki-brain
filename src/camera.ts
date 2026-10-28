/* Perspective scale. Pure, testable in Node. */

/**
 * How much a point at depth `z` is scaled on screen, for a camera `dist` in front of the origin (1 at the origin,
 * larger when closer). A cell that swings through or behind the camera plane has no sensible size: it gets 0, so it
 * is not drawn and no radius ever goes negative (canvas `arc` throws on a negative radius). Cells very close to the
 * plane are capped at 4x instead of growing without bound.
 */
export function perspective(z: number, dist: number): number {
	const d = dist + z;
	return d > dist * 0.25 ? dist / d : 0;
}
