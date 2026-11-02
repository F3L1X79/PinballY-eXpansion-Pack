// ============================================================
// Builds the rank emblems from the originals in sources/: the centre gem of
// each rank recoloured (emerald, amethyst, ruby, topaz) for _plain and _tile,
// each gem enlarged, bronze's upper feathers cut out, and _missing greyed
// from the finished _plain, so it keeps its very shape. Run with `node maintainer/rank_emblems/generate_emblems.mjs [outDir]`
// (default assets/images, plus the roadmap's copies); never by PinballY.
// - Gem diamonds are in _plain's pixels; _tile is a same-scale crop, its offset found by matching.
// ============================================================

import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPNG } from "./png_reader.mjs";
import { writePNG, ramp, clamp } from "../avatar_frames/frame_kit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCES = path.join(HERE, "sources");
const OUT = process.argv[2] ?? path.join(HERE, "..", "..", "assets", "images");
const ROADMAP_OUT = process.argv[2] ?? path.join(HERE, "..", "..", "docs", "roadmap", "emblems");
// The roadmap's emblems are _plain and _missing without this margin all around.
const ROADMAP_MARGIN = 22;

// From the gem's darkest facet to its glint.
const GEMS = {
    emerald: ramp([[0, "#011a08"], [0.35, "#03591f"], [0.65, "#07963a"], [0.9, "#2fd65e"], [1, "#d4ffdc"]]),
    amethyst: ramp([[0, "#2c1052"], [0.3, "#6c30b4"], [0.6, "#a662ec"], [0.85, "#dab6ff"], [1, "#fbf6ff"]]),
    ruby: ramp([[0, "#2a0006"], [0.3, "#82061c"], [0.6, "#d41634"], [0.85, "#ff7484"], [1, "#fff2f4"]]),
    topaz: ramp([[0, "#5a2404"], [0.3, "#c86c10"], [0.6, "#f6a832"], [0.85, "#ffdc8c"], [1, "#fffcf0"]]),
};

// The bronze's upper left wing feather in _plain's pixels, along the groove above the next feather.
const BRONZE_UPPER_FEATHER = [
    [42, 50], [95, 50], [85.8, 90.8], [87.3, 95.4], [88.8, 99.2], [93.8, 105.4], [93.8, 110.8], [91.5, 117.7], [88.8, 123.1],
    [85, 123], [78.5, 118.7], [69, 114.2], [60.5, 108.7], [54.5, 104], [49.6, 100], [46.5, 95.4], [43.8, 89.2], [42, 80],
];
const mirrored = (pts) => pts.map(([x, y]) => [256 - x, y]);

// Each gem's diamond as top, right, bottom, left tips in _plain's pixels, and
// drawnTips when it is enlarged from a smaller drawn gem.
const RANKS = [
    {
        rank: "bronze",
        // Without its upper feathers, greyed bronze no longer reads as greyed silver.
        removed: [BRONZE_UPPER_FEATHER, mirrored(BRONZE_UPPER_FEATHER)],
        gems: [{
            color: "emerald",
            tips: [[128, 94], [151, 121], [128, 151.5], [105, 121]],
            drawnTips: [[128, 96.5], [147, 121], [128, 151], [109.5, 121]],
        }],
    },
    {
        rank: "silver",
        gems: [
            {
                color: "amethyst",
                tips: [[129, 98], [153, 125], [128.5, 154], [105, 125]],
                drawnTips: [[129, 98], [149, 125], [128.5, 154], [109, 125]],
            },
            // The crest's small gem.
            { color: "amethyst", tips: [[130, 64], [136, 72.5], [129.5, 79], [123, 72.5]] },
        ],
    },
    {
        rank: "gold",
        gems: [{
            color: "ruby",
            tips: [[128, 98.5], [152.5, 124], [128, 154], [104.5, 124]],
            drawnTips: [[128, 98.5], [148.5, 124], [128, 154], [108.5, 124]],
        }],
    },
    {
        rank: "platinum",
        gems: [{
            color: "topaz",
            tips: [[128, 103], [154, 134.5], [128, 170], [101, 134.5]],
            drawnTips: [[128, 103], [150, 134.5], [128, 170], [105, 134.5]],
        }],
    },
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

// Even-odd rule, for the concave shapes cut out of an emblem.
function insidePolygon(x, y, pts) {
    let inside = false;
    for (let k = 0; k < pts.length; k++) {
        const [ax, ay] = pts[k];
        const [bx, by] = pts[(k + 1) % pts.length];
        if ((ay > y) !== (by > y) && x < ax + ((y - ay) / (by - ay)) * (bx - ax)) inside = !inside;
    }
    return inside;
}

function coverage(x, y, pts, inside = insideConvex) {
    let hits = 0;
    for (let sj = 0; sj < SUBSAMPLES; sj++) {
        for (let si = 0; si < SUBSAMPLES; si++) {
            if (inside(x + (si + 0.5) / SUBSAMPLES, y + (sj + 0.5) / SUBSAMPLES, pts)) hits++;
        }
    }
    return hits / (SUBSAMPLES * SUBSAMPLES);
}

function erase(image, pts) {
    for (let j = 0; j < image.height; j++) {
        for (let i = 0; i < image.width; i++) {
            const s = (j * image.width + i) * 4;
            image.rgba[s + 3] = Math.round(image.rgba[s + 3] * (1 - coverage(i, j, pts, insidePolygon)));
        }
    }
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

// Bilinear luminance at the continuous point (x, y), pixels centred on .5.
function lumaAt(image, x, y) {
    const [fx, fy] = [x - 0.5, y - 0.5];
    const [x0, y0] = [Math.floor(fx), Math.floor(fy)];
    const luma = (i, j) => {
        const s = (j * image.width + i) * 4;
        return luminance(image.rgba[s], image.rgba[s + 1], image.rgba[s + 2]);
    };
    const top = luma(x0, y0) + (luma(x0 + 1, y0) - luma(x0, y0)) * (fx - x0);
    const bottom = luma(x0, y0 + 1) + (luma(x0 + 1, y0 + 1) - luma(x0, y0 + 1)) * (fx - x0);
    return top + (bottom - top) * (fy - y0);
}

// Where a point of the diamond `to` was drawn in the diamond `from`, quadrant by
// quadrant around the crossing of its diagonals (tips aligned on the axes).
function drawnPoint(x, y, to, from) {
    const [toTop, toRight, toBottom, toLeft] = to;
    const [fromTop, fromRight, fromBottom, fromLeft] = from;
    const [dx, dy] = [x - toTop[0], y - toLeft[1]];
    const xScale = dx < 0 ? (fromTop[0] - fromLeft[0]) / (toTop[0] - toLeft[0]) : (fromRight[0] - fromTop[0]) / (toRight[0] - toTop[0]);
    const yScale = dy < 0 ? (fromLeft[1] - fromTop[1]) / (toLeft[1] - toTop[1]) : (fromBottom[1] - fromLeft[1]) / (toBottom[1] - toLeft[1]);
    return [fromTop[0] + dx * xScale, fromLeft[1] + dy * yScale];
}

function recolourGem(image, pts, gemRamp, drawnPts = pts) {
    const { low, high } = lumaRange(image, drawnPts);
    // Read from a copy: an enlarged gem paints over the pixels it still has to read.
    const drawn = { ...image, rgba: Buffer.from(image.rgba) };
    for (let j = 0; j < image.height; j++) {
        for (let i = 0; i < image.width; i++) {
            const cover = coverage(i, j, pts);
            if (cover === 0) continue;
            const s = (j * image.width + i) * 4;
            const [r, g, b] = [image.rgba[s], image.rgba[s + 1], image.rgba[s + 2]];
            const [sx, sy] = drawnPoint(i + 0.5, j + 0.5, pts, drawnPts);
            const t = clamp((lumaAt(drawn, sx, sy) / 255 - low) / (high - low));
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

function saveForRoadmap(name, image) {
    const side = image.width - 2 * ROADMAP_MARGIN;
    const rgba = Buffer.alloc(side * side * 4);
    for (let j = 0; j < side; j++) {
        const from = ((j + ROADMAP_MARGIN) * image.width + ROADMAP_MARGIN) * 4;
        image.rgba.copy(rgba, j * side * 4, from, from + side * 4);
    }
    writePNG(path.join(ROADMAP_OUT, name), side, side, rgba);
}

for (const { rank, gems, removed = [] } of RANKS) {
    const plain = readPNG(path.join(SOURCES, `rank_${rank}_plain.png`));
    const tile = readPNG(path.join(SOURCES, `rank_${rank}_tile.png`));
    // Matched on the original pixels, before any gem is recoloured.
    const { dx, dy, cost } = cropOffset(plain, tile, [128, 128]);
    console.log(`${rank}: _tile is _plain moved by (${dx}, ${dy}), mean difference ${(cost / (48 * 48 * 3)).toFixed(1)}`);
    const toTile = ([x, y]) => [x + dx, y + dy];
    for (const { color, tips, drawnTips = tips } of gems) {
        recolourGem(plain, tips, GEMS[color], drawnTips);
        recolourGem(tile, tips.map(toTile), GEMS[color], drawnTips.map(toTile));
    }
    for (const shape of removed) {
        erase(plain, shape);
        erase(tile, shape.map(toTile));
    }
    save(`rank_${rank}_plain.png`, plain);
    save(`rank_${rank}_tile.png`, tile);
    const missing = greyed(plain);
    save(`rank_${rank}_missing.png`, missing);
    saveForRoadmap(`${rank}.png`, plain);
    saveForRoadmap(`${rank}_missing.png`, missing);
}
