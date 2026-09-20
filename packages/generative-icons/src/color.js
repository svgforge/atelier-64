/** Colour harmony palettes. */

export const HARMONIES = [
  "complementary",
  "analogous",
  "triadic",
  "split-complementary",
  "tetradic",
  "square",
  "monochromatic",
  "compound",
  "achromatic",
  "duotone",
];

export function clamp(v, lo = 0.0, hi = 1.0) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Normalise a hue to 0..360 — unlike JS `%`, negative input wraps forward. */
export function wrapHue(h) {
  return ((h % 360) + 360) % 360;
}

/** h in degrees, s/l in 0..1 — returns #rrggbb. */
export function hslToHex(h, s, l) {
  const hue = wrapHue(h) / 360.0;
  const sat = clamp(s);
  const lum = clamp(l);

  const hueToRgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r;
  let g;
  let b;
  if (sat === 0) {
    r = lum;
    g = lum;
    b = lum;
  } else {
    const q = lum < 0.5 ? lum * (1 + sat) : lum + sat - lum * sat;
    const p = 2 * lum - q;
    r = hueToRgb(p, q, hue + 1 / 3);
    g = hueToRgb(p, q, hue);
    b = hueToRgb(p, q, hue - 1 / 3);
  }

  const hex = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function huesFor(scheme, h) {
  switch (scheme) {
    case "complementary":
      return [h, h + 180];
    case "analogous":
      return [h - 32, h, h + 32];
    case "triadic":
      return [h, h + 120, h + 240];
    case "split-complementary":
      return [h, h + 150, h + 210];
    case "tetradic":
      return [h, h + 60, h + 180, h + 240];
    case "square":
      return [h, h + 90, h + 180, h + 270];
    case "monochromatic":
    case "achromatic":
    case "duotone":
      return [h];
    case "compound":
      return [h - 30, h, h + 150, h + 180];
    default:
      throw new Error(`unknown harmony: ${scheme}`);
  }
}

/**
 * Build a six-stop palette from a harmony scheme.
 *
 * Lightness is biased so marks read on a 64x64 tile: a dark plate, a mid body,
 * a contrasting accent, a light highlight and a near-black ink for strokes.
 */
export function makePalette(rng, hue, scheme) {
  const achromatic = scheme === "achromatic";
  const duotone = scheme === "duotone";
  const hues = huesFor(scheme, hue).map(wrapHue);
  let satBase = rng.uniform(0.48, 0.74);
  if (scheme === "monochromatic") satBase = rng.uniform(0.38, 0.62);
  if (achromatic) satBase = 0; // nur dort: entfaerben

  const pickH = (i) => hues[i % hues.length] + rng.uniform(-3.5, 3.5);

  const col = (i, sMul, l, sFloor = 0.12) => {
    // achromatisch: alles grau. duotone: genau der Akzent traegt Farbe.
    const colored = achromatic ? false : duotone ? i !== 0 : true;
    const s = colored ? clamp(satBase * sMul + rng.uniform(-0.04, 0.04), sFloor, 0.86) : 0;
    return hslToHex(colored ? pickH(i) : hues[0], s, clamp(l + rng.uniform(-0.03, 0.03)));
  };

  const plate = col(0, 0.55, rng.uniform(0.1, 0.18), 0.18);
  const body = col(0, 1.0, rng.uniform(0.42, 0.56));
  const accent = col(1, 1.05, rng.uniform(0.5, 0.64));
  const highlight = col(hues.length > 2 ? 2 : 0, 0.55, rng.uniform(0.82, 0.92), 0.08);
  const ink = col(0, 0.45, rng.uniform(0.06, 0.12), 0.1);
  const muted = col(hues.length > 1 ? 1 : 0, 0.7, rng.uniform(0.28, 0.38));

  const colors = [plate, body, accent, highlight, ink, muted];
  const all = [...new Set(colors)];
  return { plate, body, accent, highlight, ink, muted, all };
}
