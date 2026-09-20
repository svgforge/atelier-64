/**
 * Bridge to @svgforge/generative-icons.
 *
 * The generator is pure and deterministic, so it runs unchanged on the server
 * (initial render) and in the browser (whenever a setting changes). Both sides
 * call it with the same options, so the markup matches and hydration stays
 * clean.
 */
import {
  DEFAULT_COUNT,
  DEFAULT_SEED,
  HARMONIES,
  MAX_SIZE,
  MIN_SIZE,
  generateSprite,
  spriteBlobUrl,
} from "@svgforge/generative-icons";
import type { Harmony, RenderedIcon } from "@svgforge/generative-icons";

export { DEFAULT_COUNT, DEFAULT_SEED, HARMONIES, randomSeed } from "@svgforge/generative-icons";

export const DEFAULT_SIZE = 64;

/**
 * Upper bounds for what the address bar carries. Deliberately small: `?seed=183472`
 * stays short and readable. The package itself accepts the full 32-bit seed
 * space and sizes from 8 to 1024.
 */
export const SEED_LIMIT = 999_999;
export const COUNT_LIMIT = 1000;

/** The generator settings the gallery drives. */
export type SpriteOptions = {
  seed: number;
  count: number;
  size: number;
  /** Allow-list; `undefined` means "draw from all eight". */
  harmonies?: Harmony[];
};

export type SpriteBundle = ReturnType<typeof generateSprite>;

/** Building a set costs a few dozen milliseconds, so identical settings are reused. */
const cache = new Map<string, SpriteBundle>();

export function getSprite(options: SpriteOptions): SpriteBundle {
  const { seed, count, size, harmonies } = options;
  const key = [seed, count, size, harmonies?.join("+") ?? "*"].join("|");

  const cached = cache.get(key);
  if (cached) return cached;

  const bundle = generateSprite({
    seed,
    count,
    size,
    harmonies,
    name: "Atelier 64",
  });
  cache.set(key, bundle);
  return bundle;
}

// --- URL plumbing ----------------------------------------------------------
//
// Every setting is optional in the URL: a bare `/` stays a bare `/`, and only
// what differs from the default is written out.

export type SpriteSearch = {
  seed?: number;
  count?: number;
  size?: number;
  harmonies?: string;
};

function readInt(raw: unknown, min: number, max: number): number | undefined {
  const value = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isInteger(value) || value < min || value > max) return undefined;
  return value;
}

/** Canonical comma list, or `undefined` when it covers the whole catalogue. */
export function readHarmonyParam(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const wanted = new Set(raw.split(",").map((part) => part.trim()));
  const kept = HARMONIES.filter((harmony) => wanted.has(harmony));
  if (kept.length === 0 || kept.length === HARMONIES.length) return undefined;
  return kept.join(",");
}

export function harmoniesFromParam(param: string | undefined): Harmony[] | undefined {
  const canonical = readHarmonyParam(param);
  if (!canonical) return undefined;
  return canonical.split(",") as Harmony[];
}

function harmoniesToParam(list: Harmony[] | undefined): string | undefined {
  if (!list || list.length === 0) return undefined;
  return readHarmonyParam(list.join(","));
}

/** Validate whatever arrived in the address bar; unusable values are dropped. */
export function readSearch(search: Record<string, unknown>): SpriteSearch {
  return {
    seed: readInt(search.seed, 1, SEED_LIMIT),
    count: readInt(search.count, 1, COUNT_LIMIT),
    size: readInt(search.size, MIN_SIZE, MAX_SIZE),
    harmonies: readHarmonyParam(search.harmonies),
  };
}

export function searchToOptions(search: SpriteSearch): SpriteOptions {
  return {
    seed: search.seed ?? DEFAULT_SEED,
    count: search.count ?? DEFAULT_COUNT,
    size: search.size ?? DEFAULT_SIZE,
    harmonies: harmoniesFromParam(search.harmonies),
  };
}

export function optionsToSearch(options: SpriteOptions): SpriteSearch {
  const search: SpriteSearch = {};
  if (options.seed !== DEFAULT_SEED) search.seed = options.seed;
  if (options.count !== DEFAULT_COUNT) search.count = options.count;
  if (options.size !== DEFAULT_SIZE) search.size = options.size;
  const harmonies = harmoniesToParam(options.harmonies);
  if (harmonies) search.harmonies = harmonies;
  return search;
}

// --- output helpers --------------------------------------------------------

/**
 * A self-contained SVG for a single icon — what you copy when you want the mark
 * without carrying the whole sprite along.
 */
export function standaloneIcon(icon: RenderedIcon, size: number): string {
  const inner = icon.symbol.replace(/^<symbol[^>]*>/, "").replace(/<\/symbol>$/, "");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}">${inner}</svg>`
  );
}

/** Hand the generated sprite to the user as a file. Browser only. */
export function downloadSprite(sprite: string, filename: string) {
  const url = spriteBlobUrl(sprite);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
