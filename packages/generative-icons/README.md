# @svgforge/generative-icons

<img src="https://cdn.jsdelivr.net/npm/@svgforge/generative-icons/icon.svg" width="72" height="72" alt="Atelier 64 icon">

Generate icon art from a seed: **29 motifs × 8 colour harmonies × 8 plates**,
packed into one SVG `<symbol>` sprite.

**Pure ESM, zero dependencies, no build step.** The work is deterministic math —
a seeded PRNG and trigonometry, no model of any kind. The same call produces the
same sprite in the browser, in Node, in a web worker and on the server.

```js
import { generateSprite, mountSprite } from "@svgforge/generative-icons";

const { sprite, manifest, icons } = generateSprite({ count: 128, seed: 64 });
const unmount = mountSprite(sprite); // now <use href="#icon-001"> resolves
```

About 175 KB of markup for 128 icons, built in a few dozen milliseconds — fast
enough to run on every page load instead of shipping a pre-generated file.

## Pick a seed, or roll one

Two modes, and the rolled one is still reproducible:

```js
// Deterministic — same seed, same art, everywhere.
generateSprite({ seed: 64 });

// Roll a seed. The value actually used comes back in the manifest,
// so a set you like can be recreated later from that number.
const { manifest } = generateSprite({ seed: "random" });
manifest.seed; // 1834729
```

`randomSeed(max?)` rolls one yourself — handy for keeping seeds short enough to
put in a URL.

## Narrow the space

`styles`, `harmonies` and `plates` are allow-lists. They constrain the space a
set is drawn from, not the randomness inside it:

```js
generateSprite({
  seed: "random",
  count: 60,
  styles: ["orbits", "rings"],
  harmonies: ["analogous", "monochromatic"],
  plates: ["circle", "none"],
});
```

Picks stay spread by position, so a narrowed set still uses everything it was
given rather than clustering on one motif. Unknown or empty lists throw instead
of silently producing something surprising.

`manifest.styles`, `manifest.harmonies` and `manifest.plates` describe **the space
that set was actually drawn from** — a themed set says so, which is what a UI
needs to build its filters.

## API

### `generateSprite(options?)`

Returns `{ sprite, manifest, icons }`.

| Option        | Default      | Meaning                                                                     |
| ------------- | ------------ | --------------------------------------------------------------------------- |
| `count`       | `128`        | How many icons (`icon-001` … `icon-NNN`).                                   |
| `seed`        | `64`         | Master seed, or `"random"`. The value used is reported as `manifest.seed`.  |
| `size`        | `64`         | Coordinate space the art is drawn in, and the `viewBox`. 8–1024.            |
| `styles`      | all 29       | Allow-list of motifs.                                                       |
| `harmonies`   | all 8        | Allow-list of colour harmonies.                                             |
| `plates`      | all 8        | Allow-list of plate shapes.                                                 |
| `generatedAt` | `new Date()` | Manifest timestamp. Pass a fixed ISO string for fully deterministic output. |

### Lower level

| Export                                       | Purpose                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| `renderIcon(index, seed, size?, catalogue?)` | One icon, including its `<symbol>` markup.                             |
| `buildSprite(icons, size?)`                  | Wrap rendered icons into a sprite document.                            |
| `buildManifest(icons, options)`              | The JSON manifest.                                                     |
| `randomSeed(max?)`                           | Roll a seed in `1..max` (default: the full 32-bit space).              |
| `createRng(seed)`                            | The seeded PRNG (`uniform`, `randint`, `choice`, `chance`, `shuffle`). |
| `HARMONIES`, `PLATES`, `STYLES`, `MOTIFS`    | The full catalogues.                                                   |
| `DEFAULT_COUNT`, `DEFAULT_SEED`, `MAX_SEED`  | `64` and `0xffffffff`.                                                 |
| `MIN_SIZE`, `MAX_SIZE`                       | `8` and `1024`.                                                        |
| `nfmt`, `el`, `SIZE`, `CX`, `CY`             | Formatting and markup helpers.                                         |

### Browser helpers

These never touch the DOM at import time, so the module is safe to import
anywhere.

| Export                          | Purpose                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `mountSprite(sprite, options?)` | Inject the sprite so `#icon-NNN` references resolve. Returns a cleanup function. |
| `spriteBlobUrl(sprite)`         | Object URL for `<img src>`, CSS masks or downloads. Revoke it when done.         |
| `iconMarkup(id, options?)`      | Standalone `<svg><use>` markup for one icon.                                     |

## Using a generated sprite

```html
<svg width="64" height="64" viewBox="0 0 64 64" aria-label="icon-001">
  <use href="#icon-001"></use>
</svg>
```

`mountSprite()` injects a hidden, empty `<svg>` holding the `<symbol>`
definitions, which is what makes the fragment references resolve. The sprite
itself is `aria-hidden`, so the meaning has to come from the surrounding
`aria-label` or nearby text.

If you would rather not put anything in the DOM, generate the file and reference
it by URL instead:

```js
const { sprite } = generateSprite({ count: 128, seed: 64 });
await fetch("/icons.svg", { method: "PUT", body: sprite });
```

## How the art is composed

Style, harmony and plate are picked **by position** from the index, so they stay
put when you change the seed; only the geometry inside a motif is drawn from the
PRNG. Change the seed and you get different shapes in the same arrangement.

> **The order of `MOTIFS` is part of the art definition** — `STYLES` is derived
> from it and icons are assigned by position. Reordering it changes every icon.

### Coordinates

The motifs are drawn in a **64×64 coordinate space**. `size` does not change how
an icon looks — SVG is resolution independent — it changes the space all of it is
expressed in, and with it the `viewBox`. The artwork is scaled into that space,
so a `size` of 128 fills `0 0 128 128` the same way 64 fills `0 0 64 64`, and at
`size: 64` the scale is 1, leaving the emitted markup untouched.

The PRNG is `mulberry32`, deliberately **not** bit-compatible with Python's
`random`: the artwork is procedural, so an identical stream is not required —
only that a given seed yields the same icons on every machine and browser.

## Install and test

```sh
npm install @svgforge/generative-icons
node --test test/
```

No dependencies, no bundler, no transpiler: `src/` is the published artefact.

## License

MIT — see [LICENSE](./LICENSE).

This package is a hand-adapted JavaScript port of the `generate_icon_sprite.py`
script from the Atelier 64 project. It was produced with Grok (xAI) and edited
by hand; xAI's terms assign the output to the user. See the repository README
for details on AI-generated content.
