/** Type definitions for @svgforge/generative-icons. */

export type Harmony =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "tetradic"
  | "square"
  | "monochromatic"
  | "compound";

export type Plate =
  "roundrect" | "circle" | "squircle" | "hex" | "diamond" | "octagon" | "soft-square" | "none";

/** An entry as it appears in the manifest. */
export interface IconRecord {
  id: string;
  index: number;
  style: string;
  harmony: string;
  hue: number;
  plate: string;
  colors: string[];
}

/** An entry as returned by `renderIcon` — includes the markup. */
export interface RenderedIcon extends IconRecord {
  symbol: string;
}

export interface SpriteManifest {
  name: string;
  generatedAt: string;
  /** The seed that was actually used — for `"random"`, the rolled value. */
  seed: number;
  count: number;
  size: number;
  sprite: string;
  /** The harmonies this set was drawn from. */
  harmonies: string[];
  /** The motifs this set was drawn from. */
  styles: string[];
  /** The plates this set was drawn from. */
  plates: string[];
  icons: IconRecord[];
}

/** The space a set is drawn from. Every field is an allow-list. */
export interface Catalogue {
  styles?: string[];
  harmonies?: Harmony[];
  plates?: Plate[];
}

export interface GenerateOptions extends Catalogue {
  /** Name reported in the manifest. Default "Generative Icons". */
  name?: string;
  /** Number of icons. Default 128. */
  count?: number;
  /**
   * Master seed, or `"random"` to roll one. The value actually used is reported
   * back as `manifest.seed`, so a rolled set stays reproducible.
   * Default 64.
   */
  seed?: number | "random";
  /**
   * Size of the coordinate space the art is drawn in, and of the `viewBox`.
   * The artwork is scaled into it, so any value renders the same picture at a
   * different coordinate scale. Integer between 8 and 1024. Default 64.
   */
  size?: number;
  /**
   * ISO timestamp for the manifest. Omit to use "now"; pass a fixed value for
   * fully deterministic output (useful for tests and SSR).
   */
  generatedAt?: string;
}

export interface BuildManifestOptions extends Catalogue {
  /** Name reported in the manifest. Default "Generative Icons". */
  name?: string;
  seed: number;
  size?: number;
  generatedAt?: string;
}

export interface GenerateResult {
  sprite: string;
  manifest: SpriteManifest;
  icons: RenderedIcon[];
}

export const HARMONIES: readonly Harmony[];
export const PLATES: readonly Plate[];
export const STYLES: readonly string[];
export const SIZE: number;
export const CX: number;
export const CY: number;
export const DEFAULT_COUNT: number;
export const DEFAULT_SEED: number;
export const MAX_SEED: number;
export const MIN_SIZE: number;
export const MAX_SIZE: number;
export const MOTIFS: Record<string, (ctx: unknown) => string>;

export interface Rng {
  random(): number;
  uniform(lo: number, hi: number): number;
  randint(lo: number, hi: number): number;
  choice<T>(seq: readonly T[]): T;
  chance(p: number): boolean;
  shuffle<T>(list: T[]): T[];
}

export declare function createRng(seed: number): Rng;
/** Roll a seed in `1..max`. Default range is the full 32-bit seed space. */
export declare function randomSeed(max?: number): number;
export declare function nfmt(value: number): string;
export declare function el(tag: string, attrs?: Record<string, unknown>, inner?: string): string;
export declare function renderIcon(
  index: number,
  masterSeed: number,
  size?: number,
  catalogue?: Catalogue,
): RenderedIcon;
export declare function buildSprite(icons: RenderedIcon[], size?: number): string;
export declare function buildManifest(
  icons: RenderedIcon[],
  options: BuildManifestOptions,
): SpriteManifest;
export declare function generateSprite(options?: GenerateOptions): GenerateResult;

/** Inject the sprite so `#icon-001` references resolve. Returns a cleanup fn. */
export declare function mountSprite(sprite: string, options?: { document?: Document }): () => void;
/** Object URL for the sprite — remember to revoke it when done. */
export declare function spriteBlobUrl(sprite: string): string;
/** Standalone markup for one icon referencing a mounted sprite. */
export declare function iconMarkup(id: string, options?: { size?: number; label?: string }): string;
