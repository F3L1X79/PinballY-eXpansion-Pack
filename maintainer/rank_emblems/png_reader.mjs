// ============================================================
// Reads an 8-bit RGBA, non-interlaced PNG into { width, height, rgba } in
// plain Node.js, for the maintainer scripts that rework existing images.
// Never run by PinballY.
// - Only colour type 6 at 8 bits: anything else throws rather than misreads.
// ============================================================

import zlib from "node:zlib";
import fs from "node:fs";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    return pb <= pc ? b : c;
}

export function readPNG(file) {
    const data = fs.readFileSync(file);
    if (!data.subarray(0, 8).equals(SIGNATURE)) throw new Error(`Not a PNG: ${file}`);
    let width = 0;
    let height = 0;
    const idat = [];
    for (let at = 8; at < data.length;) {
        const length = data.readUInt32BE(at);
        const type = data.toString("ascii", at + 4, at + 8);
        const body = data.subarray(at + 8, at + 8 + length);
        if (type === "IHDR") {
            width = body.readUInt32BE(0);
            height = body.readUInt32BE(4);
            if (body[8] !== 8 || body[9] !== 6 || body[12] !== 0) throw new Error(`Only 8-bit RGBA non-interlaced PNG: ${file}`);
        } else if (type === "IDAT") {
            idat.push(body);
        } else if (type === "IEND") {
            break;
        }
        at += 12 + length;
    }
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = width * 4;
    const rgba = Buffer.alloc(stride * height);
    for (let j = 0; j < height; j++) {
        const filter = raw[j * (stride + 1)];
        const line = j * (stride + 1) + 1;
        for (let i = 0; i < stride; i++) {
            const x = raw[line + i];
            const a = i >= 4 ? rgba[j * stride + i - 4] : 0;
            const b = j > 0 ? rgba[(j - 1) * stride + i] : 0;
            const c = i >= 4 && j > 0 ? rgba[(j - 1) * stride + i - 4] : 0;
            const predicted = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter];
            if (predicted === undefined) throw new Error(`Unknown PNG filter ${filter}: ${file}`);
            rgba[j * stride + i] = (x + predicted) & 255;
        }
    }
    return { width, height, rgba };
}
