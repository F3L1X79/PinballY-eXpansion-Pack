// ============================================================
// Builds the rank emblems from the originals in sources/: the centre gem of
// each rank recoloured (emerald, sapphire, ruby, topaz) for _plain and _tile,
// and _missing greyed from the recoloured _plain, so it keeps its very shape.
// Run with `node maintainer/rank_emblems/generate_emblems.mjs [outDir]`
// (default assets/images); never by PinballY.
// - Gem diamonds are in _plain's pixels; _tile is a same-scale crop, its offset found by matching.
// ============================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPNG } from "./png_reader.mjs";
import { writePNG, ramp, clamp } from "../avatar_frames/frame_kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCES = path.join(HERE, "sources");
const OUT = process.argv[2] ?? path.join(HERE, "..", "..", "assets", "images");

// From the gem's darkest facet to its glint.
const GEMS = {
    emerald: ramp([[0, "#021f10"], [0.3, "#06603a"], [0.6, "#14a85c"], [0.85, "#7cf0b4"], [1, "#f0fff6"]]),
    sapphire: ramp([[0, "#030a2e"], [0.3, "#0c2690"], [0.6, "#2456e0"], [0.85, "#86aaff"], [1, "#f2f6ff"]]),
    ruby: ramp([[0, "#2a0006"], [0.3, "#82061c"], [0.6, "#d41634"], [0.85, "#ff7484"], [1, "#fff2f4"]]),
    topaz: ramp([[0, "#3a1400"], [0.3, "#a44a04"], [0.6, "#ec8c18"], [0.85, "#ffcc66"], [1, "#fffaea"]]),
};

// Each gem's diamond as top, right, bottom, left tips in _plain's pixels.
const RANKS = [
    { rank: "bronze", gems: [{ color: "emerald", tips: [[128, 97], [145, 121], [128, 149], [111.5, 121]] }] },
    {
        rank: "silver",
        gems: [
            { color: "sapphire", tips: [[129, 98], [149, 125], [128.5, 154], [109, 125]] },
            // The crest's small gem.
            { color: "sapphire", tips: [[130, 64], [136, 72.5], [129.5, 79], [123, 72.5]] },
        ],
    },
    { rank: "gold", gems: [{ color: "ruby", tips: [[128, 100], [147, 124], [128, 152], [110, 124]] }] },
    { rank: "platinum", gems: [{ color: "topaz", tips: [[128, 103], [150, 134.5], [128, 170], [105, 134.5]] }] },
];

// How far the mask stays inside the drawn tips, so the bezel keeps its metal.
const INSET = 0.6;
const SUBSAMPLES = 4;

const luminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function insideConvex(x, y, pts) {
    for (let k = 0; k < pts.length; k++) {
        const [ax, ay] = pts[k];
        const [bx, by] = pts[(k + 1) % pts.length];
        const ex = bx - ax;
        const ey = by - ay;
        // Clockwise tips (y down): inside is on the right of each edge.
        if ((ex * (y - ay) - ey * (x - ax)) / Math.hypot(ex, ey) < INSET) return false;
    }
    return true;
}

function coverage(x, y, pts) {
    let hits = 0;
    for (let sj = 0; sj < SUBSAMPLES; sj++) {
        for (let si = 0; si < SUBSAMPLES; si++) {
            if (insideConvex(x + (si + 0.5) / SUBSAMPLES, y + (sj + 0.5) / SUBSAMPLES, pts)) hits++;
        }
    }
    return hits / (SUBSAMPLES * SUBSAMPLES);
}

// _tile is _plain cropped at the same scale: where _plain's pixel (x, y) is
// in _tile, found by matching the patch around the centre gem.
function cropOffset(plain, tile, [cx, cy]) {
    const PATCH = 24;
    const SEARCH = 48;
    const at = (image, x, y) => (y * image.width + x) * 4;
    let best = { dx: 0, dy: 0, cost: Infinity };
    for (let dy = -SEARCH; dy <= 0; dy++) {
        for (let dx = -SEARCH; dx <= 0; dx++) {
            let cost = 0;
            for (let j = -PATCH; j < PATCH && cost < best.cost; j++) {
                for (let i = -PATCH; i < PATCH; i++) {
                    const p = at(plain, cx + i, cy + j);
                    const t = at(tile, cx + i + dx, cy + j + dy);
                    for (let k = 0; k < 3; k++) cost += Math.abs(plain.rgba[p + k] - tile.rgba[t + k]);
                }
            }
            if (cost < best.cost) best = { dx, dy, cost };
        }
    }
    return best;
}

// The gem's own darkest and brightest, so each ramp spans its whole facets.
function lumaRange(image, pts) {
    let [low, high] = [1, 0];
    for (let j = 0; j < image.height; j++) {
        for (let i = 0; i < image.width; i++) {
            if (coverage(i, j, pts) < 1) continue;
            const s = (j * image.width + i) * 4;
            const y = luminance(image.rgba[s], image.rgba[s + 1], image.rgba[s + 2]) / 255;
            low = Math.min(low, y);
            high = Math.max(high, y);
        }
    }
    return { low, high };
}

function recolourGem(image, pts, gemRamp) {
    const { low, high } = lumaRange(image, pts);
    for (let j = 0; j < image.height; j++) {
        for (let i = 0; i < image.width; i++) {
            const cover = coverage(i, j, pts);
            if (cover === 0) continue;
            const s = (j * image.width + i) * 4;
            const [r, g, b] = [image.rgba[s], image.rgba[s + 1], image.rgba[s + 2]];
            const t = clamp((luminance(r, g, b) / 255 - low) / (high - low));
            const gem = gemRamp(t);
            image.rgba[s] = Math.round(r + (gem[0] * 255 - r) * cover);
            image.rgba[s + 1] = Math.round(g + (gem[1] * 255 - g) * cover);
            image.rgba[s + 2] = Math.round(b + (gem[2] * 255 - b) * cover);
        }
    }
}

// Cold dark steel, a little flatter than the original: nothing left to earn shines.
function greyed(image) {
    const rgba = Buffer.from(image.rgba);
    for (let s = 0; s < rgba.length; s += 4) {
        const y = luminance(rgba[s], rgba[s + 1], rgba[s + 2]) / 255;
        const v = clamp(0.08 + (0.5 + (y - 0.5) * 0.85) * 0.78);
        rgba[s] = Math.round(v * 0.97 * 255);
        rgba[s + 1] = Math.round(v * 0.99 * 255);
        rgba[s + 2] = Math.round(clamp(v * 1.04) * 255);
    }
    return { ...image, rgba };
}

const save = (name, image) => writePNG(path.join(OUT, name), image.width, image.height, image.rgba);

for (const { rank, gems } of RANKS) {
    const plain = readPNG(path.join(SOURCES, `rank_${rank}_plain.png`));
    const tile = readPNG(path.join(SOURCES, `rank_${rank}_tile.png`));
    // Matched on the original pixels, before any gem is recoloured.
    const { dx, dy, cost } = cropOffset(plain, tile, [128, 128]);
    console.log(`${rank}: _tile is _plain moved by (${dx}, ${dy}), mean difference ${(cost / (48 * 48 * 3)).toFixed(1)}`);
    const toTile = ([x, y]) => [x + dx, y + dy];
    for (const { color, tips } of gems) {
        recolourGem(plain, tips, GEMS[color]);
        recolourGem(tile, tips.map(toTile), GEMS[color]);
    }
    save(`rank_${rank}_plain.png`, plain);
    save(`rank_${rank}_tile.png`, tile);
    save(`rank_${rank}_missing.png`, greyed(plain));
}
