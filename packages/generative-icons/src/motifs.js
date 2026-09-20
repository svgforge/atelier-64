/**
 * The 29 motifs. Each one draws into the icon box and returns inner markup,
 * without the plate.
 *
 * NOTE: the order of MOTIFS is part of the art definition — the style of icon
 * N is picked positionally (`STYLES[(N - 1) % 29]`). Reordering changes every
 * icon.
 */

import {
  CX,
  CY,
  circle,
  ellipse,
  line,
  nfmt,
  path,
  polar,
  polygon,
  polyline,
  rect,
  regularPoly,
  roundJoin,
  starPts,
} from "./svg.js";

export function genMandala(ctx) {
  const n = ctx.choice([6, 8, 10, 12]);
  const rot = ctx.u(0, 360);
  const inner = [];
  const rPet = ctx.u(18, 24);
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n;
    const [px, py] = polar(CX, CY, rPet * 0.55, a);
    inner.push(
      ellipse(px, py, ctx.u(5, 8), ctx.u(10, 14), {
        fill: ctx.pal.body,
        opacity: "0.92",
        transform: `rotate(${nfmt(a + 90)} ${nfmt(px)} ${nfmt(py)})`,
      }),
    );
  }
  inner.push(circle(CX, CY, ctx.u(7, 10), { fill: ctx.pal.accent }));
  inner.push(
    circle(CX, CY, ctx.u(14, 18), {
      fill: "none",
      stroke: ctx.pal.highlight,
      stroke_width: "1.6",
      opacity: "0.85",
    }),
  );
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n + 180 / n;
    const [dx, dy] = polar(CX, CY, ctx.u(20, 24), a);
    inner.push(circle(dx, dy, ctx.u(1.6, 2.6), { fill: ctx.pal.highlight }));
  }
  inner.push(circle(CX, CY, 3.2, { fill: ctx.pal.highlight }));
  return inner.join("");
}

export function genCrystal(ctx) {
  const n = ctx.choice([5, 6, 7, 8]);
  const rot = ctx.u(-20, 20);
  const outer = regularPoly(CX, CY, n, ctx.u(20, 24), rot - 90);
  const bits = [polygon(outer, { fill: ctx.pal.body })];
  // Facets from a slightly offset origin for volume.
  const ox = CX + ctx.u(-3, 3);
  const oy = CY + ctx.u(-5, 1);
  for (let i = 0; i < outer.length; i++) {
    const [x, y] = outer[i];
    const [nx, ny] = outer[(i + 1) % n];
    const fill = i % 2 === 0 ? ctx.pal.accent : ctx.pal.muted;
    bits.push(
      polygon(
        [
          [ox, oy],
          [x, y],
          [nx, ny],
        ],
        { fill, opacity: "0.88" },
      ),
    );
  }
  bits.push(
    polygon(regularPoly(CX, CY - 2, n, ctx.u(7, 10), rot - 90), {
      fill: ctx.pal.highlight,
      opacity: "0.7",
    }),
  );
  bits.push(polygon(outer, roundJoin({ fill: "none", stroke: ctx.pal.ink, stroke_width: "1.4" })));
  return bits.join("");
}

export function genStarburst(ctx) {
  const n = ctx.choice([8, 10, 12, 16]);
  const rot = ctx.u(0, 360 / n);
  const rOut = ctx.u(22, 26);
  const rIn = ctx.u(7, 11);
  const bits = [
    polygon(starPts(CX, CY, n, rOut, rIn, rot - 90), {
      fill: ctx.linear(ctx.pal.accent, ctx.pal.body),
    }),
  ];
  bits.push(circle(CX, CY, ctx.u(6, 9), { fill: ctx.pal.plate }));
  bits.push(circle(CX, CY, ctx.u(3.5, 5), { fill: ctx.pal.highlight }));
  if (ctx.chance(0.5)) {
    bits.push(
      polygon(starPts(CX, CY, n, rOut * 0.62, rIn * 0.7, rot - 90 + 180 / n), {
        fill: "none",
        stroke: ctx.pal.highlight,
        stroke_width: "1.2",
        opacity: "0.7",
      }),
    );
  }
  return bits.join("");
}

export function genOrbits(ctx) {
  const bits = [];
  const rings = ctx.i(2, 4);
  for (let k = 0; k < rings; k++) {
    const r = 8 + k * ctx.u(5.5, 7.2);
    bits.push(
      circle(CX, CY, r, {
        fill: "none",
        stroke: k % 2 === 0 ? ctx.pal.body : ctx.pal.muted,
        stroke_width: nfmt(ctx.u(1.3, 2.2)),
        opacity: "0.9",
      }),
    );
    const a = ctx.u(0, 360);
    const [sx, sy] = polar(CX, CY, r, a);
    bits.push(circle(sx, sy, ctx.u(2.4, 4.2), { fill: ctx.pal.accent }));
    if (ctx.chance(0.45)) {
      const [hx, hy] = polar(CX, CY, r, a + 180);
      bits.push(circle(hx, hy, ctx.u(1.5, 2.4), { fill: ctx.pal.highlight }));
    }
  }
  bits.push(circle(CX, CY, ctx.u(4, 6.5), { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genCrest(ctx) {
  const top = 10;
  const d =
    `M16 ${top} H48 Q54 ${top} 54 16 V30 ` + `Q54 46 32 56 Q10 46 10 30 V16 Q10 ${top} 16 ${top}Z`;
  const bits = [path(d, { fill: ctx.linear(ctx.pal.body, ctx.pal.muted) })];
  bits.push(path(d, { fill: "none", stroke: ctx.pal.highlight, stroke_width: "1.6" }));
  const motif = ctx.choice(["star", "cross", "diamond", "circle"]);
  if (motif === "star") {
    bits.push(polygon(starPts(CX, 30, 5, 11, 4.6), { fill: ctx.pal.accent }));
  } else if (motif === "cross") {
    bits.push(rect(29, 18, 6, 24, { rx: 1.5, fill: ctx.pal.accent }));
    bits.push(rect(20, 27, 24, 6, { rx: 1.5, fill: ctx.pal.accent }));
  } else if (motif === "diamond") {
    bits.push(polygon(regularPoly(CX, 30, 4, 11, 0), { fill: ctx.pal.accent }));
  } else {
    bits.push(circle(CX, 30, 9, { fill: ctx.pal.accent }));
    bits.push(circle(CX, 30, 4, { fill: ctx.pal.highlight }));
  }
  return bits.join("");
}

export function genGlyph(ctx) {
  const bits = [circle(CX, CY, 22, { fill: "none", stroke: ctx.pal.body, stroke_width: "2.2" })];
  // Abstract strokes that read like a character.
  const sw = nfmt(ctx.u(2.4, 3.4));
  const stroke = roundJoin({ fill: "none", stroke: ctx.pal.accent, stroke_width: sw });
  const kind = ctx.choice(["lambda", "yen", "rune", "phi", "hash"]);
  if (kind === "lambda") {
    bits.push(
      polyline(
        [
          [22, 46],
          [32, 16],
          [44, 46],
        ],
        stroke,
      ),
    );
    bits.push(line(26, 34, 40, 28, stroke));
  } else if (kind === "yen") {
    bits.push(
      polyline(
        [
          [22, 18],
          [32, 32],
          [42, 18],
        ],
        stroke,
      ),
    );
    bits.push(line(32, 32, 32, 48, stroke));
    bits.push(line(24, 36, 40, 36, stroke));
    bits.push(line(24, 42, 40, 42, stroke));
  } else if (kind === "rune") {
    bits.push(line(32, 16, 32, 48, stroke));
    bits.push(
      polyline(
        [
          [32, 16],
          [44, 24],
          [32, 32],
        ],
        stroke,
      ),
    );
    bits.push(line(32, 32, 44, 44, stroke));
  } else if (kind === "phi") {
    bits.push(ellipse(CX, CY, 8, 16, stroke));
    bits.push(line(32, 14, 32, 50, stroke));
  } else {
    bits.push(line(22, 22, 42, 22, stroke));
    bits.push(line(22, 32, 42, 32, stroke));
    bits.push(line(22, 42, 42, 42, stroke));
    bits.push(line(26, 18, 26, 46, stroke));
    bits.push(line(38, 18, 38, 46, stroke));
  }
  bits.push(circle(CX, CY, 3, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genLattice(ctx) {
  const bits = [];
  const n = ctx.choice([3, 4]);
  const margin = 14;
  const span = 64 - 2 * margin;
  const step = span / (n - 1);
  const r = ctx.u(2.2, 3.4);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x = margin + col * step;
      const y = margin + row * step;
      bits.push(
        circle(x, y, r, {
          fill: (row + col) % 2 === 0 ? ctx.pal.accent : ctx.pal.body,
        }),
      );
      if (col + 1 < n) {
        bits.push(line(x, y, x + step, y, { stroke: ctx.pal.muted, stroke_width: "1.4" }));
      }
      if (row + 1 < n) {
        bits.push(line(x, y, x, y + step, { stroke: ctx.pal.muted, stroke_width: "1.4" }));
      }
    }
  }
  if (ctx.chance(0.6)) {
    bits.push(polygon(regularPoly(CX, CY, 4, 10, 0), { fill: ctx.pal.highlight, opacity: "0.9" }));
  }
  return bits.join("");
}

export function genBloom(ctx) {
  const n = ctx.choice([5, 6, 7, 8]);
  const rot = ctx.u(0, 360);
  const bits = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n;
    const [px, py] = polar(CX, CY, 12, a);
    bits.push(
      ellipse(px, py, 8, 13, {
        fill: i % 2 === 0 ? ctx.pal.body : ctx.pal.accent,
        opacity: "0.92",
        transform: `rotate(${nfmt(a + 90)} ${nfmt(px)} ${nfmt(py)})`,
      }),
    );
  }
  bits.push(circle(CX, CY, 8, { fill: ctx.pal.highlight }));
  bits.push(circle(CX, CY, 3.4, { fill: ctx.pal.ink }));
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n + 180 / n;
    const [dx, dy] = polar(CX, CY, 22, a);
    bits.push(circle(dx, dy, 1.8, { fill: ctx.pal.highlight, opacity: "0.8" }));
  }
  return bits.join("");
}

export function genRings(ctx) {
  const bits = [];
  const offsets = [
    [-7, -4],
    [8, -3],
    [0, 8],
  ];
  const colors = [ctx.pal.body, ctx.pal.accent, ctx.pal.highlight];
  ctx.rng.shuffle(offsets);
  const r = ctx.u(11, 14);
  const sw = nfmt(ctx.u(3.2, 4.4));
  offsets.forEach(([dx, dy], idx) => {
    bits.push(
      circle(CX + dx, CY + dy, r, {
        fill: "none",
        stroke: colors[idx],
        stroke_width: sw,
      }),
    );
  });
  return bits.join("");
}

export function genShards(ctx) {
  const bits = [];
  const n = ctx.i(5, 8);
  const rot0 = ctx.u(0, 360);
  for (let i = 0; i < n; i++) {
    const a = rot0 + i * (360 / n) + ctx.u(-8, 8);
    const r0 = ctx.u(4, 8);
    const r1 = ctx.u(20, 26);
    const spread = ctx.u(10, 22);
    const p0 = polar(CX, CY, r0, a);
    const p1 = polar(CX, CY, r1, a - spread / 2);
    const p2 = polar(CX, CY, r1 * ctx.u(0.72, 1.0), a + spread / 2);
    const fill = i % 2 === 0 ? ctx.pal.accent : ctx.pal.body;
    bits.push(polygon([p0, p1, p2], { fill, opacity: "0.92" }));
  }
  bits.push(circle(CX, CY, ctx.u(4, 6), { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genRipple(ctx) {
  const bits = [];
  const start = ctx.u(-40, 40);
  for (let k = 0; k < 4; k++) {
    const r = 8 + k * 6.2;
    bits.push(
      path(
        `M${nfmt(CX - r)} ${nfmt(CY)} A${nfmt(r)} ${nfmt(r)} 0 0 1 ${nfmt(CX + r)} ${nfmt(CY)}`,
        {
          fill: "none",
          stroke: k % 2 === 0 ? ctx.pal.body : ctx.pal.accent,
          stroke_width: nfmt(2.2 - k * 0.2),
          transform: `rotate(${nfmt(start)} ${CX} ${CY})`,
          opacity: nfmt(1 - k * 0.12),
        },
      ),
    );
  }
  bits.push(circle(CX, CY, 4.5, { fill: ctx.pal.highlight }));
  bits.push(circle(CX + 10, CY - 8, 2, { fill: ctx.pal.accent }));
  return bits.join("");
}

export function genConstellation(ctx) {
  const n = ctx.i(6, 9);
  const nodes = [];
  for (let k = 0; k < n; k++) {
    const ang = ctx.u(0, 360);
    const rad = ctx.u(8, 22);
    nodes.push(polar(CX, CY, rad, ang));
  }
  // Light repulsion so they don't collapse.
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      const [x, y] = nodes[i];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const [x2, y2] = nodes[j];
        const dx = x - x2;
        const dy = y - y2;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d < 10) {
          const push = (10 - d) * 0.15;
          nodes[i] = [x + (dx / d) * push, y + (dy / d) * push];
        }
      }
    }
  }
  const bits = [];
  // Connect nearest neighbours.
  for (let i = 0; i < nodes.length; i++) {
    const [x, y] = nodes[i];
    const dists = nodes
      .map(([x2, y2], j) => [Math.hypot(x - x2, y - y2), j])
      .filter(([, j]) => j !== i)
      .sort((a, b) => a[0] - b[0]);
    for (const [, j] of dists.slice(0, 2)) {
      const [x2, y2] = nodes[j];
      bits.push(line(x, y, x2, y2, { stroke: ctx.pal.muted, stroke_width: "1.3" }));
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    const [x, y] = nodes[i];
    const r = i === 0 ? 4 : ctx.u(1.8, 3.4);
    const fill = i === 0 ? ctx.pal.highlight : i % 2 ? ctx.pal.accent : ctx.pal.body;
    bits.push(circle(x, y, r, { fill }));
  }
  return bits.join("");
}

export function genHoneycomb(ctx) {
  const bits = [];
  const r = 8.2;
  const dx = r * Math.sqrt(3);
  const coords = [
    [CX, CY],
    [CX + dx, CY],
    [CX - dx, CY],
    [CX + dx / 2, CY + r * 1.5],
    [CX - dx / 2, CY + r * 1.5],
    [CX + dx / 2, CY - r * 1.5],
    [CX - dx / 2, CY - r * 1.5],
  ];
  coords.forEach(([x, y], i) => {
    const fill = i === 0 ? ctx.pal.accent : i % 2 ? ctx.pal.body : ctx.pal.muted;
    bits.push(
      polygon(regularPoly(x, y, 6, r - 0.6, 30), {
        fill,
        stroke: ctx.pal.ink,
        stroke_width: "0.8",
      }),
    );
  });
  bits.push(circle(CX, CY, 2.4, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genSpiral(ctx) {
  const turns = ctx.u(2.2, 3.4);
  const steps = 48;
  const maxR = ctx.u(20, 24);
  const rot = ctx.u(0, 360);
  const d = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = 2 + t * maxR;
    const a = rot + t * turns * 360;
    const [x, y] = polar(CX, CY, r, a);
    d.push((i === 0 ? "M" : "L") + `${nfmt(x)} ${nfmt(y)}`);
  }
  const bits = [
    path(d.join(" "), roundJoin({ fill: "none", stroke: ctx.pal.body, stroke_width: "2.6" })),
  ];
  const [ex, ey] = polar(CX, CY, maxR, rot + turns * 360);
  bits.push(circle(ex, ey, 3.2, { fill: ctx.pal.accent }));
  bits.push(circle(CX, CY, 3.6, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genPanes(ctx) {
  const bits = [rect(12, 12, 40, 40, { rx: 4, fill: ctx.pal.muted })];
  // Window mullions.
  bits.push(rect(30.5, 14, 3, 36, { fill: ctx.pal.ink }));
  bits.push(rect(14, 30.5, 36, 3, { fill: ctx.pal.ink }));
  const colors = [ctx.pal.body, ctx.pal.accent, ctx.pal.highlight, ctx.pal.body];
  const quads = [
    [14, 14],
    [34, 14],
    [14, 34],
    [34, 34],
  ];
  quads.forEach(([x, y], i) => {
    bits.push(rect(x, y, 16, 16, { rx: 1.5, fill: colors[i], opacity: "0.92" }));
  });
  bits.push(
    rect(12, 12, 40, 40, { rx: 4, fill: "none", stroke: ctx.pal.highlight, stroke_width: "1.6" }),
  );
  return bits.join("");
}

export function genCompass(ctx) {
  const rot = ctx.choice([0, 45]);
  const bits = [circle(CX, CY, 24, { fill: "none", stroke: ctx.pal.muted, stroke_width: "1.6" })];
  for (let i = 0; i < 4; i++) {
    const a = rot + i * 90;
    const tip = polar(CX, CY, 22, a - 90);
    const l = polar(CX, CY, 6, a - 90 - 18);
    const rgt = polar(CX, CY, 6, a - 90 + 18);
    const fill = i % 2 === 0 ? ctx.pal.accent : ctx.pal.body;
    bits.push(polygon([tip, l, [CX, CY], rgt], { fill }));
  }
  bits.push(circle(CX, CY, 5, { fill: ctx.pal.highlight }));
  bits.push(circle(CX, CY, 2.2, { fill: ctx.pal.ink }));
  for (let i = 0; i < 8; i++) {
    const a = rot + i * 45 - 90;
    const p1 = polar(CX, CY, 24, a);
    const p2 = polar(CX, CY, i % 2 === 0 ? 27 : 25.5, a);
    bits.push(line(p1[0], p1[1], p2[0], p2[1], { stroke: ctx.pal.highlight, stroke_width: "1.4" }));
  }
  return bits.join("");
}

export function genMosaic(ctx) {
  const bits = [];
  const cols = 4;
  const rows = 4;
  const gap = 1.6;
  const origin = 12;
  const cell = (40 - gap * (cols - 1)) / cols;
  const palette = [ctx.pal.body, ctx.pal.accent, ctx.pal.muted, ctx.pal.highlight];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = origin + c * (cell + gap);
      const y = origin + r * (cell + gap);
      const fill = palette[(r * 3 + c + ctx.i(0, 3)) % palette.length];
      const shape = ctx.choice(["rect", "circle", "diamond"]);
      if (shape === "circle") {
        bits.push(circle(x + cell / 2, y + cell / 2, cell / 2 - 0.4, { fill }));
      } else if (shape === "diamond") {
        bits.push(polygon(regularPoly(x + cell / 2, y + cell / 2, 4, cell / 2, 0), { fill }));
      } else {
        bits.push(rect(x, y, cell, cell, { rx: 1.4, fill }));
      }
    }
  }
  return bits.join("");
}

export function genVortex(ctx) {
  const n = ctx.choice([8, 10, 12]);
  const rot = ctx.u(0, 360);
  const bits = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n;
    const inner = polar(CX, CY, 6, a);
    const outerA = polar(CX, CY, 22, a - 8);
    const outerB = polar(CX, CY, 24, a + 14);
    const fill = i % 2 === 0 ? ctx.pal.body : ctx.pal.accent;
    bits.push(polygon([inner, outerA, outerB], { fill, opacity: "0.93" }));
  }
  bits.push(circle(CX, CY, 6.5, { fill: ctx.pal.plate }));
  bits.push(circle(CX, CY, 3.2, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genSigil(ctx) {
  const bits = [
    circle(CX, CY, 24, { fill: "none", stroke: ctx.pal.body, stroke_width: "2" }),
    circle(CX, CY, 18, { fill: "none", stroke: ctx.pal.muted, stroke_width: "1.2" }),
  ];
  const n = ctx.choice([3, 4, 5, 6]);
  const rot = ctx.u(0, 40);
  bits.push(
    polygon(
      regularPoly(CX, CY, n, 16, rot - 90),
      roundJoin({ fill: "none", stroke: ctx.pal.accent, stroke_width: "1.8" }),
    ),
  );
  if (n >= 4) {
    bits.push(
      polygon(regularPoly(CX, CY, n, 16, rot - 90 + 180 / n), {
        fill: "none",
        stroke: ctx.pal.highlight,
        stroke_width: "1.2",
        opacity: "0.8",
      }),
    );
  }
  bits.push(circle(CX, CY, 3.4, { fill: ctx.pal.highlight }));
  for (let i = 0; i < n; i++) {
    const a = rot - 90 + (i * 360) / n;
    const [x, y] = polar(CX, CY, 24, a);
    bits.push(circle(x, y, 2.1, { fill: ctx.pal.accent }));
  }
  return bits.join("");
}

export function genBubbles(ctx) {
  const bits = [];
  const n = ctx.i(6, 10);
  const placed = [];
  for (let k = 0; k < n; k++) {
    const r = k < 3 ? ctx.u(5, 14) : ctx.u(3.2, 7);
    for (let attempt = 0; attempt < 20; attempt++) {
      const ang = ctx.u(0, 360);
      const rad = ctx.u(0, 18);
      const [x, y] = polar(CX, CY, rad, ang);
      const clear = placed.every(([px, py, pr]) => Math.hypot(x - px, y - py) > (r + pr) * 0.55);
      if (clear) {
        placed.push([x, y, r]);
        break;
      }
    }
  }
  const colors = [ctx.pal.body, ctx.pal.accent, ctx.pal.muted, ctx.pal.highlight];
  placed.forEach(([x, y, r], i) => {
    bits.push(circle(x, y, r, { fill: colors[i % colors.length], opacity: "0.9" }));
    bits.push(
      circle(x - r * 0.28, y - r * 0.28, r * 0.22, {
        fill: ctx.pal.highlight,
        opacity: "0.55",
      }),
    );
  });
  return bits.join("");
}

export function genChevrons(ctx) {
  const bits = [];
  const n = ctx.i(3, 5);
  const gap = 8;
  const startY = 16;
  const sw = nfmt(ctx.u(2.6, 3.6));
  for (let i = 0; i < n; i++) {
    const y = startY + i * gap;
    const c = i % 2 ? ctx.pal.accent : ctx.pal.body;
    bits.push(
      polyline(
        [
          [18, y + 6],
          [32, y - 2],
          [46, y + 6],
        ],
        roundJoin({
          fill: "none",
          stroke: c,
          stroke_width: sw,
        }),
      ),
    );
  }
  bits.push(circle(CX, 50, 2.4, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genWeave(ctx) {
  const bits = [];
  const sw = "3.2";
  const colors = [ctx.pal.body, ctx.pal.accent];
  for (let i = 0; i < 4; i++) {
    const y = 18 + i * 9;
    bits.push(
      path(
        `M12 ${y} C 22 ${y - 8}, 42 ${y + 8}, 52 ${y}`,
        roundJoin({
          fill: "none",
          stroke: colors[i % 2],
          stroke_width: sw,
        }),
      ),
    );
  }
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * 12;
    bits.push(
      path(
        `M${x} 12 C ${x + 8} 24, ${x - 8} 40, ${x} 52`,
        roundJoin({
          fill: "none",
          stroke: i === 1 ? ctx.pal.highlight : ctx.pal.muted,
          stroke_width: "2.2",
          opacity: "0.85",
        }),
      ),
    );
  }
  return bits.join("");
}

export function genFrame(ctx) {
  const bits = [
    rect(10, 10, 44, 44, { rx: 8, fill: "none", stroke: ctx.pal.body, stroke_width: "2.4" }),
    rect(16, 16, 32, 32, { rx: 4, fill: "none", stroke: ctx.pal.muted, stroke_width: "1.4" }),
  ];
  // Corner ornaments.
  for (const [x, y, sx, sy] of [
    [10, 10, 1, 1],
    [54, 10, -1, 1],
    [10, 54, 1, -1],
    [54, 54, -1, -1],
  ]) {
    bits.push(
      path(
        `M${x + 8 * sx} ${y} L${x} ${y} L${x} ${y + 8 * sy}`,
        roundJoin({
          fill: "none",
          stroke: ctx.pal.accent,
          stroke_width: "2.2",
        }),
      ),
    );
  }
  const inner = ctx.choice(["dot", "star", "plus"]);
  if (inner === "star") {
    bits.push(polygon(starPts(CX, CY, 4, 9, 3.5, -90), { fill: ctx.pal.highlight }));
  } else if (inner === "plus") {
    bits.push(rect(30, 22, 4, 20, { rx: 1.2, fill: ctx.pal.highlight }));
    bits.push(rect(22, 30, 20, 4, { rx: 1.2, fill: ctx.pal.highlight }));
  } else {
    bits.push(circle(CX, CY, 6, { fill: ctx.pal.accent }));
    bits.push(circle(CX, CY, 2.5, { fill: ctx.pal.highlight }));
  }
  return bits.join("");
}

export function genSeeds(ctx) {
  const n = ctx.choice([5, 6, 7]);
  const rot = ctx.u(0, 360);
  const bits = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n;
    const [px, py] = polar(CX, CY, 14, a);
    const transform = `rotate(${nfmt(a + 90)} ${nfmt(px)} ${nfmt(py)})`;
    bits.push(
      ellipse(px, py, 6, 11, {
        fill: i % 2 === 0 ? ctx.pal.body : ctx.pal.accent,
        transform,
      }),
    );
    bits.push(ellipse(px, py, 2, 5, { fill: ctx.pal.highlight, opacity: "0.55", transform }));
  }
  bits.push(circle(CX, CY, 6, { fill: ctx.pal.muted }));
  bits.push(circle(CX, CY, 2.8, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genEclipse(ctx) {
  const bits = [circle(CX, CY, 20, { fill: ctx.linear(ctx.pal.body, ctx.pal.muted) })];
  const ox = ctx.u(6, 12) * ctx.choice([-1, 1]);
  const oy = ctx.u(-4, 4);
  bits.push(circle(CX + ox, CY + oy, 16, { fill: ctx.pal.plate }));
  // Rim light.
  bits.push(
    circle(CX, CY, 20, {
      fill: "none",
      stroke: ctx.pal.highlight,
      stroke_width: "1.6",
      opacity: "0.7",
    }),
  );
  bits.push(circle(CX - ox * 0.4, CY - 8, 2.2, { fill: ctx.pal.accent, opacity: "0.8" }));
  return bits.join("");
}

export function genKite(ctx) {
  const top = [CX, 8];
  const right = [54, 30];
  const bottom = [CX, 56];
  const left = [10, 30];
  const mid = [CX, 30];
  const bits = [
    polygon([top, right, mid], { fill: ctx.pal.body }),
    polygon([top, left, mid], { fill: ctx.pal.accent }),
    polygon([bottom, right, mid], { fill: ctx.pal.muted }),
    polygon([bottom, left, mid], { fill: ctx.pal.body }),
    line(top[0], top[1], bottom[0], bottom[1], {
      stroke: ctx.pal.highlight,
      stroke_width: "1.3",
    }),
    line(left[0], left[1], right[0], right[1], {
      stroke: ctx.pal.highlight,
      stroke_width: "1.3",
    }),
  ];
  bits.push(circle(CX, CY, 3.2, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genAsterisk(ctx) {
  const n = ctx.choice([6, 8]);
  const rot = ctx.u(0, 30);
  const bits = [];
  const w = ctx.u(3.2, 4.6);
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 180) / n;
    bits.push(
      rect(CX - w / 2, 12, w, 40, {
        rx: w / 2,
        fill: i % 2 === 0 ? ctx.pal.body : ctx.pal.accent,
        transform: `rotate(${nfmt(a)} ${CX} ${CY})`,
      }),
    );
  }
  bits.push(circle(CX, CY, 6, { fill: ctx.pal.plate }));
  bits.push(circle(CX, CY, 3, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genLabyrinth(ctx) {
  const bits = [rect(12, 12, 40, 40, { rx: 3, fill: ctx.pal.muted })];
  const sw = "2.4";
  const stroke = roundJoin({ fill: "none", stroke: ctx.pal.body, stroke_width: sw });
  bits.push(path("M20 20 H44 V44 H20 Z", stroke));
  bits.push(path("M26 26 H38 V38 H26 Z", { ...stroke, stroke: ctx.pal.accent }));
  bits.push(line(32, 20, 32, 26, stroke));
  bits.push(line(38, 32, 44, 32, roundJoin({ stroke: ctx.pal.highlight, stroke_width: sw })));
  bits.push(circle(CX, CY, 3, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genSun(ctx) {
  const n = ctx.choice([8, 12]);
  const rot = ctx.u(0, 20);
  const bits = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 360) / n - 90;
    const p1 = polar(CX, CY, 14, a - 6);
    const p2 = polar(CX, CY, 14, a + 6);
    const tip = polar(CX, CY, i % 2 === 0 ? 24 : 21, a);
    bits.push(polygon([p1, tip, p2], { fill: i % 2 === 0 ? ctx.pal.accent : ctx.pal.body }));
  }
  bits.push(circle(CX, CY, 12, { fill: ctx.linear(ctx.pal.highlight, ctx.pal.body) }));
  bits.push(circle(CX - 3, CY - 3, 2.4, { fill: "#ffffff", opacity: "0.35" }));
  return bits.join("");
}

export function genAurora(ctx) {
  // Geschichtete, transparente Boegen, gegeneinander versetzt.
  const bits = [];
  const n = ctx.choice([3, 4]);
  const colors = [ctx.pal.body, ctx.pal.accent, ctx.pal.highlight, ctx.pal.muted];
  const tilt = ctx.u(-14, 14);
  for (let i = 0; i < n; i++) {
    const r = ctx.u(20, 30);
    const lift = 18 + i * 11 + ctx.u(-2, 3);
    bits.push(
      path(
        `M${nfmt(CX - r)} ${nfmt(lift)} A${nfmt(r)} ${nfmt(r)} 0 0 1 ${nfmt(CX + r)} ${nfmt(lift)}`,
        roundJoin({
          fill: "none",
          stroke: colors[i % colors.length],
          stroke_width: nfmt(ctx.u(3, 5)),
          opacity: nfmt(1 - i * 0.14),
          transform: `rotate(${nfmt(tilt)} ${CX} ${CY})`,
        }),
      ),
    );
  }
  bits.push(circle(CX, CY, ctx.u(4, 6), { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genDunes(ctx) {
  const bits = [];
  const bands = ctx.i(3, 4);
  const colors = [ctx.pal.body, ctx.pal.accent, ctx.pal.muted, ctx.pal.highlight];
  for (let i = 0; i < bands; i++) {
    const y = 18 + i * 11 + ctx.u(-3, 3);
    bits.push(
      path(
        `M6 ${nfmt(y)} C 20 ${nfmt(y - ctx.u(5, 10))}, 42 ${nfmt(y + ctx.u(3, 8))}, 58 ${nfmt(y)}`,
        roundJoin({
          fill: "none",
          stroke: colors[i % colors.length],
          stroke_width: nfmt(ctx.u(3, 4.6)),
        }),
      ),
    );
  }
  bits.push(
    circle(CX + ctx.u(-9, 9), 13, ctx.u(3.2, 5), { fill: ctx.pal.highlight, opacity: "0.9" }),
  );
  return bits.join("");
}

export function genTrellis(ctx) {
  // Gesamt sechs Diagonalen, das Clip kauteszt sie auf die Platte.
  const bits = [rect(12, 12, 40, 40, { rx: 3, fill: ctx.pal.muted, opacity: "0.90" })];
  const step = ctx.choice([10, 13, 16]);
  for (let o = -64; o <= 64; o += step) {
    bits.push(
      line(o, 64, o + 64, 0, roundJoin({ fill: "none", stroke: ctx.pal.body, stroke_width: "2" })),
    );
    bits.push(
      line(
        o,
        0,
        o + 64,
        64,
        roundJoin({ fill: "none", stroke: ctx.pal.accent, stroke_width: "1.4", opacity: "0.8" }),
      ),
    );
  }
  bits.push(polygon(starPts(CX, CY, 4, 8, 3.2, -90), { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genPrism(ctx) {
  const bits = [];
  const n = ctx.i(3, 5);
  for (let i = 0; i < n; i++) {
    const r = 20 - i * (13 / n);
    const cy = 44 - i * (28 / n);
    bits.push(
      polygon(regularPoly(CX, cy, 3, r, -90), {
        fill: [ctx.pal.body, ctx.pal.accent, ctx.pal.muted][i % 3],
        stroke: ctx.pal.ink,
        stroke_width: "0.8",
      }),
    );
  }
  bits.push(circle(CX, CY, 2.6, { fill: ctx.pal.highlight }));
  return bits.join("");
}

export function genLotus(ctx) {
  const bits = [];
  const n = ctx.choice([5, 7]);
  for (let i = 0; i < n; i++) {
    const a = -90 + (i - (n - 1) / 2) * 24 + ctx.u(-3, 3);
    const [px, py] = polar(CX, CY, ctx.u(10, 14), a);
    bits.push(
      ellipse(px, py, 3.4, 10, {
        fill: i % 2 === 0 ? ctx.pal.body : ctx.pal.accent,
        opacity: "0.94",
        transform: `rotate(${nfmt(a + 90)} ${nfmt(px)} ${nfmt(py)})`,
      }),
    );
  }
  bits.push(circle(CX, CY, 5, { fill: ctx.pal.highlight }));
  bits.push(circle(CX, CY, 2, { fill: ctx.pal.ink }));
  return bits.join("");
}

export function genCube(ctx) {
  const r = ctx.u(15, 19);
  const v = regularPoly(CX, CY, 6, r, -90);
  const c = [CX, CY];
  const faces = [
    { pts: [v[0], v[1], c, v[5]], fill: ctx.pal.highlight },
    { pts: [v[1], v[2], v[3], c], fill: ctx.pal.accent },
    { pts: [v[3], v[4], v[5], c], fill: ctx.pal.muted },
  ];
  const bits = faces.map((f) =>
    polygon(f.pts, {
      fill: f.fill,
      stroke: ctx.pal.ink,
      stroke_width: "0.8",
      stroke_linejoin: "round",
    }),
  );
  bits.push(circle(CX, CY, 2, { fill: ctx.pal.highlight, opacity: "0.6" }));
  return bits.join("");
}

/**
 * Style registry. Order matters — see the note at the top of this file.
 */
export const MOTIFS = {
  mandala: genMandala,
  crystal: genCrystal,
  starburst: genStarburst,
  orbits: genOrbits,
  crest: genCrest,
  glyph: genGlyph,
  lattice: genLattice,
  bloom: genBloom,
  rings: genRings,
  shards: genShards,
  ripple: genRipple,
  constellation: genConstellation,
  honeycomb: genHoneycomb,
  spiral: genSpiral,
  panes: genPanes,
  compass: genCompass,
  mosaic: genMosaic,
  vortex: genVortex,
  sigil: genSigil,
  bubbles: genBubbles,
  chevrons: genChevrons,
  weave: genWeave,
  frame: genFrame,
  seeds: genSeeds,
  eclipse: genEclipse,
  kite: genKite,
  asterisk: genAsterisk,
  labyrinth: genLabyrinth,
  sun: genSun,
  aurora: genAurora,
  dunes: genDunes,
  trellis: genTrellis,
  prism: genPrism,
  lotus: genLotus,
  cube: genCube,
};
