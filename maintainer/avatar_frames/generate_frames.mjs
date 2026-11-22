// ============================================================
// Maintainer's tool, never loaded by PinballY. Paints the Avatar Frames of
// designs.mjs and writes them in assets/images/avatar_frames/ at 384 and
// 192 px, plus a greyed 192 px copy for locked frames.
// Run: node maintainer/avatar_frames/generate_frames.mjs [labels], e.g. 3,7,christmas.
// - The Avatar's box is the middle two thirds.
// ============================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas, writePNG } from "./frame_kit.mjs";
import { FRAMES, HOLIDAY_FRAMES, REWARD_FRAMES } from "./designs.mjs";

const OUTPUT = fileURLToPath(new URL("../../assets/images/avatar_frames/", import.meta.url));
const MASTER = 768;
// Each frame with the label of its files: its tier on two digits, or its id.
const ALL = [
    ...FRAMES.map((frame, index) => ({ ...frame, label: String(index + 1).padStart(2, "0") })),
    ...[...HOLIDAY_FRAMES, ...REWARD_FRAMES].map(frame => ({ ...frame, label: frame.id })),
];
const isAsked = (frame, wanted) => wanted === frame.label || (/^\d+$/.test(wanted) && Number(wanted) === Number(frame.label));
const only = process.argv[2] ? process.argv[2].split(",") : null;
if (only && only.some(wanted => !ALL.some(frame => isAsked(frame, wanted)))) {
    console.error(`Frames go from 1 to ${FRAMES.length}, or ${[...HOLIDAY_FRAMES, ...REWARD_FRAMES].map(frame => frame.id).join(", ")}, comma-separated: ${process.argv[2]}`);
    process.exit(1);
}

// Grey, darker and a little see-through, from straight-alpha RGBA bytes.
function locked(rgba) {
    const out = Buffer.from(rgba);
    for (let p = 0; p < out.length; p += 4) {
        const luma = 0.3 * out[p] + 0.59 * out[p + 1] + 0.11 * out[p + 2];
        const grey = Math.round(luma * 0.5 + 18);
        out[p] = grey;
        out[p + 1] = grey;
        out[p + 2] = Math.round(grey * 1.08);
        out[p + 3] = Math.round(out[p + 3] * 0.85);
    }
    return out;
}

for (const frame of ALL) {
    if (only && !only.some(wanted => isAsked(frame, wanted))) continue;
    const started = Date.now();
    const cv = new Canvas(MASTER);
    frame.draw(cv);
    const big = cv.half();
    const small = big.half();
    big.save(path.join(OUTPUT, `frame_${frame.label}_384.png`));
    small.save(path.join(OUTPUT, `frame_${frame.label}_192.png`));
    writePNG(path.join(OUTPUT, `frame_${frame.label}_192_locked.png`), small.size, small.size, locked(small.toRGBA()));
    console.log(`${frame.label} ${frame.name}: ${Date.now() - started} ms`);
}
