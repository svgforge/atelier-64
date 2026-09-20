export type { RenderedIcon } from "@svgforge/generative-icons";

export const HARMONY_LABELS: Record<string, string> = {
  complementary: "Complementary",
  analogous: "Analogous",
  triadic: "Triadic",
  "split-complementary": "Split complementary",
  tetradic: "Tetradic",
  square: "Square",
  monochromatic: "Monochrome",
  compound: "Compound",
};

export function harmonyLabel(value: string) {
  return HARMONY_LABELS[value] ?? value;
}

export function styleLabel(value: string) {
  return value.replace(/-/g, " ");
}

export function padIndex(index: number) {
  return String(index).padStart(3, "0");
}

/** Fragment reference into the sprite that is mounted in this document. */
export function fragmentHref(id: string) {
  return `#${id}`;
}

/** Markup for one icon. `size` is the generated coordinate space, not a display size. */
export function useSnippet(id: string, size: number, display = 64) {
  return `<svg width="${display}" height="${display}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${id}">
  <use href="#${id}" />
</svg>`;
}
