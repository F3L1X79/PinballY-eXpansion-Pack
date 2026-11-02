// ============================================================
// Maintainer's tool, never loaded by PinballY. Paints the warning signs of
// the Error Toast (copper red) and the Warning Toast (amber), a triangle with
// the exclamation mark cut out, as 128 x 128 PNGs with alpha, flat like the
// trophy and the Challenge target.
// Run: node maintainer/error_toast/generate_warning_sign.mjs
// ============================================================

import fs from "node:fs";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";

const SIGNS = [
    { file: "error_warning.png", accent: STEAMBALL_COLORS.errorAccent },
    { file: "warning_sign.png", accent: STEAMBALL_COLORS.warningAccent },
];
const SIZE = 128;
// 4 x 4 samples a pixel, for smooth edges.
const SAMPLES = 4;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const TRUECOLOR_WITH_ALPHA = 6;

const APEX = [64, 10];
const BASE_LEFT = [6, 116];
const BASE_RIGHT = [122, 116];
const BAR = { left: 57, right: 71, top: 42, bottom: 86 };
const DOT = { x: 64, y: 100, radius: 7.5 };

// Which side of the edge from a to b the point lies on.
const side = ([x, y], [ax, ay], [bx, by]) => (bx - ax) * (y - ay) - (by - ay) * (x - ax);

function insideTriangle(point) {
    const sides = [side(point, APEX, BASE_RIGHT), side(point, BASE_RIGHT, BASE_LEFT), side(point, BASE_LEFT, APEX)];
    return sides.every(value => value >= 0) || sides.every(value => value <= 0);
}

function insideMark([x, y]) {
    const inBar = x >= BAR.left && x <= BAR.right && y >= BAR.top && y <= BAR.bottom;
    return inBar || Math.hypot(x - DOT.x, y - DOT.y) <= DOT.radius;
}

// Straight RGBA bytes: the accent everywhere, its coverage in the alpha.
function paint(accent) {
    const rgb = [(accent >>> 16) & 0xFF, (accent >>> 8) & 0xFF, accent & 0xFF];
    const pixels = Buffer.alloc(SIZE * SIZE * 4);
    for (let py = 0; py < SIZE; py++) {
        for (let px = 0; px < SIZE; px++) {
            let covered = 0;
            for (let sy = 0; sy < SAMPLES; sy++) {
                for (let sx = 0; sx < SAMPLES; sx++) {
                    const point = [px + (sx + 0.5) / SAMPLES, py + (sy + 0.5) / SAMPLES];
                    if (insideTriangle(point) && !insideMark(point)) covered++;
                }
            }
            const offset = (py * SIZE + px) * 4;
            [pixels[offset], pixels[offset + 1], pixels[offset + 2]] = rgb;
            pixels[offset + 3] = Math.round(255 * covered / (SAMPLES * SAMPLES));
        }
    }
    return pixels;
}

function chunk(type, data) {
    const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(typeAndData) >>> 0);
    return Buffer.concat([length, typeAndData, crc]);
}

// Each row behind PNG's filter byte 0 (none), deflated.
function encodePng(pixels) {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(SIZE, 0);
    header.writeUInt32BE(SIZE, 4);
    header[8] = 8;
    header[9] = TRUECOLOR_WITH_ALPHA;
    const stride = SIZE * 4;
    const raw = Buffer.alloc((stride + 1) * SIZE);
    for (let y = 0; y < SIZE; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    return Buffer.concat([PNG_SIGNATURE, chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

for (const { file, accent } of SIGNS) {
    const output = fileURLToPath(new URL(`../../assets/images/${file}`, import.meta.url));
    const png = encodePng(paint(accent));
    fs.writeFileSync(output, png);
    console.log(`${output}: ${Math.round(png.length / 1024)} KB.`);
}
