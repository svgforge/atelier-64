/**
 * SVG primitives and the drawing context.
 *
 * Attribute names use underscores (`stroke_width`) and are converted to dashes
 * on output, which keeps the call sites readable.
 */

export const SIZE = 64;
export const CX = 32.0;
export const CY = 32.0;

/** Format a number: at most two decimals, no trailing zeros. */
export function nfmt(value) {
  return String(Math.round(value * 100) / 100);
}

export function el(tag, attrs = {}, inner) {
  let out = `<${tag}`;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    let name = key.replaceAll("_", "-");
    if (name.endsWith("-")) name = name.slice(0, -1);
    out += ` ${name}="${value === true ? "true" : value}"`;
  }
  if (inner === undefined || inner === null) return `${out}/>`;
  return `${out}>${inner}</${tag}>`;
}

/** Stroke attributes shared by the rounded line work. */
export function roundJoin(extra = {}) {
  return { stroke_linecap: "round", stroke_linejoin: "round", ...extra };
}

// --- geometry --------------------------------------------------------------

export function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

export function pts(points) {
  return points.map(([x, y]) => `${nfmt(x)},${nfmt(y)}`).join(" ");
}

export function regularPoly(cx, cy, n, r, rot = -90.0) {
  return Array.from({ length: n }, (_, i) => polar(cx, cy, r, rot + (i * 360.0) / n));
}

export function starPts(cx, cy, n, rOut, rIn, rot = -90.0) {
  const step = 180.0 / n;
  return Array.from({ length: n * 2 }, (_, i) =>
    polar(cx, cy, i % 2 === 0 ? rOut : rIn, rot + i * step),
  );
}

// --- elements --------------------------------------------------------------

export function circle(cx, cy, r, attrs = {}) {
  return el("circle", { cx: nfmt(cx), cy: nfmt(cy), r: nfmt(r), ...attrs });
}

export function ellipse(cx, cy, rx, ry, attrs = {}) {
  return el("ellipse", { cx: nfmt(cx), cy: nfmt(cy), rx: nfmt(rx), ry: nfmt(ry), ...attrs });
}

export function rect(x, y, w, h, attrs = {}) {
  return el("rect", {
    x: nfmt(x),
    y: nfmt(y),
    width: nfmt(w),
    height: nfmt(h),
    ...attrs,
  });
}

export function polygon(points, attrs = {}) {
  return el("polygon", { points: pts(points), ...attrs });
}

export function polyline(points, attrs = {}) {
  return el("polyline", { points: pts(points), ...attrs });
}

export function line(x1, y1, x2, y2, attrs = {}) {
  return el("line", { x1: nfmt(x1), y1: nfmt(y1), x2: nfmt(x2), y2: nfmt(y2), ...attrs });
}

export function path(d, attrs = {}) {
  return el("path", { d, ...attrs });
}

export function g(inner, attrs = {}) {
  return el("g", attrs, inner);
}

// --- context ---------------------------------------------------------------

/**
 * Per-icon drawing context: the seeded RNG, the palette, the icon id and the
 * collected `<defs>` (gradients).
 */
export class Ctx {
  constructor(rng, pal, uid) {
    this.rng = rng;
    this.pal = pal;
    this.uid = uid;
    this.defs = [];
  }

  u(a, b) {
    return this.rng.uniform(a, b);
  }

  i(a, b) {
    return this.rng.randint(a, b);
  }

  choice(seq) {
    return this.rng.choice(seq);
  }

  chance(p) {
    return this.rng.chance(p);
  }

  radial(c0, c1, r = 32, cx = CX, cy = CY) {
    const gid = `${this.uid}-rg${this.defs.length}`;
    this.defs.push(
      el(
        "radialGradient",
        { id: gid, cx: nfmt(cx), cy: nfmt(cy), r: nfmt(r), gradientUnits: "userSpaceOnUse" },
        `<stop offset="0%" stop-color="${c0}"/><stop offset="100%" stop-color="${c1}"/>`,
      ),
    );
    return `url(#${gid})`;
  }

  linear(c0, c1, x1 = 12, y1 = 8, x2 = 52, y2 = 56) {
    const gid = `${this.uid}-lg${this.defs.length}`;
    this.defs.push(
      el(
        "linearGradient",
        {
          id: gid,
          x1: nfmt(x1),
          y1: nfmt(y1),
          x2: nfmt(x2),
          y2: nfmt(y2),
          gradientUnits: "userSpaceOnUse",
        },
        `<stop offset="0%" stop-color="${c0}"/><stop offset="100%" stop-color="${c1}"/>`,
      ),
    );
    return `url(#${gid})`;
  }
}
