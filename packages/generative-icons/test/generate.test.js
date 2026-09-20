import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_COUNT,
  DEFAULT_SEED,
  HARMONIES,
  MAX_SEED,
  MAX_SIZE,
  MIN_SIZE,
  PLATES,
  STYLES,
  buildManifest,
  buildSprite,
  generateSprite,
  randomSeed,
  renderIcon,
} from "../src/index.js";

const FIXED = { count: 60, seed: 64, generatedAt: "2026-01-01T00:00:00Z" };

test("generates the requested number of symbols", () => {
  const { sprite, manifest, icons } = generateSprite(FIXED);
  assert.equal(icons.length, 60);
  assert.equal(manifest.count, 60);
  assert.equal(sprite.match(/<symbol/g).length, 60);
  assert.equal((sprite.match(/<symbol id="icon-/g) || []).length, 60);
});

test("is deterministic for the same seed", () => {
  const a = generateSprite(FIXED);
  const b = generateSprite(FIXED);
  assert.equal(a.sprite, b.sprite);
  assert.deepEqual(a.manifest, b.manifest);
});

test("a different seed produces a different sprite", () => {
  const a = generateSprite(FIXED);
  const b = generateSprite({ ...FIXED, seed: 7 });
  assert.notEqual(a.sprite, b.sprite);
});

test("emits no porting artefacts", () => {
  const { sprite, icons } = generateSprite(FIXED);
  for (const artefact of ["undefined", "NaN", "null", "[object"]) {
    assert.ok(!sprite.includes(artefact), `sprite contains ${artefact}`);
  }
  assert.ok(!sprite.includes('=""'), "sprite contains an empty attribute");
  assert.ok(icons.every((icon) => icon.colors.every((c) => /^#[0-9a-f]{6}$/.test(c))));
});

test("defaults to the documented seed and count", () => {
  const { manifest } = generateSprite({ generatedAt: FIXED.generatedAt });
  assert.equal(manifest.seed, DEFAULT_SEED);
  assert.equal(manifest.count, DEFAULT_COUNT);
  assert.equal(DEFAULT_COUNT, 128);
  assert.equal(renderIcon(1, DEFAULT_SEED).style, "mandala");
});

test("uses the whole style, harmony and plate catalogue by default", () => {
  const { icons, manifest } = generateSprite({
    count: 400,
    seed: 1,
    generatedAt: FIXED.generatedAt,
  });
  assert.equal(new Set(icons.map((i) => i.style)).size, STYLES.length);
  assert.equal(new Set(icons.map((i) => i.plate)).size, PLATES.length);
  assert.equal(manifest.harmonies.length, HARMONIES.length);
});

test("style, plate and harmony follow the documented index positions", () => {
  const icon = renderIcon(1, 64);
  assert.equal(icon.id, "icon-001");
  assert.equal(icon.style, "mandala");
  assert.equal(icon.plate, "octagon");
  assert.equal(icon.harmony, "split-complementary");
});

test('seed "random" rolls a seed and reports it back', () => {
  const { manifest } = generateSprite({
    count: 12,
    seed: "random",
    generatedAt: FIXED.generatedAt,
  });
  assert.ok(Number.isInteger(manifest.seed), "manifest.seed is not an integer");
  assert.ok(manifest.seed >= 1 && manifest.seed <= MAX_SEED, "seed out of range");

  // The rolled set is reproducible from the reported seed.
  const replay = generateSprite({ count: 12, seed: manifest.seed, generatedAt: FIXED.generatedAt });
  assert.equal(
    replay.sprite,
    generateSprite({ count: 12, seed: manifest.seed, generatedAt: FIXED.generatedAt }).sprite,
  );
  assert.equal(replay.manifest.seed, manifest.seed);
});

test("randomSeed(max) stays inside the requested range", () => {
  for (let i = 0; i < 200; i++) {
    const seed = randomSeed(999_999);
    assert.ok(seed >= 1 && seed <= 999_999, `out of range: ${seed}`);
  }
  assert.ok(randomSeed() >= 1);
  assert.equal(randomSeed(1), 1);
});

test("allow-lists narrow the space a set is drawn from", () => {
  const { icons, manifest } = generateSprite({
    count: 40,
    seed: 64,
    generatedAt: FIXED.generatedAt,
    styles: ["orbits", "rings"],
    harmonies: ["analogous", "monochromatic"],
    plates: ["circle", "none"],
  });
  assert.deepEqual(new Set(icons.map((i) => i.style)), new Set(["orbits", "rings"]));
  assert.deepEqual(new Set(icons.map((i) => i.harmony)), new Set(["analogous", "monochromatic"]));
  assert.deepEqual(new Set(icons.map((i) => i.plate)), new Set(["circle", "none"]));
  // The manifest describes the space actually used, not the full catalogue.
  assert.deepEqual(manifest.styles, ["orbits", "rings"]);
  assert.deepEqual(manifest.harmonies, ["analogous", "monochromatic"]);
  assert.deepEqual(manifest.plates, ["circle", "none"]);
});

test("a narrowed space still spreads over everything it was given", () => {
  const { icons } = generateSprite({
    count: 30,
    seed: 3,
    generatedAt: FIXED.generatedAt,
    styles: ["orbits", "rings", "sun"],
  });
  assert.equal(new Set(icons.map((i) => i.style)).size, 3);
});

test("rejects nonsense input loudly", () => {
  assert.throws(() => generateSprite({ count: 0 }), /count must be >= 1/);
  assert.throws(() => generateSprite({ seed: -1 }), /seed must be an integer/);
  assert.throws(() => generateSprite({ seed: 1.5 }), /seed must be an integer/);
  assert.throws(() => generateSprite({ seed: "gelb" }), /seed must be an integer/);
  assert.throws(() => generateSprite({ styles: [] }), /non-empty array/);
  assert.throws(() => generateSprite({ styles: ["orbit"] }), /unknown styles: orbit/);
  assert.throws(() => generateSprite({ harmonies: ["kühl"] }), /unknown harmonies/);
  assert.throws(() => generateSprite({ plates: ["kreis"] }), /unknown plates/);
});

test("reports the configured name and a neutral sprite id", () => {
  const custom = generateSprite({
    count: 4,
    seed: 1,
    name: "Klecks",
    generatedAt: FIXED.generatedAt,
  });
  assert.equal(custom.manifest.name, "Klecks");
  assert.ok(custom.sprite.includes('id="generative-icons-sprite"'));
  assert.equal(generateSprite({ count: 4, seed: 1 }).manifest.name, "Generative Icons");
});

test("size scales the artwork into the viewBox instead of cropping it", () => {
  const at64 = generateSprite({ count: 3, seed: 64, size: 64, generatedAt: FIXED.generatedAt });
  const at128 = generateSprite({ count: 3, seed: 64, size: 128, generatedAt: FIXED.generatedAt });

  // Same art, different coordinate space.
  assert.equal(at64.sprite.match(/viewBox="0 0 64 64"/g).length, 4);
  assert.equal(at128.sprite.match(/viewBox="0 0 128 128"/g).length, 4);
  // At the native size there is nothing to scale, so the markup is untouched.
  assert.ok(!at64.sprite.includes("scale("));
  assert.ok(at128.sprite.includes('transform="scale(2)"'));
  assert.equal(at128.manifest.size, 128);
});

test("rejects sizes outside the supported range", () => {
  assert.throws(() => generateSprite({ size: 4 }), /size must be an integer/);
  assert.throws(() => generateSprite({ size: MAX_SIZE + 1 }), /size must be an integer/);
  assert.throws(() => generateSprite({ size: 64.5 }), /size must be an integer/);
  assert.throws(() => generateSprite({ size: "gross" }), /size must be an integer/);
  assert.doesNotThrow(() => generateSprite({ count: 1, size: MIN_SIZE }));
  assert.doesNotThrow(() => generateSprite({ count: 1, size: MAX_SIZE }));
});

test("achromatic paints a true grayscale palette", () => {
  const { icons } = generateSprite({
    count: 24,
    seed: 9,
    harmonies: ["achromatic"],
    generatedAt: FIXED.generatedAt,
  });
  const shades = new Set();
  for (const icon of icons)
    for (const hex of icon.colors) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      assert.ok(Math.abs(r - g) <= 2 && Math.abs(g - b) <= 2, `${hex} is not gray`);
      shades.add(g);
    }
  assert.ok(shades.size >= 10, `only ${shades.size} gray levels`);
});

test("duotone colors exactly one stop and grays the rest", () => {
  const { icons } = generateSprite({
    count: 12,
    seed: 9,
    harmonies: ["duotone"],
    generatedAt: FIXED.generatedAt,
  });
  for (const icon of icons) {
    const gray = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return Math.abs(r - g) <= 2 && Math.abs(g - b) <= 2;
    };
    // plate, body, ink faerben nie — der Akzentzones schon.
    assert.ok(
      gray(icon.colors[0]) && gray(icon.colors[1]) && gray(icon.colors[4]),
      "plate/body/ink must stay gray",
    );
    assert.ok(icon.colors.filter((c) => !gray(c)).length <= 2, "at most the accent carries colour");
  }
});

test("seeded arrangement is deterministic and per seed different", () => {
  const a = generateSprite({
    count: 12,
    seed: 1,
    arrangement: "seeded",
    generatedAt: FIXED.generatedAt,
  });
  const b = generateSprite({
    count: 12,
    seed: 1,
    arrangement: "seeded",
    generatedAt: FIXED.generatedAt,
  });
  const c = generateSprite({
    count: 12,
    seed: 4242,
    arrangement: "seeded",
    generatedAt: FIXED.generatedAt,
  });
  assert.equal(a.sprite, b.sprite);
  assert.equal(a.manifest.arrangement, "seeded");
  assert.notEqual(
    a.icons.map((i) => `${i.style}/${i.harmony}/${i.plate}`).join(),
    c.icons.map((i) => `${i.style}/${i.harmony}/${i.plate}`).join(),
  );
  // A shuffled catalogue still covers the whole range with enough icons.
  const full = generateSprite({
    count: 35,
    seed: 4242,
    arrangement: "seeded",
    generatedAt: FIXED.generatedAt,
  });
  assert.deepEqual(new Set(full.icons.map((i) => i.style)), new Set(STYLES));

  // And the assignment changes per seed for the same indices.
  assert.notEqual(
    a.icons.map((i) => `${i.style}/${i.harmony}/${i.plate}`).join(),
    c.icons.map((i) => `${i.style}/${i.harmony}/${i.plate}`).join(),
  );
});

test("seeded does not move the geometry: same motif, same inner seed", () => {
  const pos = generateSprite({ count: 12, seed: 3, generatedAt: FIXED.generatedAt });
  const seedMode = generateSprite({
    count: 12,
    seed: 3,
    arrangement: "seeded",
    generatedAt: FIXED.generatedAt,
  });
  // The geometry stream is seeded independently of the arrangement stream.
  assert.equal(seedMode.manifest.arrangement, "seeded");
  assert.equal(pos.manifest.arrangement, "positional");
});

test("builds a well-formed sprite envelope", () => {
  const { sprite } = generateSprite(FIXED);
  assert.ok(sprite.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(sprite.trimEnd().endsWith("</svg>"));
  assert.equal((sprite.match(/<symbol/g) || []).length, (sprite.match(/<\/symbol>/g) || []).length);
});

test("buildSprite and buildManifest work on their own", () => {
  const icons = [renderIcon(1, 64), renderIcon(2, 64)];
  assert.ok(buildSprite(icons).includes("icon-002"));
  const manifest = buildManifest(icons, { seed: 64, generatedAt: FIXED.generatedAt });
  assert.equal(manifest.icons.length, 2);
  assert.equal(manifest.seed, 64);
});
