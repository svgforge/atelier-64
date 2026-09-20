/** Plate silhouettes: the backdrop shape each motif is clipped to. */

import { CX, CY, circle, el, path, polygon, rect, regularPoly } from "./svg.js";

const SQUIRCLE_D =
  "M32 3 C48 3 61 16 61 32 C61 48 48 61 32 61 " + "C16 61 3 48 3 32 C3 16 16 3 32 3Z";

export function drawPlate(ctx, kind) {
  const fill = ctx.radial(ctx.pal.muted, ctx.pal.plate, 36);
  if (kind === "none") return "";
  if (kind === "circle") return circle(CX, CY, 30, { fill });
  if (kind === "roundrect") return rect(3, 3, 58, 58, { rx: 14, fill });
  if (kind === "soft-square") return rect(4, 4, 56, 56, { rx: 8, fill });
  if (kind === "squircle") return path(SQUIRCLE_D, { fill });
  if (kind === "hex") return polygon(regularPoly(CX, CY, 6, 30, -90), { fill });
  if (kind === "diamond") return polygon(regularPoly(CX, CY, 4, 30, 0), { fill });
  if (kind === "octagon") return polygon(regularPoly(CX, CY, 8, 30, -22.5), { fill });
  return rect(3, 3, 58, 58, { rx: 14, fill });
}

/** Returns `[clipId, clipPathElement]` for the given plate shape. */
export function clipFor(kind, uid) {
  const cid = `${uid}-clip`;
  let shape;
  if (kind === "circle") shape = circle(CX, CY, 30);
  else if (kind === "hex") shape = polygon(regularPoly(CX, CY, 6, 30, -90));
  else if (kind === "diamond") shape = polygon(regularPoly(CX, CY, 4, 30, 0));
  else if (kind === "octagon") shape = polygon(regularPoly(CX, CY, 8, 30, -22.5));
  else if (kind === "squircle") shape = path(SQUIRCLE_D);
  else if (kind === "none") shape = rect(0, 0, 64, 64);
  else if (kind === "soft-square") shape = rect(4, 4, 56, 56, { rx: 8 });
  else shape = rect(3, 3, 58, 58, { rx: 14 });
  return [cid, el("clipPath", { id: cid }, shape)];
}
