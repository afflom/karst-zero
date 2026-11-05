#!/usr/bin/env python3
"""Deterministic 1200x630 PNG social link preview generator for KARST: ZERO HORIZON."""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

WIDTH = 1200
HEIGHT = 630

# 5x7 uppercase/numeric/symbol bitmap font (each row is 5 bits, MSB on left)
FONT_5X7: dict[str, list[int]] = {
    " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    "A": [0x0E, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    "B": [0x1E, 0x11, 0x11, 0x1E, 0x11, 0x11, 0x1E],
    "C": [0x0E, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0E],
    "D": [0x1C, 0x12, 0x11, 0x11, 0x11, 0x12, 0x1C],
    "E": [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x1F],
    "F": [0x1F, 0x10, 0x10, 0x1E, 0x10, 0x10, 0x10],
    "G": [0x0E, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0F],
    "H": [0x11, 0x11, 0x11, 0x1F, 0x11, 0x11, 0x11],
    "I": [0x0E, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0E],
    "J": [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0C],
    "K": [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
    "L": [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1F],
    "M": [0x11, 0x1B, 0x15, 0x15, 0x11, 0x11, 0x11],
    "N": [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
    "O": [0x0E, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    "P": [0x1E, 0x11, 0x11, 0x1E, 0x10, 0x10, 0x10],
    "Q": [0x0E, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0D],
    "R": [0x1E, 0x11, 0x11, 0x1E, 0x14, 0x12, 0x11],
    "S": [0x0F, 0x10, 0x10, 0x0E, 0x01, 0x01, 0x1E],
    "T": [0x1F, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
    "U": [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0E],
    "V": [0x11, 0x11, 0x11, 0x11, 0x11, 0x0A, 0x04],
    "W": [0x11, 0x11, 0x11, 0x15, 0x15, 0x1B, 0x11],
    "X": [0x11, 0x11, 0x0A, 0x04, 0x0A, 0x11, 0x11],
    "Y": [0x11, 0x11, 0x0A, 0x04, 0x04, 0x04, 0x04],
    "Z": [0x1F, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1F],
    "0": [0x0E, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0E],
    "1": [0x04, 0x0C, 0x04, 0x04, 0x04, 0x04, 0x0E],
    "2": [0x0E, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1F],
    "3": [0x1F, 0x02, 0x04, 0x06, 0x01, 0x11, 0x0E],
    "4": [0x02, 0x06, 0x0A, 0x12, 0x1F, 0x02, 0x02],
    "5": [0x1F, 0x10, 0x1E, 0x01, 0x01, 0x11, 0x0E],
    "6": [0x06, 0x08, 0x10, 0x1E, 0x11, 0x11, 0x0E],
    "7": [0x1F, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
    "8": [0x0E, 0x11, 0x11, 0x0E, 0x11, 0x11, 0x0E],
    "9": [0x0E, 0x11, 0x11, 0x0F, 0x01, 0x02, 0x0C],
    ":": [0x00, 0x04, 0x04, 0x00, 0x04, 0x04, 0x00],
    ".": [0x00, 0x00, 0x00, 0x00, 0x00, 0x06, 0x06],
    "-": [0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00],
    "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
    "&": [0x0C, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0D],
    "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
    ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
    ",": [0x00, 0x00, 0x00, 0x00, 0x06, 0x04, 0x08],
    "+": [0x00, 0x04, 0x04, 0x1F, 0x04, 0x04, 0x00],
}


def fill_rect(
    buf: bytearray,
    x0: int,
    y0: int,
    w: int,
    h: int,
    color: tuple[int, int, int],
) -> None:
    r, g, b = color
    x1 = max(0, min(WIDTH, x0))
    x2 = max(0, min(WIDTH, x0 + w))
    y1 = max(0, min(HEIGHT, y0))
    y2 = max(0, min(HEIGHT, y0 + h))
    if x2 <= x1 or y2 <= y1:
        return
    row_bytes = bytes([r, g, b]) * (x2 - x1)
    stride = WIDTH * 3
    for y in range(y1, y2):
        start = y * stride + x1 * 3
        buf[start : start + len(row_bytes)] = row_bytes


def stroke_rect(
    buf: bytearray,
    x0: int,
    y0: int,
    w: int,
    h: int,
    thickness: int,
    color: tuple[int, int, int],
) -> None:
    fill_rect(buf, x0, y0, w, thickness, color)
    fill_rect(buf, x0, y0 + h - thickness, w, thickness, color)
    fill_rect(buf, x0, y0, thickness, h, color)
    fill_rect(buf, x0 + w - thickness, y0, thickness, h, color)


def draw_text(
    buf: bytearray,
    x: int,
    y: int,
    text: str,
    scale: int,
    color: tuple[int, int, int],
) -> None:
    cx = x
    for ch in text.upper():
        glyph = FONT_5X7.get(ch, FONT_5X7[" "])
        for row_idx, row_bits in enumerate(glyph):
            for col_idx in range(5):
                if (row_bits >> (4 - col_idx)) & 1:
                    fill_rect(
                        buf,
                        cx + col_idx * scale,
                        y + row_idx * scale,
                        scale,
                        scale,
                        color,
                    )
        cx += 6 * scale


def draw_hex_emblem(buf: bytearray, cx: int, cy: int) -> None:
    for dy in range(-88, 89):
        for dx in range(-88, 89):
            ax = abs(dx)
            ay = abs(dy)
            hex_dist = max(ax, int(ax * 0.5 + ay * 0.866))
            if hex_dist <= 86:
                if 81 <= hex_dist <= 86:
                    col = (255, 122, 26)
                elif 54 <= hex_dist <= 58:
                    col = (42, 212, 197)
                elif 28 <= hex_dist <= 31:
                    col = (245, 158, 11)
                elif dx * dx + dy * dy <= 14 * 14:
                    col = (16, 185, 129)
                else:
                    col = (19, 27, 46)
                px = cx + dx
                py = cy + dy
                if 0 <= px < WIDTH and 0 <= py < HEIGHT:
                    idx = (py * WIDTH + px) * 3
                    buf[idx] = col[0]
                    buf[idx + 1] = col[1]
                    buf[idx + 2] = col[2]


def encode_png(buf: bytearray) -> bytes:
    stride = WIDTH * 3
    raw_rows = bytearray()
    for y in range(HEIGHT):
        raw_rows.append(0)  # Filter type 0 (None)
        raw_rows.extend(buf[y * stride : (y + 1) * stride])

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw_rows), level=9)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def generate_og_png(output_path: Path) -> None:
    buf = bytearray(WIDTH * HEIGHT * 3)
    # Obsidian Slate background (#0F141C)
    fill_rect(buf, 0, 0, WIDTH, HEIGHT, (15, 20, 28))

    # Subtle Tactical Sector Grid (#1B2434)
    for gy in range(90, HEIGHT, 90):
        fill_rect(buf, 0, gy, WIDTH, 1, (27, 36, 52))
    for gx in range(150, WIDTH, 150):
        fill_rect(buf, gx, 0, 1, HEIGHT, (27, 36, 52))

    # Outer Frame & Top Tactical Amber Bar
    stroke_rect(buf, 28, 28, WIDTH - 56, HEIGHT - 56, 2, (51, 65, 85))
    fill_rect(buf, 28, 28, WIDTH - 56, 6, (255, 122, 26))

    # Hexagonal Karst Vault Emblem
    draw_hex_emblem(buf, 138, 165)

    # Top Eyebrow Badge
    fill_rect(buf, 255, 68, 720, 36, (23, 32, 51))
    stroke_rect(buf, 255, 68, 720, 36, 2, (255, 122, 26))
    draw_text(
        buf,
        272,
        79,
        "NEMESIS CORE 4.0 ENGINE - LEXLEAN V0.4 - PRISMPM V0.4",
        2,
        (255, 122, 26),
    )

    # Main Title & Subtitles
    draw_text(buf, 255, 125, "KARST: ZERO HORIZON", 6, (244, 247, 250))
    draw_text(
        buf,
        255,
        186,
        "2.5D ISOMETRIC TACTICAL SKIRMISH & ORBITAL CAMPAIGN WARGAME",
        2,
        (42, 212, 197),
    )
    draw_text(
        buf,
        255,
        218,
        "6-BERTH / 16-ALLOY STRIKE ROSTER ACROSS 6 VAULT SECTORS ON KARST-9",
        2,
        (148, 163, 184),
    )

    # 6 Certified Nemesis Core 4.0 Subsystem Cards
    cards = [
        (
            60,
            278,
            (255, 122, 26),
            "SUB-01: 3D UNIT SYNTHESIS",
            "150 ARCHETYPES (6 X 5 X 5)",
            "ZERO-STAT-INFLATION SOCKETS",
        ),
        (
            428,
            278,
            (42, 212, 197),
            "SUB-02: OPPOSED D6 COMBAT",
            "STRIKE POOL & COVER LOS",
            "1D6 RUPTURE & SPILLOVER",
        ),
        (
            796,
            278,
            (255, 122, 26),
            "SUB-03: RESONANCE WEAVE",
            "6 FREQUENCIES & 16 MODULES",
            "9 DIRECTIVES & BACKLASH",
        ),
        (
            60,
            398,
            (42, 212, 197),
            "SUB-04: OPAQUE CHIT AI",
            "5-ROUND WARDEN DIRECTOR",
            "1D6 WRAP & 6 AI ROUTINES",
        ),
        (
            428,
            398,
            (255, 122, 26),
            "SUB-05: ORBITAL BASTION",
            "4 CREW TASKS & 3 FACILITIES",
            "6 CONTRACTS & SAVE DIGEST",
        ),
        (
            796,
            398,
            (42, 212, 197),
            "SUB-06: 2.5D SPATIAL WORLD",
            "7 KARST-9 WORLD LOCATIONS",
            "ISOMETRIC DEPTH & 4 PRESETS",
        ),
    ]
    for cx, cy, accent, l1, l2, l3 in cards:
        fill_rect(buf, cx, cy, 344, 102, (19, 27, 46))
        stroke_rect(buf, cx, cy, 344, 102, 2, (51, 65, 85))
        fill_rect(buf, cx, cy, 6, 102, accent)
        draw_text(buf, cx + 18, cy + 16, l1, 2, accent)
        draw_text(buf, cx + 18, cy + 46, l2, 2, (244, 247, 250))
        draw_text(buf, cx + 18, cy + 74, l3, 2, (148, 163, 184))

    # Bottom Formal Verification Status Bar
    fill_rect(buf, 60, 524, 1080, 52, (11, 15, 23))
    stroke_rect(buf, 60, 524, 1080, 52, 2, (42, 212, 197))
    fill_rect(buf, 82, 542, 16, 16, (16, 185, 129))
    draw_text(
        buf,
        114,
        543,
        "19/19 LEXLEAN V0.4 MODULES - 7/7 SUBSYSTEMS - 18/18 CONFORMANCE",
        2,
        (244, 247, 250),
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(encode_png(buf))


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    out = root / "assets" / "og-preview.png"
    generate_og_png(out)
    print(f"Generated {out} ({out.stat().st_size} bytes)")

