/**
 * Generative icon art, packed into one SVG symbol sprite.
 *
 * Pure functions, no I/O and no dependencies: the same call produces the same
 * sprite in the browser, in Node, in a worker and on the server. That makes it
 * safe to render during SSR and again on the client without hydration
 * mismatches — which is why randomness is always opt-in and always reported
 * back through the manifest.
 */

import { createRng } from "./rng.js";
import { Ctx, SIZE, el, g, nfmt } from "./svg.js";
import { HARMONIES, makePalette } from "./color.js";
import { clipFor, drawPlate } from "./plates.js";
import { MOTIFS } from "./motifs.js";

export { HARMONIES } from "./color.js";
export { SIZE, CX, CY, nfmt, el } from "./svg.js";
export { MOTIFS } from "./motifs.js";
export { createRng } from "./rng.js";
export { mountSprite, spriteBlobUrl, iconMarkup } from "./browser.js";

export const PLATES = [
  "roundrect",
  "circle",
  "squircle",
  "hex",
  "diamond",
  "octagon",
  "soft-square",
  "none",
];

export const STYLES = Object.keys(MOTIFS);

export const DEFAULT_COUNT = 128;
export const DEFAULT_SEED = 64;
export const MAX_SEED = 0xffffffff;
export const MIN_SIZE = 8;
export const MAX_SIZE = 1024;

const GOLDEN_ANGLE = 137.507764;
const SPRITE_ID = "generative-icons-sprite";
const DEFAULT_NAME = "Generative Icons";

/** Roll a seed, so a set can be recreated later from the value in the manifest. */
export function randomSeed(max = MAX_SEED) {
  const bound = Math.min(Math.max(Math.trunc(max), 1), MAX_SEED);
  return Math.floor(Math.random() * bound) + 1;
}

function resolveSize(size) {
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new Error(`size must be an integer between ${MIN_SIZE} and ${MAX_SIZE}`);
  }
  return size;
}

function resolveSeed(seed) {
  if (seed === undefined) return DEFAULT_SEED;
  if (seed === "random") return randomSeed();
  if (!Number.isInteger(seed) || seed < 0 || seed > MAX_SEED) {
    throw new Error(`seed must be an integer between 0 and ${MAX_SEED}, or "random"`);
  }
  return seed;
}

function chooseFrom(name, wanted, available) {
  if (wanted === undefined) return available;
  if (!Array.isArray(wanted) || wanted.length === 0) {
    throw new Error(`${name} must be a non-empty array`);
  }
  const unknown = wanted.filter((value) => !available.includes(value));
  if (unknown.length > 0) {
    throw new Error(`unknown ${name}: ${unknown.join(", ")}`);
  }
  return wanted;
}

/** Narrow the space the style, harmony and plate are picked from. */
function resolveCatalogue(options) {
  return {
    styles: chooseFrom("styles", options.styles, STYLES),
    harmonies: chooseFrom("harmonies", options.harmonies, HARMONIES),
    plates: chooseFrom("plates", options.plates, PLATES),
  };
}

const DEFAULT_CATALOGUE = { styles: STYLES, harmonies: HARMONIES, plates: PLATES };

/** Render a single icon. `index` is 1-based, matching the `icon-001` ids. */
export function renderIcon(index, masterSeed, size = SIZE, catalogue = DEFAULT_CATALOGUE) {
  const { styles, harmonies, plates } = catalogue;
  resolveSize(size);
  const uid = `icon-${String(index).padStart(3, "0")}`;
  const rng = createRng((masterSeed * 10007 + index * 104729) & MAX_SEED);
  // Style, harmony and plate come from the index, so they stay put across
  // seeds; only the geometry inside a motif is drawn from the PRNG.
  const hue = (index * GOLDEN_ANGLE) % 360;
  const harmony = harmonies[(index * 3) % harmonies.length];
  const style = styles[(index - 1) % styles.length];
  const plate = plates[(index * 5) % plates.length];

  const pal = makePalette(rng, hue, harmony);
  const ctx = new Ctx(rng, pal, uid);
  const [cid, clip] = clipFor(plate, uid);
  ctx.defs.push(clip);

  const motif = MOTIFS[style](ctx);
  const body = g(drawPlate(ctx, plate) + motif, { clip_path: `url(#${cid})` });

  // The motifs are drawn in a 64x64 space. Without this scale the viewBox would
  // crop them at any other size; at size 64 the scale is 1 and the markup is
  // unchanged.
  const scale = size / SIZE;
  const artwork = scale === 1 ? body : g(body, { transform: `scale(${nfmt(scale)})` });

  const defs = ctx.defs.length ? el("defs", {}, ctx.defs.join("")) : "";
  const symbol = el("symbol", { id: uid, viewBox: `0 0 ${size} ${size}` }, defs + artwork);

  return {
    id: uid,
    index,
    style,
    harmony,
    hue: Math.round(hue * 100) / 100,
    plate,
    colors: pal.all,
    symbol,
  };
}

/** Wrap rendered icons into one `<symbol>` sprite document. */
export function buildSprite(icons, size = SIZE) {
  const symbols = icons.map((icon) => icon.symbol).join("\n  ");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ' +
    `id="${SPRITE_ID}" viewBox="0 0 ${size} ${size}" width="0" height="0" ` +
    'aria-hidden="true" focusable="false">\n' +
    `  ${symbols}\n` +
    "</svg>\n"
  );
}

/**
 * Build the manifest. `styles`, `harmonies` and `plates` describe the space
 * this particular set was drawn from, not the full catalogue — a set built
 * from two motifs should say so.
 *
 * Pass `generatedAt` to keep the output fully deterministic.
 */
export function buildManifest(icons, options = {}) {
  const {
    name = DEFAULT_NAME,
    seed,
    size = SIZE,
    generatedAt,
    styles = STYLES,
    harmonies = HARMONIES,
    plates = PLATES,
  } = options;

  return {
    name,
    generatedAt: generatedAt ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    seed,
    count: icons.length,
    size,
    sprite: "/icons.svg",
    harmonies: [...harmonies],
    styles: [...styles],
    plates: [...plates],
    icons: icons.map((icon) => ({
      id: icon.id,
      index: icon.index,
      style: icon.style,
      harmony: icon.harmony,
      hue: icon.hue,
      plate: icon.plate,
      colors: icon.colors,
    })),
  };
}

/**
 * Generate a whole set.
 *
 * @returns `{ sprite, manifest, icons }`
 */
export function generateSprite(options = {}) {
  const { count = DEFAULT_COUNT, size = SIZE, generatedAt, seed, name } = options;
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("count must be >= 1");
  }

  const resolvedSize = resolveSize(size);
  const resolvedSeed = resolveSeed(seed);
  const catalogue = resolveCatalogue(options);
  const icons = Array.from({ length: count }, (_, i) =>
    renderIcon(i + 1, resolvedSeed, resolvedSize, catalogue),
  );

  return {
    sprite: buildSprite(icons, resolvedSize),
    manifest: buildManifest(icons, {
      name,
      seed: resolvedSeed,
      size: resolvedSize,
      generatedAt,
      ...catalogue,
    }),
    icons,
  };
}
