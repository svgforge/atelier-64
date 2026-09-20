#!/usr/bin/env python3
"""Atelier 64 — generate a 64×64 SVG icon sprite.

Renders N icons of procedural SVG art, each colored with a classical
harmony palette (complementary, analogous, triadic, split-complementary,
tetradic, square, monochromatic, compound). Packs every mark into a
single SVG sprite as <symbol id="icon-001"> so consumers can reference
fragments:

    <svg viewBox="0 0 64 64" width="64" height="64">
      <use href="icons.svg#icon-001" />
    </svg>

No third-party packages. Python 3.9+.

Examples:
    python3 scripts/generate_icon_sprite.py
    python3 scripts/generate_icon_sprite.py --count 200 --seed 64
"""

from __future__ import annotations

import argparse
import json
import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Iterable, Sequence

SIZE = 64
CX = 32.0
CY = 32.0
GOLDEN_ANGLE = 137.507764

HARMONIES = (
    "complementary",
    "analogous",
    "triadic",
    "split-complementary",
    "tetradic",
    "square",
    "monochromatic",
    "compound",
)

PLATES = (
    "roundrect",
    "circle",
    "squircle",
    "hex",
    "diamond",
    "octagon",
    "soft-square",
    "none",
)


# ---------------------------------------------------------------------------
# Color
# ---------------------------------------------------------------------------

def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return lo if v < lo else hi if v > hi else v


def wrap_hue(h: float) -> float:
    return h % 360.0


def hsl_to_hex(h: float, s: float, l: float) -> str:
    """H in degrees, S/L in 0..1. Returns #rrggbb."""
    h = wrap_hue(h) / 360.0
    s = clamp(s)
    l = clamp(l)

    def hue_to_rgb(p: float, q: float, t: float) -> float:
        if t < 0:
            t += 1
        if t > 1:
            t -= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    if s == 0:
        r = g = b = l
    else:
        q = l * (1 + s) if l < 0.5 else l + s - l * s
        p = 2 * l - q
        r = hue_to_rgb(p, q, h + 1 / 3)
        g = hue_to_rgb(p, q, h)
        b = hue_to_rgb(p, q, h - 1 / 3)
    return f"#{int(round(r * 255)):02x}{int(round(g * 255)):02x}{int(round(b * 255)):02x}"


def hues_for(scheme: str, h: float) -> list[float]:
    if scheme == "complementary":
        return [h, h + 180]
    if scheme == "analogous":
        return [h - 32, h, h + 32]
    if scheme == "triadic":
        return [h, h + 120, h + 240]
    if scheme == "split-complementary":
        return [h, h + 150, h + 210]
    if scheme == "tetradic":
        return [h, h + 60, h + 180, h + 240]
    if scheme == "square":
        return [h, h + 90, h + 180, h + 270]
    if scheme == "monochromatic":
        return [h]
    if scheme == "compound":
        return [h - 30, h, h + 150, h + 180]
    raise ValueError(f"unknown harmony: {scheme}")


@dataclass
class Palette:
    plate: str
    body: str
    accent: str
    highlight: str
    ink: str
    muted: str
    all: list[str] = field(default_factory=list)


def make_palette(rng: random.Random, hue: float, scheme: str) -> Palette:
    """Build a 6-stop palette from a harmony scheme.

    Lightness is biased so marks read on a 64×64 tile: a dark plate,
    a mid body, a contrasting accent, a light highlight, and a near-black
    ink for strokes.
    """
    hues = [wrap_hue(x) for x in hues_for(scheme, hue)]
    sat_base = rng.uniform(0.48, 0.74)
    if scheme == "monochromatic":
        sat_base = rng.uniform(0.38, 0.62)

    def pick_h(i: int) -> float:
        return hues[i % len(hues)] + rng.uniform(-3.5, 3.5)

    def col(i: int, s_mul: float, l: float, s_floor: float = 0.12) -> str:
        s = clamp(sat_base * s_mul + rng.uniform(-0.04, 0.04), s_floor, 0.86)
        return hsl_to_hex(pick_h(i), s, clamp(l + rng.uniform(-0.03, 0.03)))

    # Dark plate, slightly desaturated so the motif sits on top.
    plate = col(0, 0.55, rng.uniform(0.10, 0.18), s_floor=0.18)
    body = col(0, 1.0, rng.uniform(0.42, 0.56))
    accent = col(1, 1.05, rng.uniform(0.50, 0.64))
    highlight = col(2 if len(hues) > 2 else 0, 0.55, rng.uniform(0.82, 0.92), s_floor=0.08)
    ink = col(0, 0.45, rng.uniform(0.06, 0.12), s_floor=0.10)
    muted = col(1 if len(hues) > 1 else 0, 0.7, rng.uniform(0.28, 0.38))

    colors = [plate, body, accent, highlight, ink, muted]
    # Deduplicate while preserving order (monochrome can collapse).
    seen: set[str] = set()
    unique: list[str] = []
    for c in colors:
        if c not in seen:
            seen.add(c)
            unique.append(c)
    return Palette(plate, body, accent, highlight, ink, muted, unique)


# ---------------------------------------------------------------------------
# SVG primitives
# ---------------------------------------------------------------------------

def nfmt(v: float) -> str:
    s = f"{v:.2f}"
    if s.endswith("00"):
        return str(int(round(v)))
    if s.endswith("0"):
        return s[:-1]
    return s


def attr(name: str, value: object | None) -> str:
    if value is None or value is False:
        return ""
    if value is True:
        return f" {name}=\"true\""
    return f" {name}=\"{value}\""


def el(tag: str, inner: str | None = None, **attrs: object) -> str:
    parts: list[str] = []
    for key, val in attrs.items():
        if val is None or val is False:
            continue
        name = key.replace("_", "-")
        if name.endswith("-"):
            name = name[:-1]
        parts.append(f"{name}=\"{val}\"")
    open_tag = f"<{tag}" + ((" " + " ".join(parts)) if parts else "")
    if inner is None:
        return open_tag + "/>"
    return f"{open_tag}>{inner}</{tag}>"


def polar(cx: float, cy: float, r: float, deg: float) -> tuple[float, float]:
    rad = math.radians(deg)
    return cx + r * math.cos(rad), cy + r * math.sin(rad)


def pts(points: Iterable[tuple[float, float]]) -> str:
    return " ".join(f"{nfmt(x)},{nfmt(y)}" for x, y in points)


def regular_poly(cx: float, cy: float, n: int, r: float, rot: float = -90.0) -> list[tuple[float, float]]:
    return [polar(cx, cy, r, rot + i * 360.0 / n) for i in range(n)]


def star_pts(
    cx: float, cy: float, n: int, r_out: float, r_in: float, rot: float = -90.0
) -> list[tuple[float, float]]:
    out: list[tuple[float, float]] = []
    step = 180.0 / n
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        out.append(polar(cx, cy, r, rot + i * step))
    return out


def circle(cx: float, cy: float, r: float, **a: object) -> str:
    return el("circle", cx=nfmt(cx), cy=nfmt(cy), r=nfmt(r), **a)


def ellipse(cx: float, cy: float, rx: float, ry: float, **a: object) -> str:
    return el("ellipse", cx=nfmt(cx), cy=nfmt(cy), rx=nfmt(rx), ry=nfmt(ry), **a)


def rect(x: float, y: float, w: float, h: float, rx: float | None = None, **a: object) -> str:
    return el(
        "rect",
        x=nfmt(x),
        y=nfmt(y),
        width=nfmt(w),
        height=nfmt(h),
        rx=None if rx is None else nfmt(rx),
        **a,
    )


def polygon(points: Sequence[tuple[float, float]], **a: object) -> str:
    return el("polygon", points=pts(points), **a)


def polyline(points: Sequence[tuple[float, float]], **a: object) -> str:
    return el("polyline", points=pts(points), **a)


def line(x1: float, y1: float, x2: float, y2: float, **a: object) -> str:
    return el("line", x1=nfmt(x1), y1=nfmt(y1), x2=nfmt(x2), y2=nfmt(y2), **a)


def path(d: str, **a: object) -> str:
    return el("path", d=d, **a)


def g(inner: str, **a: object) -> str:
    return el("g", inner, **a)


def round_join(**extra: object) -> dict[str, object]:
    d: dict[str, object] = {
        "stroke_linecap": "round",
        "stroke_linejoin": "round",
    }
    d.update(extra)
    return d


# ---------------------------------------------------------------------------
# Context
# ---------------------------------------------------------------------------

@dataclass
class Ctx:
    rng: random.Random
    pal: Palette
    uid: str
    defs: list[str] = field(default_factory=list)

    def u(self, a: float, b: float) -> float:
        return self.rng.uniform(a, b)

    def i(self, a: int, b: int) -> int:
        return self.rng.randint(a, b)

    def choice(self, seq: Sequence):
        return self.rng.choice(seq)

    def chance(self, p: float) -> bool:
        return self.rng.random() < p

    def radial(self, c0: str, c1: str, r: float = 32, cx: float = CX, cy: float = CY) -> str:
        gid = f"{self.uid}-rg{len(self.defs)}"
        self.defs.append(
            el(
                "radialGradient",
                inner=(
                    f'<stop offset="0%" stop-color="{c0}"/>'
                    f'<stop offset="100%" stop-color="{c1}"/>'
                ),
                id=gid,
                cx=nfmt(cx),
                cy=nfmt(cy),
                r=nfmt(r),
                gradientUnits="userSpaceOnUse",
            )
        )
        return f"url(#{gid})"

    def linear(self, c0: str, c1: str, x1: float = 12, y1: float = 8, x2: float = 52, y2: float = 56) -> str:
        gid = f"{self.uid}-lg{len(self.defs)}"
        self.defs.append(
            el(
                "linearGradient",
                inner=(
                    f'<stop offset="0%" stop-color="{c0}"/>'
                    f'<stop offset="100%" stop-color="{c1}"/>'
                ),
                id=gid,
                x1=nfmt(x1),
                y1=nfmt(y1),
                x2=nfmt(x2),
                y2=nfmt(y2),
                gradientUnits="userSpaceOnUse",
            )
        )
        return f"url(#{gid})"


# ---------------------------------------------------------------------------
# Plates
# ---------------------------------------------------------------------------

def draw_plate(ctx: Ctx, kind: str) -> str:
    fill = ctx.radial(ctx.pal.muted, ctx.pal.plate, r=36)
    if kind == "none":
        return ""
    if kind == "circle":
        return circle(CX, CY, 30, fill=fill)
    if kind == "roundrect":
        return rect(3, 3, 58, 58, rx=14, fill=fill)
    if kind == "soft-square":
        return rect(4, 4, 56, 56, rx=8, fill=fill)
    if kind == "squircle":
        # Superellipse approximation via cubic bezier.
        d = (
            "M32 3 C48 3 61 16 61 32 C61 48 48 61 32 61 "
            "C16 61 3 48 3 32 C3 16 16 3 32 3Z"
        )
        return path(d, fill=fill)
    if kind == "hex":
        return polygon(regular_poly(CX, CY, 6, 30, -90), fill=fill)
    if kind == "diamond":
        return polygon(regular_poly(CX, CY, 4, 30, 0), fill=fill)
    if kind == "octagon":
        return polygon(regular_poly(CX, CY, 8, 30, -22.5), fill=fill)
    return rect(3, 3, 58, 58, rx=14, fill=fill)


def clip_for(kind: str, uid: str) -> tuple[str, str]:
    cid = f"{uid}-clip"
    if kind == "circle":
        shape = circle(CX, CY, 30)
    elif kind == "hex":
        shape = polygon(regular_poly(CX, CY, 6, 30, -90))
    elif kind == "diamond":
        shape = polygon(regular_poly(CX, CY, 4, 30, 0))
    elif kind == "octagon":
        shape = polygon(regular_poly(CX, CY, 8, 30, -22.5))
    elif kind == "squircle":
        shape = path(
            "M32 3 C48 3 61 16 61 32 C61 48 48 61 32 61 "
            "C16 61 3 48 3 32 C3 16 16 3 32 3Z"
        )
    elif kind == "none":
        shape = rect(0, 0, 64, 64)
    elif kind == "soft-square":
        shape = rect(4, 4, 56, 56, rx=8)
    else:
        shape = rect(3, 3, 58, 58, rx=14)
    return cid, el("clipPath", shape, id=cid)


# ---------------------------------------------------------------------------
# Generators — each returns inner markup (no plate)
# ---------------------------------------------------------------------------

Gen = Callable[[Ctx], str]


def gen_mandala(ctx: Ctx) -> str:
    n = ctx.choice((6, 8, 10, 12))
    rot = ctx.u(0, 360)
    inner: list[str] = []
    r_pet = ctx.u(18, 24)
    for i in range(n):
        a = rot + i * 360 / n
        px, py = polar(CX, CY, r_pet * 0.55, a)
        inner.append(
            ellipse(
                px,
                py,
                ctx.u(5, 8),
                ctx.u(10, 14),
                fill=ctx.pal.body,
                opacity="0.92",
                transform=f"rotate({nfmt(a + 90)} {nfmt(px)} {nfmt(py)})",
            )
        )
    inner.append(circle(CX, CY, ctx.u(7, 10), fill=ctx.pal.accent))
    inner.append(
        circle(
            CX,
            CY,
            ctx.u(14, 18),
            fill="none",
            stroke=ctx.pal.highlight,
            stroke_width="1.6",
            opacity="0.85",
        )
    )
    for i in range(n):
        a = rot + i * 360 / n + 180 / n
        dx, dy = polar(CX, CY, ctx.u(20, 24), a)
        inner.append(circle(dx, dy, ctx.u(1.6, 2.6), fill=ctx.pal.highlight))
    inner.append(circle(CX, CY, 3.2, fill=ctx.pal.highlight))
    return "".join(inner)


def gen_crystal(ctx: Ctx) -> str:
    n = ctx.choice((5, 6, 7, 8))
    rot = ctx.u(-20, 20)
    outer = regular_poly(CX, CY, n, ctx.u(20, 24), rot - 90)
    bits = [polygon(outer, fill=ctx.pal.body)]
    # Facets from a slightly offset origin for volume.
    ox, oy = CX + ctx.u(-3, 3), CY + ctx.u(-5, 1)
    for i, (x, y) in enumerate(outer):
        nx, ny = outer[(i + 1) % n]
        fill = ctx.pal.accent if i % 2 == 0 else ctx.pal.muted
        bits.append(polygon([(ox, oy), (x, y), (nx, ny)], fill=fill, opacity="0.88"))
    bits.append(
        polygon(
            regular_poly(CX, CY - 2, n, ctx.u(7, 10), rot - 90),
            fill=ctx.pal.highlight,
            opacity="0.7",
        )
    )
    bits.append(
        polygon(
            outer,
            fill="none",
            stroke=ctx.pal.ink,
            stroke_width="1.4",
            **round_join(),
        )
    )
    return "".join(bits)


def gen_starburst(ctx: Ctx) -> str:
    n = ctx.choice((8, 10, 12, 16))
    rot = ctx.u(0, 360 / n)
    r_out = ctx.u(22, 26)
    r_in = ctx.u(7, 11)
    bits = [
        polygon(
            star_pts(CX, CY, n, r_out, r_in, rot - 90),
            fill=ctx.linear(ctx.pal.accent, ctx.pal.body),
        )
    ]
    bits.append(circle(CX, CY, ctx.u(6, 9), fill=ctx.pal.plate))
    bits.append(circle(CX, CY, ctx.u(3.5, 5), fill=ctx.pal.highlight))
    if ctx.chance(0.5):
        bits.append(
            polygon(
                star_pts(CX, CY, n, r_out * 0.62, r_in * 0.7, rot - 90 + 180 / n),
                fill="none",
                stroke=ctx.pal.highlight,
                stroke_width="1.2",
                opacity="0.7",
            )
        )
    return "".join(bits)


def gen_orbits(ctx: Ctx) -> str:
    bits: list[str] = []
    rings = ctx.i(2, 4)
    for k in range(rings):
        r = 8 + k * ctx.u(5.5, 7.2)
        bits.append(
            circle(
                CX,
                CY,
                r,
                fill="none",
                stroke=ctx.pal.body if k % 2 == 0 else ctx.pal.muted,
                stroke_width=nfmt(ctx.u(1.3, 2.2)),
                opacity="0.9",
            )
        )
        a = ctx.u(0, 360)
        sx, sy = polar(CX, CY, r, a)
        bits.append(circle(sx, sy, ctx.u(2.4, 4.2), fill=ctx.pal.accent))
        if ctx.chance(0.45):
            hx, hy = polar(CX, CY, r, a + 180)
            bits.append(circle(hx, hy, ctx.u(1.5, 2.4), fill=ctx.pal.highlight))
    bits.append(circle(CX, CY, ctx.u(4, 6.5), fill=ctx.pal.highlight))
    return "".join(bits)


def gen_crest(ctx: Ctx) -> str:
    # Shield silhouette.
    top = 10
    d = (
        f"M16 {top} H48 Q54 {top} 54 16 V30 "
        f"Q54 46 32 56 Q10 46 10 30 V16 Q10 {top} 16 {top}Z"
    )
    bits = [path(d, fill=ctx.linear(ctx.pal.body, ctx.pal.muted))]
    bits.append(
        path(
            d,
            fill="none",
            stroke=ctx.pal.highlight,
            stroke_width="1.6",
        )
    )
    motif = ctx.choice(("star", "cross", "diamond", "circle"))
    if motif == "star":
        bits.append(
            polygon(
                star_pts(CX, 30, 5, 11, 4.6),
                fill=ctx.pal.accent,
            )
        )
    elif motif == "cross":
        bits.append(rect(29, 18, 6, 24, rx=1.5, fill=ctx.pal.accent))
        bits.append(rect(20, 27, 24, 6, rx=1.5, fill=ctx.pal.accent))
    elif motif == "diamond":
        bits.append(polygon(regular_poly(CX, 30, 4, 11, 0), fill=ctx.pal.accent))
    else:
        bits.append(circle(CX, 30, 9, fill=ctx.pal.accent))
        bits.append(circle(CX, 30, 4, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_glyph(ctx: Ctx) -> str:
    bits: list[str] = [
        circle(
            CX,
            CY,
            22,
            fill="none",
            stroke=ctx.pal.body,
            stroke_width="2.2",
        )
    ]
    # Abstract strokes that read like a character.
    sw = nfmt(ctx.u(2.4, 3.4))
    stroke = round_join(fill="none", stroke=ctx.pal.accent, stroke_width=sw)
    kind = ctx.choice(("lambda", "yen", "rune", "phi", "hash"))
    if kind == "lambda":
        bits.append(polyline([(22, 46), (32, 16), (44, 46)], **stroke))
        bits.append(line(26, 34, 40, 28, **stroke))
    elif kind == "yen":
        bits.append(polyline([(22, 18), (32, 32), (42, 18)], **stroke))
        bits.append(line(32, 32, 32, 48, **stroke))
        bits.append(line(24, 36, 40, 36, **stroke))
        bits.append(line(24, 42, 40, 42, **stroke))
    elif kind == "rune":
        bits.append(line(32, 16, 32, 48, **stroke))
        bits.append(polyline([(32, 16), (44, 24), (32, 32)], **stroke))
        bits.append(line(32, 32, 44, 44, **stroke))
    elif kind == "phi":
        bits.append(ellipse(CX, CY, 8, 16, **stroke))
        bits.append(line(32, 14, 32, 50, **stroke))
    else:
        bits.append(line(22, 22, 42, 22, **stroke))
        bits.append(line(22, 32, 42, 32, **stroke))
        bits.append(line(22, 42, 42, 42, **stroke))
        bits.append(line(26, 18, 26, 46, **stroke))
        bits.append(line(38, 18, 38, 46, **stroke))
    bits.append(circle(CX, CY, 3, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_lattice(ctx: Ctx) -> str:
    bits: list[str] = []
    n = ctx.choice((3, 4))
    margin = 14
    span = 64 - 2 * margin
    step = span / (n - 1)
    r = ctx.u(2.2, 3.4)
    for row in range(n):
        for col in range(n):
            x = margin + col * step
            y = margin + row * step
            bits.append(circle(x, y, r, fill=ctx.pal.accent if (row + col) % 2 == 0 else ctx.pal.body))
            if col + 1 < n:
                bits.append(
                    line(
                        x,
                        y,
                        x + step,
                        y,
                        stroke=ctx.pal.muted,
                        stroke_width="1.4",
                    )
                )
            if row + 1 < n:
                bits.append(
                    line(
                        x,
                        y,
                        x,
                        y + step,
                        stroke=ctx.pal.muted,
                        stroke_width="1.4",
                    )
                )
    if ctx.chance(0.6):
        bits.append(
            polygon(
                regular_poly(CX, CY, 4, 10, 0),
                fill=ctx.pal.highlight,
                opacity="0.9",
            )
        )
    return "".join(bits)


def gen_bloom(ctx: Ctx) -> str:
    n = ctx.choice((5, 6, 7, 8))
    rot = ctx.u(0, 360)
    bits: list[str] = []
    for i in range(n):
        a = rot + i * 360 / n
        px, py = polar(CX, CY, 12, a)
        bits.append(
            ellipse(
                px,
                py,
                8,
                13,
                fill=ctx.pal.body if i % 2 == 0 else ctx.pal.accent,
                opacity="0.92",
                transform=f"rotate({nfmt(a + 90)} {nfmt(px)} {nfmt(py)})",
            )
        )
    bits.append(circle(CX, CY, 8, fill=ctx.pal.highlight))
    bits.append(circle(CX, CY, 3.4, fill=ctx.pal.ink))
    for i in range(n):
        a = rot + i * 360 / n + 180 / n
        dx, dy = polar(CX, CY, 22, a)
        bits.append(circle(dx, dy, 1.8, fill=ctx.pal.highlight, opacity="0.8"))
    return "".join(bits)


def gen_rings(ctx: Ctx) -> str:
    bits: list[str] = []
    offsets = [(-7, -4), (8, -3), (0, 8)]
    colors = [ctx.pal.body, ctx.pal.accent, ctx.pal.highlight]
    ctx.rng.shuffle(offsets)
    r = ctx.u(11, 14)
    sw = nfmt(ctx.u(3.2, 4.4))
    for (dx, dy), c in zip(offsets, colors):
        bits.append(
            circle(
                CX + dx,
                CY + dy,
                r,
                fill="none",
                stroke=c,
                stroke_width=sw,
            )
        )
    return "".join(bits)


def gen_shards(ctx: Ctx) -> str:
    bits: list[str] = []
    n = ctx.i(5, 8)
    rot0 = ctx.u(0, 360)
    for i in range(n):
        a = rot0 + i * (360 / n) + ctx.u(-8, 8)
        r0 = ctx.u(4, 8)
        r1 = ctx.u(20, 26)
        spread = ctx.u(10, 22)
        p0 = polar(CX, CY, r0, a)
        p1 = polar(CX, CY, r1, a - spread / 2)
        p2 = polar(CX, CY, r1 * ctx.u(0.72, 1.0), a + spread / 2)
        fill = ctx.pal.accent if i % 2 == 0 else ctx.pal.body
        bits.append(polygon([p0, p1, p2], fill=fill, opacity="0.92"))
    bits.append(circle(CX, CY, ctx.u(4, 6), fill=ctx.pal.highlight))
    return "".join(bits)


def gen_ripple(ctx: Ctx) -> str:
    bits: list[str] = []
    start = ctx.u(-40, 40)
    for k in range(4):
        r = 8 + k * 6.2
        bits.append(
            path(
                f"M{nfmt(CX - r)} {nfmt(CY)} A{nfmt(r)} {nfmt(r)} 0 0 1 {nfmt(CX + r)} {nfmt(CY)}",
                fill="none",
                stroke=ctx.pal.body if k % 2 == 0 else ctx.pal.accent,
                stroke_width=nfmt(2.2 - k * 0.2),
                transform=f"rotate({nfmt(start)} {CX} {CY})",
                opacity=nfmt(1 - k * 0.12),
            )
        )
    bits.append(circle(CX, CY, 4.5, fill=ctx.pal.highlight))
    bits.append(circle(CX + 10, CY - 8, 2, fill=ctx.pal.accent))
    return "".join(bits)


def gen_constellation(ctx: Ctx) -> str:
    n = ctx.i(6, 9)
    nodes: list[tuple[float, float]] = []
    for _ in range(n):
        ang = ctx.u(0, 360)
        rad = ctx.u(8, 22)
        nodes.append(polar(CX, CY, rad, ang))
    # Light repulsion so they don't collapse.
    for _ in range(8):
        for i, (x, y) in enumerate(nodes):
            for j, (x2, y2) in enumerate(nodes):
                if i == j:
                    continue
                dx, dy = x - x2, y - y2
                d = math.hypot(dx, dy) or 0.001
                if d < 10:
                    push = (10 - d) * 0.15
                    nodes[i] = (x + dx / d * push, y + dy / d * push)
    bits: list[str] = []
    # Connect nearest neighbors.
    for i, (x, y) in enumerate(nodes):
        dists = sorted(
            ((math.hypot(x - x2, y - y2), j) for j, (x2, y2) in enumerate(nodes) if j != i)
        )
        for _, j in dists[:2]:
            x2, y2 = nodes[j]
            bits.append(
                line(x, y, x2, y2, stroke=ctx.pal.muted, stroke_width="1.3")
            )
    for i, (x, y) in enumerate(nodes):
        bits.append(
            circle(
                x,
                y,
                ctx.u(1.8, 3.4) if i else 4,
                fill=ctx.pal.highlight if i == 0 else ctx.pal.accent if i % 2 else ctx.pal.body,
            )
        )
    return "".join(bits)


def gen_honeycomb(ctx: Ctx) -> str:
    bits: list[str] = []
    r = 8.2
    dx = r * math.sqrt(3)
    coords = [
        (CX, CY),
        (CX + dx, CY),
        (CX - dx, CY),
        (CX + dx / 2, CY + r * 1.5),
        (CX - dx / 2, CY + r * 1.5),
        (CX + dx / 2, CY - r * 1.5),
        (CX - dx / 2, CY - r * 1.5),
    ]
    for i, (x, y) in enumerate(coords):
        fill = ctx.pal.accent if i == 0 else ctx.pal.body if i % 2 else ctx.pal.muted
        bits.append(
            polygon(
                regular_poly(x, y, 6, r - 0.6, 30),
                fill=fill,
                stroke=ctx.pal.ink,
                stroke_width="0.8",
            )
        )
    bits.append(circle(CX, CY, 2.4, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_spiral(ctx: Ctx) -> str:
    turns = ctx.u(2.2, 3.4)
    steps = 48
    max_r = ctx.u(20, 24)
    rot = ctx.u(0, 360)
    d: list[str] = []
    for i in range(steps + 1):
        t = i / steps
        r = 2 + t * max_r
        a = rot + t * turns * 360
        x, y = polar(CX, CY, r, a)
        d.append(("M" if i == 0 else "L") + f"{nfmt(x)} {nfmt(y)}")
    bits = [
        path(
            " ".join(d),
            fill="none",
            stroke=ctx.pal.body,
            stroke_width="2.6",
            **round_join(),
        )
    ]
    end = polar(CX, CY, max_r, rot + turns * 360)
    bits.append(circle(*end, 3.2, fill=ctx.pal.accent))
    bits.append(circle(CX, CY, 3.6, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_panes(ctx: Ctx) -> str:
    bits = [rect(12, 12, 40, 40, rx=4, fill=ctx.pal.muted)]
    # Window mullions.
    bits.append(rect(30.5, 14, 3, 36, fill=ctx.pal.ink))
    bits.append(rect(14, 30.5, 36, 3, fill=ctx.pal.ink))
    colors = [ctx.pal.body, ctx.pal.accent, ctx.pal.highlight, ctx.pal.body]
    quads = [(14, 14), (34, 14), (14, 34), (34, 34)]
    for (x, y), c in zip(quads, colors):
        bits.append(rect(x, y, 16, 16, rx=1.5, fill=c, opacity="0.92"))
    bits.append(
        rect(12, 12, 40, 40, rx=4, fill="none", stroke=ctx.pal.highlight, stroke_width="1.6")
    )
    return "".join(bits)


def gen_compass(ctx: Ctx) -> str:
    rot = ctx.choice((0, 45))
    bits: list[str] = [
        circle(
            CX,
            CY,
            24,
            fill="none",
            stroke=ctx.pal.muted,
            stroke_width="1.6",
        )
    ]
    for i in range(4):
        a = rot + i * 90
        # Major point
        tip = polar(CX, CY, 22, a - 90)
        l = polar(CX, CY, 6, a - 90 - 18)
        rgt = polar(CX, CY, 6, a - 90 + 18)
        fill = ctx.pal.accent if i % 2 == 0 else ctx.pal.body
        bits.append(polygon([tip, l, (CX, CY), rgt], fill=fill))
    bits.append(circle(CX, CY, 5, fill=ctx.pal.highlight))
    bits.append(circle(CX, CY, 2.2, fill=ctx.pal.ink))
    for i in range(8):
        a = rot + i * 45 - 90
        p1 = polar(CX, CY, 24, a)
        p2 = polar(CX, CY, 27 if i % 2 == 0 else 25.5, a)
        bits.append(line(*p1, *p2, stroke=ctx.pal.highlight, stroke_width="1.4"))
    return "".join(bits)


def gen_mosaic(ctx: Ctx) -> str:
    bits: list[str] = []
    cols, rows = 4, 4
    gap = 1.6
    origin = 12
    cell = (40 - gap * (cols - 1)) / cols
    palette = [ctx.pal.body, ctx.pal.accent, ctx.pal.muted, ctx.pal.highlight]
    for r in range(rows):
        for c in range(cols):
            x = origin + c * (cell + gap)
            y = origin + r * (cell + gap)
            fill = palette[(r * 3 + c + ctx.i(0, 3)) % len(palette)]
            shape = ctx.choice(("rect", "circle", "diamond"))
            if shape == "circle":
                bits.append(circle(x + cell / 2, y + cell / 2, cell / 2 - 0.4, fill=fill))
            elif shape == "diamond":
                bits.append(
                    polygon(
                        regular_poly(x + cell / 2, y + cell / 2, 4, cell / 2, 0),
                        fill=fill,
                    )
                )
            else:
                bits.append(rect(x, y, cell, cell, rx=1.4, fill=fill))
    return "".join(bits)


def gen_vortex(ctx: Ctx) -> str:
    n = ctx.choice((8, 10, 12))
    rot = ctx.u(0, 360)
    bits: list[str] = []
    for i in range(n):
        a = rot + i * 360 / n
        inner = polar(CX, CY, 6, a)
        outer_a = polar(CX, CY, 22, a - 8)
        outer_b = polar(CX, CY, 24, a + 14)
        fill = ctx.pal.body if i % 2 == 0 else ctx.pal.accent
        bits.append(polygon([inner, outer_a, outer_b], fill=fill, opacity="0.93"))
    bits.append(circle(CX, CY, 6.5, fill=ctx.pal.plate))
    bits.append(circle(CX, CY, 3.2, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_sigil(ctx: Ctx) -> str:
    bits = [
        circle(CX, CY, 24, fill="none", stroke=ctx.pal.body, stroke_width="2"),
        circle(CX, CY, 18, fill="none", stroke=ctx.pal.muted, stroke_width="1.2"),
    ]
    n = ctx.choice((3, 4, 5, 6))
    rot = ctx.u(0, 40)
    bits.append(
        polygon(
            regular_poly(CX, CY, n, 16, rot - 90),
            fill="none",
            stroke=ctx.pal.accent,
            stroke_width="1.8",
            **round_join(),
        )
    )
    if n >= 4:
        bits.append(
            polygon(
                regular_poly(CX, CY, n, 16, rot - 90 + 180 / n),
                fill="none",
                stroke=ctx.pal.highlight,
                stroke_width="1.2",
                opacity="0.8",
            )
        )
    bits.append(circle(CX, CY, 3.4, fill=ctx.pal.highlight))
    for i in range(n):
        a = rot - 90 + i * 360 / n
        x, y = polar(CX, CY, 24, a)
        bits.append(circle(x, y, 2.1, fill=ctx.pal.accent))
    return "".join(bits)


def gen_bubbles(ctx: Ctx) -> str:
    bits: list[str] = []
    n = ctx.i(6, 10)
    placed: list[tuple[float, float, float]] = []
    for k in range(n):
        r = ctx.u(5, 14) if k < 3 else ctx.u(3.2, 7)
        for _ in range(20):
            ang = ctx.u(0, 360)
            rad = ctx.u(0, 18)
            x, y = polar(CX, CY, rad, ang)
            if all(math.hypot(x - px, y - py) > (r + pr) * 0.55 for px, py, pr in placed):
                placed.append((x, y, r))
                break
    colors = [ctx.pal.body, ctx.pal.accent, ctx.pal.muted, ctx.pal.highlight]
    for i, (x, y, r) in enumerate(placed):
        bits.append(
            circle(
                x,
                y,
                r,
                fill=colors[i % len(colors)],
                opacity="0.9",
            )
        )
        bits.append(
            circle(
                x - r * 0.28,
                y - r * 0.28,
                r * 0.22,
                fill=ctx.pal.highlight,
                opacity="0.55",
            )
        )
    return "".join(bits)


def gen_chevrons(ctx: Ctx) -> str:
    bits: list[str] = []
    n = ctx.i(3, 5)
    gap = 8
    start_y = 16
    sw = nfmt(ctx.u(2.6, 3.6))
    for i in range(n):
        y = start_y + i * gap
        c = ctx.pal.accent if i % 2 else ctx.pal.body
        bits.append(
            polyline(
                [(18, y + 6), (32, y - 2), (46, y + 6)],
                fill="none",
                stroke=c,
                stroke_width=sw,
                **round_join(),
            )
        )
    bits.append(circle(CX, 50, 2.4, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_weave(ctx: Ctx) -> str:
    bits: list[str] = []
    sw = "3.2"
    colors = [ctx.pal.body, ctx.pal.accent]
    for i in range(4):
        y = 18 + i * 9
        bits.append(
            path(
                f"M12 {y} C 22 {y - 8}, 42 {y + 8}, 52 {y}",
                fill="none",
                stroke=colors[i % 2],
                stroke_width=sw,
                **round_join(),
            )
        )
    for i in range(3):
        x = 20 + i * 12
        bits.append(
            path(
                f"M{x} 12 C {x + 8} 24, {x - 8} 40, {x} 52",
                fill="none",
                stroke=ctx.pal.highlight if i == 1 else ctx.pal.muted,
                stroke_width="2.2",
                opacity="0.85",
                **round_join(),
            )
        )
    return "".join(bits)


def gen_frame(ctx: Ctx) -> str:
    bits = [
        rect(10, 10, 44, 44, rx=8, fill="none", stroke=ctx.pal.body, stroke_width="2.4"),
        rect(16, 16, 32, 32, rx=4, fill="none", stroke=ctx.pal.muted, stroke_width="1.4"),
    ]
    # Corner ornaments
    for x, y, sx, sy in (
        (10, 10, 1, 1),
        (54, 10, -1, 1),
        (10, 54, 1, -1),
        (54, 54, -1, -1),
    ):
        bits.append(
            path(
                f"M{x + 8 * sx} {y} L{x} {y} L{x} {y + 8 * sy}",
                fill="none",
                stroke=ctx.pal.accent,
                stroke_width="2.2",
                **round_join(),
            )
        )
    inner = ctx.choice(("dot", "star", "plus"))
    if inner == "star":
        bits.append(polygon(star_pts(CX, CY, 4, 9, 3.5, -90), fill=ctx.pal.highlight))
    elif inner == "plus":
        bits.append(rect(30, 22, 4, 20, rx=1.2, fill=ctx.pal.highlight))
        bits.append(rect(22, 30, 20, 4, rx=1.2, fill=ctx.pal.highlight))
    else:
        bits.append(circle(CX, CY, 6, fill=ctx.pal.accent))
        bits.append(circle(CX, CY, 2.5, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_seeds(ctx: Ctx) -> str:
    n = ctx.choice((5, 6, 7))
    rot = ctx.u(0, 360)
    bits: list[str] = []
    for i in range(n):
        a = rot + i * 360 / n
        px, py = polar(CX, CY, 14, a)
        bits.append(
            ellipse(
                px,
                py,
                6,
                11,
                fill=ctx.pal.body if i % 2 == 0 else ctx.pal.accent,
                transform=f"rotate({nfmt(a + 90)} {nfmt(px)} {nfmt(py)})",
            )
        )
        bits.append(
            ellipse(
                px,
                py,
                2,
                5,
                fill=ctx.pal.highlight,
                opacity="0.55",
                transform=f"rotate({nfmt(a + 90)} {nfmt(px)} {nfmt(py)})",
            )
        )
    bits.append(circle(CX, CY, 6, fill=ctx.pal.muted))
    bits.append(circle(CX, CY, 2.8, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_eclipse(ctx: Ctx) -> str:
    bits = [
        circle(CX, CY, 20, fill=ctx.linear(ctx.pal.body, ctx.pal.muted)),
    ]
    ox = ctx.u(6, 12) * ctx.choice((-1, 1))
    oy = ctx.u(-4, 4)
    bits.append(circle(CX + ox, CY + oy, 16, fill=ctx.pal.plate))
    # Rim light
    bits.append(
        circle(
            CX,
            CY,
            20,
            fill="none",
            stroke=ctx.pal.highlight,
            stroke_width="1.6",
            opacity="0.7",
        )
    )
    bits.append(circle(CX - ox * 0.4, CY - 8, 2.2, fill=ctx.pal.accent, opacity="0.8"))
    return "".join(bits)


def gen_kite(ctx: Ctx) -> str:
    top = (CX, 8)
    right = (54, 30)
    bottom = (CX, 56)
    left = (10, 30)
    mid = (CX, 30)
    bits = [
        polygon([top, right, mid], fill=ctx.pal.body),
        polygon([top, left, mid], fill=ctx.pal.accent),
        polygon([bottom, right, mid], fill=ctx.pal.muted),
        polygon([bottom, left, mid], fill=ctx.pal.body),
        line(*top, *bottom, stroke=ctx.pal.highlight, stroke_width="1.3"),
        line(*left, *right, stroke=ctx.pal.highlight, stroke_width="1.3"),
    ]
    bits.append(circle(CX, CY, 3.2, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_asterisk(ctx: Ctx) -> str:
    n = ctx.choice((6, 8))
    rot = ctx.u(0, 30)
    bits: list[str] = []
    w = ctx.u(3.2, 4.6)
    for i in range(n):
        a = rot + i * 180 / n
        bits.append(
            rect(
                CX - w / 2,
                12,
                w,
                40,
                rx=w / 2,
                fill=ctx.pal.body if i % 2 == 0 else ctx.pal.accent,
                transform=f"rotate({nfmt(a)} {CX} {CY})",
            )
        )
    bits.append(circle(CX, CY, 6, fill=ctx.pal.plate))
    bits.append(circle(CX, CY, 3, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_labyrinth(ctx: Ctx) -> str:
    bits = [rect(12, 12, 40, 40, rx=3, fill=ctx.pal.muted)]
    sw = "2.4"
    stroke = round_join(fill="none", stroke=ctx.pal.body, stroke_width=sw)
    bits.append(path("M20 20 H44 V44 H20 Z", **stroke))
    bits.append(path("M26 26 H38 V38 H26 Z", **{**stroke, "stroke": ctx.pal.accent}))
    bits.append(line(32, 20, 32, 26, **stroke))
    bits.append(line(38, 32, 44, 32, stroke=ctx.pal.highlight, stroke_width=sw, **round_join()))
    bits.append(circle(CX, CY, 3, fill=ctx.pal.highlight))
    return "".join(bits)


def gen_sun(ctx: Ctx) -> str:
    n = ctx.choice((8, 12))
    rot = ctx.u(0, 20)
    bits: list[str] = []
    for i in range(n):
        a = rot + i * 360 / n - 90
        p1 = polar(CX, CY, 14, a - 6)
        p2 = polar(CX, CY, 14, a + 6)
        tip = polar(CX, CY, 24 if i % 2 == 0 else 21, a)
        bits.append(polygon([p1, tip, p2], fill=ctx.pal.accent if i % 2 == 0 else ctx.pal.body))
    bits.append(circle(CX, CY, 12, fill=ctx.linear(ctx.pal.highlight, ctx.pal.body)))
    bits.append(circle(CX - 3, CY - 3, 2.4, fill="#ffffff", opacity="0.35"))
    return "".join(bits)


GENERATORS: dict[str, Gen] = {
    "mandala": gen_mandala,
    "crystal": gen_crystal,
    "starburst": gen_starburst,
    "orbits": gen_orbits,
    "crest": gen_crest,
    "glyph": gen_glyph,
    "lattice": gen_lattice,
    "bloom": gen_bloom,
    "rings": gen_rings,
    "shards": gen_shards,
    "ripple": gen_ripple,
    "constellation": gen_constellation,
    "honeycomb": gen_honeycomb,
    "spiral": gen_spiral,
    "panes": gen_panes,
    "compass": gen_compass,
    "mosaic": gen_mosaic,
    "vortex": gen_vortex,
    "sigil": gen_sigil,
    "bubbles": gen_bubbles,
    "chevrons": gen_chevrons,
    "weave": gen_weave,
    "frame": gen_frame,
    "seeds": gen_seeds,
    "eclipse": gen_eclipse,
    "kite": gen_kite,
    "asterisk": gen_asterisk,
    "labyrinth": gen_labyrinth,
    "sun": gen_sun,
}

STYLES = tuple(GENERATORS.keys())


# ---------------------------------------------------------------------------
# Icon assembly
# ---------------------------------------------------------------------------

def render_icon(index: int, master_seed: int, size: int) -> dict:
    i = index  # 1-based
    uid = f"icon-{i:03d}"
    rng = random.Random((master_seed * 10007 + i * 104729) & 0xFFFFFFFF)
    hue = (i * GOLDEN_ANGLE) % 360.0
    harmony = HARMONIES[(i * 3) % len(HARMONIES)]
    style = STYLES[(i - 1) % len(STYLES)]
    plate = PLATES[(i * 5) % len(PLATES)]
    pal = make_palette(rng, hue, harmony)
    ctx = Ctx(rng=rng, pal=pal, uid=uid)

    cid, clip = clip_for(plate, uid)
    ctx.defs.append(clip)
    motif = GENERATORS[style](ctx)
    plate_svg = draw_plate(ctx, plate)
    inner = plate_svg + motif
    body = g(inner, clip_path=f"url(#{cid})")
    defs = el("defs", "".join(ctx.defs)) if ctx.defs else ""
    symbol = el(
        "symbol",
        defs + body,
        id=uid,
        viewBox=f"0 0 {size} {size}",
    )
    return {
        "id": uid,
        "index": i,
        "style": style,
        "harmony": harmony,
        "hue": round(hue, 2),
        "plate": plate,
        "colors": pal.all,
        "symbol": symbol,
    }


def build_sprite(icons: list[dict], size: int) -> str:
    symbols = "\n  ".join(ic["symbol"] for ic in icons)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        f'id="atelier-64-sprite" viewBox="0 0 {size} {size}" width="0" height="0" '
        f'aria-hidden="true" focusable="false">\n'
        f"  {symbols}\n"
        f"</svg>\n"
    )


def build_manifest(icons: list[dict], seed: int, size: int) -> dict:
    return {
        "name": "Atelier 64",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "seed": seed,
        "count": len(icons),
        "size": size,
        "sprite": "/icons.svg",
        "harmonies": list(HARMONIES),
        "styles": list(STYLES),
        "icons": [
            {
                "id": ic["id"],
                "index": ic["index"],
                "style": ic["style"],
                "harmony": ic["harmony"],
                "hue": ic["hue"],
                "plate": ic["plate"],
                "colors": ic["colors"],
            }
            for ic in icons
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a harmonic SVG icon sprite.")
    parser.add_argument("--count", type=int, default=200)
    parser.add_argument("--size", type=int, default=SIZE)
    parser.add_argument("--seed", type=int, default=64)
    parser.add_argument(
        "--sprite",
        type=Path,
        default=Path("public/icons.svg"),
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path("public/icons.json"),
    )
    args = parser.parse_args()
    if args.count < 1:
        raise SystemExit("count must be >= 1")

    icons = [render_icon(i, args.seed, args.size) for i in range(1, args.count + 1)]
    sprite = build_sprite(icons, args.size)
    manifest = build_manifest(icons, args.seed, args.size)

    args.sprite.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.sprite.write_text(sprite, encoding="utf-8")
    args.manifest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"wrote {args.count} symbols → {args.sprite}")
    print(f"wrote manifest → {args.manifest}")


if __name__ == "__main__":
    main()
