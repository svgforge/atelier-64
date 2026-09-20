/**
 * Small deterministic PRNG (mulberry32).
 *
 * It is deliberately NOT bit-compatible with Python's `random`: the artwork is
 * procedural, so an identical stream is not required — only that the same seed
 * yields the same icons on every machine and in every browser.
 */
export function createRng(seed) {
  let state = seed >>> 0;

  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    random,
    uniform: (lo, hi) => lo + (hi - lo) * random(),
    randint: (lo, hi) => lo + Math.floor(random() * (hi - lo + 1)),
    choice: (seq) => seq[Math.floor(random() * seq.length)],
    chance: (p) => random() < p,
    shuffle: (list) => {
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    },
  };
}
