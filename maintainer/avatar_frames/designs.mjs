// ============================================================
// The Avatar Frames (Collection Tiers, Holiday Frames, then other rewards'), one theme each, painted with frame_kit.mjs
// around the Avatar's image box [-1, 1]: each keeps the bottom-right corner
// light, where the Player Level pip sits. A maintainer's tool, run by
// generate_frames.mjs, never loaded by PinballY.
// ============================================================

import {
    TAU, clamp, mix, smoothstep, rad, hex, mixc, ramp, RAMPS, WHITE, fbm, hash, rng,
    sdCircle, sdBox, sdChamferBox, sdSegment, sdPolygon, bboxOf, toLocal, placed, starPoints, leafPoints, bezier, stroke,
    flat, metal, gem, sphere, sparkle,
} from "./frame_kit.mjs";

const HOLE = 0.965;
const holeSdf = (x, y) => sdBox(x, y, 0, 0, HOLE, HOLE, 0.035);
const B = h => [-h, -h, h, h];
const around = (cx, cy, r) => [cx - r, cy - r, cx + r, cy + r];
const circle = (cx, cy, r) => (x, y) => sdCircle(x, y, cx, cy, r);
// The band from the hole out to a rounded square of half-size outer.
const band = (outer, rOut) => (x, y) => Math.max(sdBox(x, y, 0, 0, outer, outer, rOut), -holeSdf(x, y));
// A line along a rounded square, w its half-width.
const tube = (h, r, w) => (x, y) => Math.abs(sdBox(x, y, 0, 0, h, h, r)) - w;
const neon = (color, w) => (x, y, d) => mixc(color, WHITE, 0.12 + 0.8 * clamp(-d / w) ** 2);
const LIGHT_ANGLE = Math.atan2(-0.62, -0.42);
const facetLight = normalAngle => 0.5 + 0.32 * Math.cos(normalAngle - LIGHT_ANGLE);
const isPipCorner = (x, y) => x > 0.55 && y > 0.55;

// Along (s) and across (q, from the hole's edge outward) the band side
// the point is on.
function bandCoords(x, y) {
    return Math.abs(y) >= Math.abs(x)
        ? { s: x, q: Math.abs(y) - HOLE }
        : { s: y, q: Math.abs(x) - HOLE };
}

// A point on a rounded square of half-size h and corner radius r, s from 0
// to 1 clockwise from the left end of the top side, with its outward
// normal (nx, ny) and its tangent (tx, ty).
function onRoundSquare(s, h, r) {
    const straight = 2 * (h - r);
    const arc = (Math.PI * r) / 2;
    let d = (((s % 1) + 1) % 1) * 4 * (straight + arc);
    const starts = [[-h + r, -h], [h, -h + r], [h - r, h], [-h, h - r]];
    const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const centres = [[h - r, -h + r], [h - r, h - r], [-h + r, h - r], [-h + r, -h + r]];
    for (let k = 0; k < 4; k++) {
        if (d <= straight) {
            const [sx, sy] = starts[k];
            const [dx, dy] = dirs[k];
            return { x: sx + dx * d, y: sy + dy * d, nx: dy, ny: -dx, tx: dx, ty: dy };
        }
        d -= straight;
        if (d <= arc) {
            const a = (k - 1) * (Math.PI / 2) + d / r;
            const [cx, cy] = centres[k];
            return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a), tx: -Math.sin(a), ty: Math.cos(a) };
        }
        d -= arc;
    }
    return { x: -h + r, y: -h, nx: 0, ny: -1, tx: 1, ty: 0 };
}

// A polygon painted with paint(sdf) (or a flat colour), with an optional
// drop shadow; returns its distance function.
function polygon(cv, pts, paint, { shadow = null, mode = "over", opacity = 1 } = {}) {
    const sdf = (x, y) => sdPolygon(x, y, pts);
    if (shadow) cv.shadow(sdf, { bbox: bboxOf(pts, 0.1), ...shadow });
    cv.shape(sdf, typeof paint === "function" ? paint(sdf) : flat(paint), { bbox: bboxOf(pts, 0.03), mode, opacity });
    return sdf;
}

function dot(cv, x, y, r, color, glowRadius = 0, glowStrength = 0.6) {
    if (glowRadius > 0) cv.glow(circle(x, y, r), color, glowRadius, glowStrength, { bbox: around(x, y, r + glowRadius) });
    cv.shape(circle(x, y, r), (px, py) => mixc(color, WHITE, 0.6 * clamp(1 - Math.hypot(px - x, py - y) / r)), { bbox: around(x, y, r + 0.01) });
}

function rivet(cv, x, y, r, colorRamp) {
    const f = circle(x, y, r);
    cv.shadow(f, { bbox: around(x, y, r * 3), blur: r * 1.3, dx: r * 0.3, dy: r * 0.5, opacity: 0.55 });
    cv.shape(f, metal(f, colorRamp, { bevel: r, contrast: 1.6, spec: 0.9, shininess: 22 }), { bbox: around(x, y, r * 1.5) });
}

// A gem of any outline, with a dark setting around it.
function setGem(cv, sdf, bbox, cx, cy, r, color, { setting = RAMPS.gold, settingWidth = 0.014, facets = 8, glowColor = null } = {}) {
    const outer = (x, y) => sdf(x, y) - settingWidth;
    cv.shadow(outer, { bbox, opacity: 0.5, blur: 0.04 });
    if (setting) cv.shape(outer, metal(outer, setting, { bevel: settingWidth, contrast: 1.5 }), { bbox });
    if (glowColor) cv.glow(sdf, glowColor, r * 1.2, 0.55, { bbox: [bbox[0] - r, bbox[1] - r, bbox[2] + r, bbox[3] + r] });
    cv.shape(sdf, gem(cx, cy, r, color, { sdf, facets }), { bbox });
}

// A lens shape (two arcs) of half-length a along angle and half-width b.
function sdLens(x, y, cx, cy, a, b, angle = 0) {
    const [u, v] = toLocal(x, y, cx, cy, angle);
    const R = (a * a + b * b) / (2 * b);
    return Math.max(sdCircle(u, v, 0, R - b, R), sdCircle(u, v, 0, -(R - b), R));
}

// An ellipse's approximate distance (Inigo Quilez's two-gradient form).
function sdEllipse(u, v, a, b) {
    const k0 = Math.hypot(u / a, v / b);
    const k1 = Math.hypot(u / (a * a), v / (b * b));
    return k1 === 0 ? -Math.min(a, b) : (k0 * (k0 - 1)) / k1;
}

// ============================================================
// Arcade Neon: two neon tubes on a dark synthwave grid, a neon star
// on top, an equalizer marquee below, pellets along the band.
// ============================================================
function neonArcade(cv) {
    const PINK = hex("#ff2bd6");
    const CYAN = hex("#27e8ff");
    const YELLOW = hex("#ffe24a");
    const plate = band(1.16, 0.2);
    cv.shadow(plate, { bbox: B(1.34), blur: 0.07, opacity: 0.6 });
    cv.shape(plate, (x, y) => {
        const fx = Math.abs((((x * 11) % 1) + 1) % 1 - 0.5);
        const fy = Math.abs((((y * 11) % 1) + 1) % 1 - 0.5);
        const line = Math.max(smoothstep(0.38, 0.5, fx), smoothstep(0.38, 0.5, fy));
        const c = mixc("#13061f", "#5a167f", line * 0.75);
        return [c[0], c[1], c[2], 0.96];
    }, { bbox: B(1.2) });
    // Arcade pellets between the tubes.
    for (let i = 0; i < 46; i += 1) {
        const p = onRoundSquare((i + 0.5) / 46, 1.037, 0.1);
        if ((Math.abs(p.x) < 0.3 && p.y < 0) || (Math.abs(p.x) < 0.5 && p.y > 0) || isPipCorner(p.x, p.y)) continue;
        dot(cv, p.x, p.y, i % 9 === 4 ? 0.022 : 0.011, YELLOW, 0.04, 0.45);
    }
    const outer = tube(1.09, 0.15, 0.022);
    cv.glow(outer, PINK, 0.2, 0.9, { bbox: B(1.42) });
    cv.shape(outer, neon(PINK, 0.022), { bbox: B(1.14) });
    const inner = tube(0.995, 0.06, 0.012);
    cv.glow(inner, CYAN, 0.1, 0.75, { bbox: B(1.12) });
    cv.shape(inner, neon(CYAN, 0.012), { bbox: B(1.03) });

    // The star badge on top.
    const sx = 0;
    const sy = -1.17;
    const disc = circle(sx, sy, 0.22);
    cv.shadow(disc, { bbox: around(sx, sy, 0.36), opacity: 0.6 });
    cv.shape(disc, (x, y) => mixc("#2a0b45", "#0d0418", clamp(Math.hypot(x - sx, y - sy) / 0.22)), { bbox: around(sx, sy, 0.24) });
    const discTube = (x, y) => Math.abs(sdCircle(x, y, sx, sy, 0.205)) - 0.013;
    cv.glow(discTube, PINK, 0.12, 0.8, { bbox: around(sx, sy, 0.36) });
    cv.shape(discTube, neon(PINK, 0.013), { bbox: around(sx, sy, 0.24) });
    const star = starPoints(sx, sy + 0.01, 0.15, 0.065, 5);
    const starSdf = (x, y) => sdPolygon(x, y, star);
    cv.glow(starSdf, YELLOW, 0.1, 0.55, { bbox: around(sx, sy, 0.3), inside: 0.35 });
    const starTube = (x, y) => Math.abs(starSdf(x, y)) - 0.011;
    cv.shape(starTube, neon(YELLOW, 0.011), { bbox: around(sx, sy, 0.2) });

    // The equalizer marquee below.
    const mx = 0;
    const my = 1.16;
    const marquee = (x, y) => sdBox(x, y, mx, my, 0.38, 0.13, 0.05);
    cv.shadow(marquee, { bbox: [mx - 0.5, my - 0.25, mx + 0.5, my + 0.3], opacity: 0.6 });
    cv.shape(marquee, flat("#0c0416"), { bbox: [mx - 0.42, my - 0.16, mx + 0.42, my + 0.16] });
    const bars = [0.45, 0.75, 0.55, 0.95, 0.7, 0.85, 0.5, 0.65, 0.35];
    bars.forEach((h, i) => {
        const bx = mx - 0.28 + i * 0.07;
        const segments = Math.round(h * 7);
        for (let k = 0; k < segments; k++) {
            const y0 = my + 0.085 - k * 0.026;
            const f = (x, y) => sdBox(x, y, bx, y0, 0.022, 0.009, 0.003);
            const color = mixc(CYAN, k < 4 ? PINK : YELLOW, k < 4 ? k / 4 : (k - 4) / 3);
            cv.glow(f, color, 0.03, 0.5, { bbox: around(bx, y0, 0.06) });
            cv.shape(f, () => mixc(color, WHITE, 0.25), { bbox: around(bx, y0, 0.03) });
        }
    });
    const marqueeTube = (x, y) => Math.abs(marquee(x, y)) - 0.01;
    cv.glow(marqueeTube, CYAN, 0.08, 0.7, { bbox: [mx - 0.5, my - 0.25, mx + 0.5, my + 0.25] });
    cv.shape(marqueeTube, neon(CYAN, 0.01), { bbox: [mx - 0.41, my - 0.15, mx + 0.41, my + 0.15] });

    sparkle(cv, -1.25, -1.24, 0.11, CYAN);
    sparkle(cv, 1.22, -1.28, 0.08, YELLOW);
    sparkle(cv, -1.33, 0.35, 0.06, PINK);
    sparkle(cv, 1.32, -0.35, 0.05, WHITE);
}

// ============================================================
// Steam and Gears: a brass band with copper trim and rivets,
// meshing gears, a pressure gauge, a lit Edison bulb and a copper pipe.
// ============================================================
function gear(cv, cx, cy, r, teeth, depth, colorRamp, phase = 0) {
    const sector = TAU / teeth;
    const body = (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const rr = Math.hypot(dx, dy);
        let a = Math.atan2(dy, dx) - phase;
        a = (((a % sector) + sector) % sector) - sector / 2;
        const tooth = smoothstep(sector * 0.34, sector * 0.2, Math.abs(a));
        const outer = rr - (r + depth * tooth);
        const ws = TAU / 5;
        let b = Math.atan2(dy, dx) - phase;
        b = (((b % ws) + ws) % ws) - ws / 2;
        const window = Math.hypot(rr * Math.cos(b) - r * 0.55, rr * Math.sin(b)) - r * 0.2;
        const axle = rr - r * 0.11;
        return Math.max(outer, -window, -axle);
    };
    const bb = around(cx, cy, r + depth + 0.04);
    cv.shadow(body, { bbox: around(cx, cy, r + depth + 0.12), opacity: 0.6, blur: 0.05 });
    cv.shape(body, metal(body, colorRamp, {
        bevel: 0.028,
        texture: (x, y) => 0.06 * (fbm(x * 30, y * 30, 2) - 0.5) - 0.1 * smoothstep(r * 0.86, r * 0.76, Math.hypot(x - cx, y - cy)),
    }), { bbox: bb });
    const hub = (x, y) => Math.max(sdCircle(x, y, cx, cy, r * 0.25), -sdCircle(x, y, cx, cy, r * 0.09));
    cv.shape(hub, metal(hub, RAMPS.brass, { bevel: r * 0.1, contrast: 1.5 }), { bbox: bb });
}

function steampunk(cv) {
    const ring = band(1.14, 0.06);
    cv.shadow(ring, { bbox: B(1.3), opacity: 0.6 });
    cv.shape(ring, metal(ring, RAMPS.brass, { bevel: 0.075, texture: (x, y) => 0.07 * (fbm(x * 26, y * 26, 3) - 0.5) }), { bbox: B(1.18) });
    const trim = tube(0.99, 0.04, 0.016);
    cv.shape(trim, metal(trim, RAMPS.copper, { bevel: 0.016, contrast: 1.6 }), { bbox: B(1.03) });
    for (let i = 0; i < 44; i++) {
        const p = onRoundSquare((i + 0.5) / 44, 1.075, 0.06);
        if ((Math.abs(p.x) < 0.3 && p.y < 0) || (p.x < -0.55 && p.y < -0.55) || (p.x > 0.55 && p.y < -0.55) || (p.x < -0.6 && p.y > 0.6) || p.x > 1.05) continue;
        rivet(cv, p.x, p.y, 0.02, RAMPS.copper);
    }

    // A copper pipe down the right side, from the gauge to a valve.
    const pipe = (x, y) => sdSegment(x, y, 1.21, -0.8, 1.21, 0.42) - 0.036;
    cv.shadow(pipe, { bbox: [1.1, -0.9, 1.4, 0.6], opacity: 0.5 });
    cv.shape(pipe, metal(pipe, RAMPS.copper, { bevel: 0.036, contrast: 1.5 }), { bbox: [1.15, -0.85, 1.27, 0.48] });
    for (const jy of [-0.45, -0.05, 0.3]) {
        const joint = (x, y) => sdBox(x, y, 1.21, jy, 0.048, 0.022, 0.008);
        cv.shape(joint, metal(joint, RAMPS.brass, { bevel: 0.02, contrast: 1.5 }), { bbox: around(1.21, jy, 0.07) });
    }
    const valve = (x, y) => Math.abs(sdCircle(x, y, 1.21, 0.5, 0.085)) - 0.016;
    const spokes = (x, y) => Math.min(sdSegment(x, y, 1.135, 0.5, 1.285, 0.5), sdSegment(x, y, 1.21, 0.425, 1.21, 0.575)) - 0.013;
    const wheel = (x, y) => Math.min(valve(x, y), spokes(x, y), sdCircle(x, y, 1.21, 0.5, 0.025));
    cv.shadow(wheel, { bbox: around(1.21, 0.5, 0.17) });
    cv.shape(wheel, metal(wheel, RAMPS.brass, { bevel: 0.016, contrast: 1.5 }), { bbox: around(1.21, 0.5, 0.11) });
    const hubCap = circle(1.21, 0.5, 0.028);
    cv.shape(hubCap, metal(hubCap, ramp([[0, "#1a0202"], [0.4, "#6e0d0d"], [0.6, "#b3201c"], [0.8, "#f07a5a"], [1, "#fff"]]), { bevel: 0.028, contrast: 1.5 }), { bbox: around(1.21, 0.5, 0.04) });
    // Steam from the valve.
    cv.field((x, y) => {
        // A plume rising from the valve, widening as it goes.
        const rise = clamp((0.42 - y) / 0.75);
        const centre = 1.32 + 0.1 * rise + 0.03 * Math.sin(y * 9);
        const width = 0.035 + 0.11 * rise;
        const d = Math.abs(x - centre) / width;
        if (d > 1 || y > 0.46 || y < -0.35) return null;
        const n = fbm(x * 9, y * 7 - 4, 4);
        return [0.93, 0.95, 0.98, 0.42 * (1 - d * d) * (1 - rise) * smoothstep(0.35, 0.75, n + 0.2 * (1 - rise))];
    }, { bbox: [1.2, -0.38, 1.5, 0.48] });

    gear(cv, -0.62, -1.24, 0.13, 9, 0.042, RAMPS.copper, 0.31);
    gear(cv, -1.02, -1.0, 0.25, 12, 0.055, RAMPS.brass, 0.05);
    gear(cv, -1.12, 0.96, 0.19, 10, 0.045, RAMPS.copper, 0.2);

    // The pressure gauge.
    const gx = 1.0;
    const gy = -1.0;
    const bezel = circle(gx, gy, 0.255);
    cv.shadow(bezel, { bbox: around(gx, gy, 0.36), opacity: 0.6 });
    cv.shape(bezel, metal(bezel, RAMPS.brass, { bevel: 0.06, contrast: 1.4 }), { bbox: around(gx, gy, 0.27) });
    const face = circle(gx, gy, 0.195);
    cv.shape(face, (x, y) => mixc("#fbf3dc", "#b9a678", clamp(Math.hypot(x - gx, y - gy) / 0.195) ** 2), { bbox: around(gx, gy, 0.2) });
    const red = (x, y) => {
        const dx = x - gx;
        const dy = y - gy;
        const rr = Math.hypot(dx, dy);
        let diff = Math.atan2(dy, dx) - rad(18);
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        return Math.max(Math.abs(rr - 0.163) - 0.013, (Math.abs(diff) - rad(28)) * rr);
    };
    cv.shape(red, flat("#c8261d"), { bbox: around(gx, gy, 0.2) });
    for (let i = 0; i <= 10; i++) {
        const a = rad(135 + i * 27);
        const r0 = i % 5 === 0 ? 0.12 : 0.145;
        const seg = (x, y) => sdSegment(x, y, gx + r0 * Math.cos(a), gy + r0 * Math.sin(a), gx + 0.178 * Math.cos(a), gy + 0.178 * Math.sin(a)) - (i % 5 === 0 ? 0.008 : 0.005);
        cv.shape(seg, flat("#2b1d10"), { bbox: around(gx, gy, 0.2) });
    }
    const needle = placed([[-0.035, -0.013], [0.16, 0], [-0.035, 0.013]], gx, gy, rad(-25));
    polygon(cv, needle, "#a3120e", { shadow: { blur: 0.02, opacity: 0.4 } });
    const cap = circle(gx, gy, 0.026);
    cv.shape(cap, metal(cap, RAMPS.brass, { bevel: 0.026, contrast: 1.6 }), { bbox: around(gx, gy, 0.04) });
    cv.field((x, y) => {
        const inFace = sdCircle(x, y, gx, gy, 0.19);
        const glint = sdCircle(x, y, gx - 0.07, gy - 0.08, 0.13);
        if (inFace > 0 || glint > 0) return null;
        return [1, 1, 1, 0.28 * clamp(-glint / 0.13)];
    }, { bbox: around(gx, gy, 0.2) });

    // The lit Edison bulb on top.
    const bx = 0;
    const by = -1.29;
    const base = (x, y) => sdBox(x, y, bx, -1.135, 0.07, 0.05, 0.012);
    cv.shadow(base, { bbox: around(bx, -1.13, 0.16) });
    cv.shape(base, metal(base, RAMPS.brass, { bevel: 0.03, texture: (x, y) => 0.14 * Math.sin(y * 220) }), { bbox: around(bx, -1.135, 0.09) });
    const glass = (x, y) => Math.min(sdCircle(x, y, bx, by, 0.125), sdBox(x, y, bx, -1.2, 0.052, 0.04, 0.02));
    cv.glow(glass, "#ffae3d", 0.24, 0.6, { bbox: around(bx, by, 0.42) });
    cv.shape(glass, (x, y, d) => {
        const c = mixc("#fff1c4", "#ff9d2e", clamp(Math.hypot(x - bx, y - by) / 0.13));
        return [c[0], c[1], c[2], mix(0.9, 0.42, clamp(-d / 0.03))];
    }, { bbox: around(bx, by, 0.15) });
    const filament = stroke([[-0.04, -1.2], [-0.032, -1.29], [-0.016, -1.25], [0, -1.31], [0.016, -1.25], [0.032, -1.29], [0.04, -1.2]], 0.005);
    cv.glow(filament.sdf, "#ffd27a", 0.07, 0.9, { bbox: around(bx, by, 0.16) });
    cv.shape(filament.sdf, flat("#fffbe6"), { bbox: filament.bbox });
    cv.field((x, y) => {
        const g = sdCircle(x, y, bx - 0.05, by - 0.05, 0.04);
        return g < 0 ? [1, 1, 1, 0.55 * clamp(-g / 0.04)] : null;
    }, { bbox: around(bx - 0.05, by - 0.05, 0.05) });
}

// ============================================================
// Enchanted Forest: a gnarled wooden band, winding vines with leaves,
// flowers, toadstools and fireflies.
// ============================================================
const WOOD = ramp([[0, "#140a03"], [0.28, "#43260f"], [0.5, "#734520"], [0.68, "#9f6b38"], [0.84, "#cf9f64"], [1, "#f4d8a5"]]);
const LEAF = ramp([[0, "#0a2a0e"], [0.35, "#1f6a27"], [0.6, "#4aa93a"], [0.8, "#9ad85a"], [1, "#e6ffb0"]]);

function leaf(cv, x, y, angle, length, width, tint = 0) {
    const pts = placed(leafPoints(length, width, { peak: 0.4 }), x, y, angle);
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.shadow(sdf, { bbox: bboxOf(pts, 0.06), blur: 0.03, opacity: 0.4 });
    cv.shape(sdf, (px, py, d) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        const side = v < 0 ? 0.62 : 0.45;
        const vein = smoothstep(0.006, 0, Math.abs(v)) * 0.25 * (1 - u / length);
        const edge = smoothstep(0.012, 0, -d) * -0.12;
        return LEAF(side + tint + vein + edge + 0.1 * (1 - u / length));
    }, { bbox: bboxOf(pts, 0.02) });
}

function flower(cv, x, y, r, petal, heart, petals = 5, angle = 0) {
    const sdf = (px, py) => {
        const dx = px - x;
        const dy = py - y;
        const a = Math.atan2(dy, dx) - angle;
        const shape = 0.5 + 0.5 * Math.abs(Math.cos((petals / 2) * a));
        return Math.hypot(dx, dy) - r * (0.35 + 0.65 * shape ** 0.6);
    };
    cv.shadow(sdf, { bbox: around(x, y, r + 0.08), blur: 0.03, opacity: 0.45 });
    cv.shape(sdf, (px, py) => {
        const t = clamp(Math.hypot(px - x, py - y) / r);
        return mixc(mixc(petal, WHITE, 0.55), petal, t ** 0.8);
    }, { bbox: around(x, y, r + 0.02) });
    const h = circle(x, y, r * 0.28);
    cv.shape(h, (px, py) => mixc("#fff6b0", heart, clamp(Math.hypot(px - x + r * 0.08, py - y + r * 0.08) / (r * 0.3))), { bbox: around(x, y, r * 0.3) });
}

function toadstool(cv, x, y, size) {
    const stem = (px, py) => sdBox(px, py, x, y - size * 0.35, size * 0.16, size * 0.38, size * 0.08);
    cv.shadow(stem, { bbox: around(x, y - size * 0.4, size), opacity: 0.4 });
    cv.shape(stem, (px) => mixc("#fff4dc", "#c9b38c", clamp((px - x + size * 0.16) / (size * 0.32))), { bbox: around(x, y - size * 0.35, size * 0.5) });
    const cy = y - size * 0.72;
    const cap = (px, py) => Math.max(sdLens(px, py, x, cy, size * 0.62, size * 0.32), py - cy - size * 0.06);
    cv.shadow(cap, { bbox: around(x, cy, size), opacity: 0.4 });
    cv.shape(cap, metal(cap, ramp([[0, "#3d0303"], [0.4, "#a3120e"], [0.62, "#e8322a"], [0.82, "#ff8a76"], [1, "#fff"]]), { bevel: size * 0.25, spec: 0.5 }), { bbox: around(x, cy, size * 0.7) });
    for (const [ox, oy, r] of [[-0.3, -0.12, 0.08], [0.12, -0.2, 0.07], [0.36, -0.04, 0.05], [-0.05, -0.02, 0.05]]) {
        dot(cv, x + ox * size, cy + oy * size, r * size, hex("#fffaf0"));
    }
}

function enchantedForest(cv) {
    const ring = (x, y) => Math.max(sdBox(x, y, 0, 0, 1.12, 1.12, 0.09) + 0.035 * (fbm(x * 5, y * 5, 3) - 0.5), -holeSdf(x, y));
    cv.shadow(ring, { bbox: B(1.3), opacity: 0.6 });
    cv.shape(ring, metal(ring, WOOD, {
        bevel: 0.07, spec: 0.15, shininess: 8,
        texture: (x, y) => {
            const vertical = Math.abs(x) > Math.abs(y);
            const grain = vertical ? fbm(x * 30, y * 3.5, 4) : fbm(x * 3.5, y * 30, 4);
            return 0.38 * (grain - 0.5) + 0.06 * Math.sin((vertical ? x : y) * 120 + grain * 8);
        },
    }), { bbox: B(1.2) });

    // Vines: up the left side and along the top, and down the right side.
    const vinePath = (from, to) => {
        const pts = [];
        for (let s = from; s <= to; s += 0.004) {
            const p = onRoundSquare(s, 1.05, 0.14);
            const wave = 0.05 * Math.sin(s * TAU * 11);
            pts.push([p.x + p.nx * wave, p.y + p.ny * wave]);
        }
        return pts;
    };
    const vines = [vinePath(0.56, 1.1), vinePath(0.14, 0.4)];
    for (const pts of vines) {
        const v = stroke(pts, 0.017, 0.009);
        cv.shadow(v.sdf, { bbox: v.bbox, blur: 0.03, opacity: 0.45 });
        cv.shape(v.sdf, metal(v.sdf, LEAF, { bevel: 0.017, base: 0.42, spec: 0.3 }), { bbox: v.bbox });
        for (let i = 6; i < pts.length - 4; i += 9) {
            const [px, py] = pts[i];
            const [qx, qy] = pts[i + 1];
            const tangent = Math.atan2(qy - py, qx - px);
            if (isPipCorner(px, py)) continue;
            const sideSign = (i / 9) % 2 < 1 ? 1 : -1;
            leaf(cv, px, py, tangent + sideSign * rad(55), 0.11 + 0.04 * hash(i, 3), 0.06, 0.05 * (hash(i, 9) - 0.5));
        }
    }

    // The crest: a fan of leaves behind a big flower.
    for (const [a, l] of [[-150, 0.26], [-118, 0.3], [-90, 0.32], [-62, 0.3], [-30, 0.26]]) leaf(cv, 0, -1.12, rad(a), l, 0.12, 0.05);
    flower(cv, 0, -1.16, 0.13, hex("#ff5fa8"), hex("#ffb000"), 5, rad(-90));
    flower(cv, -1.08, -1.06, 0.09, hex("#ffffff"), hex("#ffcc33"), 5, rad(10));
    flower(cv, -1.12, 0.12, 0.06, hex("#8f6bff"), hex("#ffe066"), 5);
    flower(cv, 1.1, -0.98, 0.07, hex("#ffb4d9"), hex("#ffd24d"), 5, rad(30));
    flower(cv, -0.55, -1.14, 0.05, hex("#a8e6ff"), hex("#fff066"), 5);
    toadstool(cv, -1.0, 1.2, 0.2);
    toadstool(cv, -0.78, 1.21, 0.13);
    const fly = rng(11);
    for (let i = 0; i < 12; i++) {
        const a = fly() * TAU;
        const r = 1.25 + fly() * 0.18;
        const x = clamp(Math.cos(a) * r * 1.05, -1.42, 1.42);
        const y = clamp(Math.sin(a) * r, -1.42, 1.42);
        if (isPipCorner(x, y)) continue;
        dot(cv, x, y, 0.012, hex("#e9ff7a"), 0.07, 0.7);
    }
}

// ============================================================
// Eternal Frost: translucent ice with a crackle, crystal shards
// bursting from the corners, a snowflake crest, a snow cap and icicles.
// ============================================================
const ICE = ramp([[0, "#05203c"], [0.25, "#0e4c86"], [0.45, "#2d8fd8"], [0.62, "#7cc8f6"], [0.8, "#d2f0ff"], [1, "#ffffff"]]);

function shard(cv, x, y, angle, length, width) {
    const pts = placed([[0, -width / 2], [length * 0.72, -width * 0.42], [length, 0], [length * 0.72, width * 0.42], [0, width / 2]], x, y, angle);
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.shadow(sdf, { bbox: bboxOf(pts, 0.1), opacity: 0.35, blur: 0.05 });
    cv.shape(sdf, (px, py, d) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        const facet = facetLight(angle + (v < 0 ? -Math.PI / 2 : Math.PI / 2));
        const edge = smoothstep(0.014, 0, -d) * 0.3;
        const ridge = smoothstep(0.007, 0, Math.abs(v)) * 0.3;
        const c = ICE(facet + 0.18 * (u / length) + edge + ridge);
        return [c[0], c[1], c[2], 0.92];
    }, { bbox: bboxOf(pts, 0.02) });
}

function frost(cv) {
    const ring = band(1.13, 0.06);
    cv.glow((x, y) => sdBox(x, y, 0, 0, 1.13, 1.13, 0.06), "#7fd8ff", 0.24, 0.32, { bbox: B(1.45) });
    cv.shadow(ring, { bbox: B(1.3), opacity: 0.45 });
    cv.shape(ring, metal(ring, ICE, {
        bevel: 0.07, spec: 1, shininess: 26, alpha: 0.9,
        texture: (x, y) => {
            const n = fbm(x * 8, y * 8, 4);
            return 0.3 * smoothstep(0.03, 0, Math.abs(n - 0.5)) + 0.12 * (fbm(x * 28, y * 28, 2) - 0.5) + 0.05;
        },
    }), { bbox: B(1.18) });
    const innerEdge = tube(0.975, 0.035, 0.008);
    cv.shape(innerEdge, flat("#e9f8ff", 0.85), { bbox: B(1.0) });

    // A snow cap along the top.
    const snow = (x, y) => {
        const top = -1.165 - 0.035 * fbm(x * 7, 3, 3);
        return Math.max(top - y, y + 1.1, Math.abs(x) - 0.92);
    };
    cv.shape(snow, metal(snow, ramp([[0, "#5d7f9e"], [0.4, "#b9d3e8"], [0.7, "#f2f8ff"], [1, "#ffffff"]]), { bevel: 0.03, base: 0.68, spec: 0.3 }), { bbox: [-0.95, -1.25, 0.95, -1.08] });

    // Icicles under the bottom side.
    for (let i = 0; i < 13; i++) {
        const ix = -0.78 + i * 0.11 + 0.03 * (hash(i, 1) - 0.5);
        if (ix > 0.5) continue;
        const l = 0.08 + 0.16 * hash(i, 2);
        const w = 0.028 + 0.016 * hash(i, 3);
        polygon(cv, [[ix - w, 1.11], [ix + w, 1.11], [ix + 0.004, 1.11 + l]], sdf => (px, py, d) => {
            const c = ICE(0.62 + 0.25 * clamp(-d / 0.02) - 0.2 * ((py - 1.11) / l) + (px < ix ? 0.12 : 0));
            return [c[0], c[1], c[2], 0.9];
        });
    }

    // Shards from three corners, the back ones first.
    const clusters = [
        { x: -0.97, y: -0.97, base: -135, spread: [[-25, 0.3, 0.08], [28, 0.32, 0.085], [-50, 0.22, 0.06], [52, 0.22, 0.06], [0, 0.5, 0.12]] },
        { x: 0.97, y: -0.97, base: -45, spread: [[25, 0.3, 0.08], [-28, 0.32, 0.085], [50, 0.2, 0.06], [-52, 0.22, 0.06], [0, 0.46, 0.11]] },
        { x: -0.97, y: 0.97, base: 135, spread: [[-26, 0.24, 0.07], [26, 0.26, 0.07], [0, 0.36, 0.09]] },
    ];
    for (const { x, y, base, spread } of clusters) {
        for (const [da, l, w] of spread) shard(cv, x, y, rad(base + da), l, w);
    }

    // The snowflake crest on an ice disc.
    const cx = 0;
    const cy = -1.19;
    const disc = circle(cx, cy, 0.2);
    cv.shadow(disc, { bbox: around(cx, cy, 0.32), opacity: 0.5 });
    cv.shape(disc, metal(disc, ICE, { bevel: 0.05, base: 0.42, spec: 0.9, alpha: 0.95 }), { bbox: around(cx, cy, 0.22) });
    const arms = [];
    for (let k = 0; k < 6; k++) {
        const a = rad(-90 + k * 60);
        const ex = cx + 0.165 * Math.cos(a);
        const ey = cy + 0.165 * Math.sin(a);
        arms.push([cx, cy, ex, ey, 0.014]);
        for (const [at, len] of [[0.07, 0.055], [0.115, 0.04]]) {
            const px = cx + at * Math.cos(a);
            const py = cy + at * Math.sin(a);
            for (const side of [-1, 1]) {
                const b = a + side * rad(50);
                arms.push([px, py, px + len * Math.cos(b), py + len * Math.sin(b), 0.009]);
            }
        }
    }
    const flake = (x, y) => Math.min(...arms.map(([ax, ay, bx, by, w]) => sdSegment(x, y, ax, ay, bx, by) - w));
    cv.glow(flake, "#bff0ff", 0.08, 0.8, { bbox: around(cx, cy, 0.28) });
    cv.shape(flake, (x, y) => mixc("#ffffff", "#bfe9ff", clamp(Math.hypot(x - cx, y - cy) / 0.17)), { bbox: around(cx, cy, 0.2) });

    sparkle(cv, -1.4, -1.32, 0.09, hex("#dff6ff"));
    sparkle(cv, 1.36, -1.3, 0.07, hex("#dff6ff"));
    sparkle(cv, -1.3, 1.3, 0.06, hex("#dff6ff"));
    sparkle(cv, 0.42, -1.3, 0.05, WHITE);
}

// ============================================================
// Orbital Station: a chamfered white hull with panel lines and a
// cyan light strip, thruster modules, status lights and a ringed planet.
// ============================================================
const HULL = ramp([[0, "#161b24"], [0.25, "#454e5e"], [0.45, "#87919f"], [0.62, "#c3cbd6"], [0.8, "#eaeff5"], [1, "#ffffff"]]);

function orbitalStation(cv) {
    const CYAN = hex("#38e6ff");
    const ORANGE = hex("#ff8a1f");
    const stars = rng(5);
    for (let i = 0; i < 70; i++) {
        const x = (stars() * 2 - 1) * 1.48;
        const y = (stars() * 2 - 1) * 1.48;
        if (Math.max(Math.abs(x), Math.abs(y)) < 1.2) continue;
        const r = 0.004 + stars() * 0.006;
        cv.glow(circle(x, y, r), WHITE, r * 3, 0.5, { bbox: around(x, y, r * 4), inside: 1 });
    }
    cv.glow((x, y) => sdChamferBox(x, y, 1.15, 0.26), CYAN, 0.18, 0.22, { bbox: B(1.45) });

    const hull = (x, y) => Math.max(sdChamferBox(x, y, 1.15, 0.26), -holeSdf(x, y));
    cv.shadow(hull, { bbox: B(1.32), opacity: 0.6 });
    cv.shape(hull, metal(hull, HULL, {
        bevel: 0.03, contrast: 1.1, spec: 0.7, shininess: 30,
        texture: (x, y) => {
            const { s, q } = bandCoords(x, y);
            const seam = smoothstep(0.006, 0.002, Math.abs((((s + 0.16) % 0.32) + 0.32) % 0.32 - 0.16));
            const groove = smoothstep(0.005, 0.002, Math.abs(q - 0.1));
            return -0.32 * Math.max(seam * (q > 0.1 ? 1 : 0), groove) + 0.04 * (fbm(x * 40, y * 40, 2) - 0.5);
        },
    }), { bbox: B(1.18) });
    // Dark chamfer plates with hazard stripes on the bottom-left one.
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1]]) {
        const plate = (x, y) => Math.max(sdChamferBox(x, y, 1.15, 0.26) + 0.012, (sx * x + sy * y) / Math.SQRT2 - 1.29, -holeSdf(x, y));
        cv.shape(plate, (x, y) => {
            const hazard = sy > 0 && Math.floor((x - y) * 14) % 2 === 0;
            return hazard ? hex("#f2c230") : hex("#2b313c");
        }, { bbox: around(sx * 1.05, sy * 1.05, 0.2) });
        dot(cv, sx * 0.83, sy * 1.065, 0.012, ORANGE, 0.05, 0.8);
        dot(cv, sx * 1.065, sy * 0.83, 0.012, ORANGE, 0.05, 0.8);
    }
    const strip = tube(0.985, 0.03, 0.01);
    cv.glow(strip, CYAN, 0.08, 0.85, { bbox: B(1.08) });
    cv.shape(strip, neon(CYAN, 0.01), { bbox: B(1.0) });
    // Ruler ticks along the bottom.
    for (let i = -8; i <= 4; i++) {
        const tx = i * 0.06;
        const tall = i % 4 === 0;
        const tick = (x, y) => sdBox(x, y, tx, 1.04 + (tall ? 0.012 : 0), 0.004, tall ? 0.03 : 0.018);
        cv.shape(tick, flat("#3b4352"), { bbox: around(tx, 1.06, 0.05) });
    }
    [[0.62, "#3dff8a"], [0.74, "#ffcc33"], [-0.62, "#3dff8a"]].forEach(([lx, color]) => dot(cv, lx, -1.06, 0.018, hex(color), 0.06, 0.8));

    // Thruster modules on both sides.
    for (const side of [-1, 1]) {
        const mx = side * 1.2;
        const module = (x, y) => sdBox(x, y, mx, -0.15, 0.075, 0.24, 0.03);
        cv.shadow(module, { bbox: around(mx, -0.15, 0.4) });
        cv.shape(module, metal(module, HULL, { bevel: 0.03, contrast: 1.2 }), { bbox: around(mx, -0.15, 0.27) });
        for (const vy of [-0.3, -0.15, 0]) {
            const vent = (x, y) => sdBox(x, y, mx + side * 0.012, vy, 0.04, 0.026, 0.012);
            cv.glow(vent, CYAN, 0.06, 0.8, { bbox: around(mx, vy, 0.12) });
            cv.shape(vent, (x, y) => mixc(CYAN, WHITE, clamp(1 - Math.abs(y - vy) / 0.026) * 0.7), { bbox: around(mx, vy, 0.06) });
        }
    }

    // Solar panels beyond the modules.
    for (const side of [-1, 1]) {
        const arm = (x, y) => sdBox(x, y, side * 1.3, -0.15, 0.04, 0.012);
        cv.shape(arm, metal(arm, HULL, { bevel: 0.01 }), { bbox: around(side * 1.3, -0.15, 0.06) });
        const panel = (x, y) => sdBox(x, y, side * 1.4, -0.15, 0.075, 0.34, 0.01);
        cv.shadow(panel, { bbox: around(side * 1.4, -0.15, 0.45), opacity: 0.5 });
        cv.shape(panel, (x, y) => {
            const cellX = Math.abs((((x - side * 1.4) / 0.05 + 0.5) % 1 + 1) % 1 - 0.5);
            const cellY = Math.abs(((((y + 0.15) / 0.06) % 1) + 1) % 1 - 0.5);
            const gap = Math.max(smoothstep(0.4, 0.48, cellX), smoothstep(0.4, 0.48, cellY));
            const sheen = 0.35 * smoothstep(0.3, -0.5, y + (x - side * 1.4) * 2);
            return mixc(mixc("#0d2a6b", "#3b7bff", sheen + 0.2), "#c9d3e0", gap * 0.8);
        }, { bbox: around(side * 1.4, -0.15, 0.36) });
        const rim = (x, y) => Math.abs(sdBox(x, y, side * 1.4, -0.15, 0.075, 0.34, 0.01)) - 0.006;
        cv.shape(rim, flat("#d8dee8"), { bbox: around(side * 1.4, -0.15, 0.36) });
    }

    // The ringed planet on a pylon.
    const px = 0;
    const py = -1.25;
    const pylon = (x, y) => sdPolygon(x, y, [[-0.12, -1.13], [0.12, -1.13], [0.06, -1.2], [-0.06, -1.2]]);
    cv.shape(pylon, metal(pylon, HULL, { bevel: 0.02 }), { bbox: [-0.15, -1.24, 0.15, -1.1] });
    const tilt = rad(-16);
    const ringSdf = (x, y) => {
        const [u, v] = toLocal(x, y, px, py, tilt);
        return Math.abs(sdEllipse(u, v, 0.34, 0.085)) - 0.016;
    };
    const ringPaint = (x, y) => {
        const [u] = toLocal(x, y, px, py, tilt);
        const c = mixc("#ffe2a8", "#c58a4a", 0.5 + 0.5 * Math.sin(u * 40));
        return [c[0], c[1], c[2], 0.95];
    };
    const behind = (x, y) => Math.max(ringSdf(x, y), toLocal(x, y, px, py, tilt)[1]);
    const before = (x, y) => Math.max(ringSdf(x, y), -toLocal(x, y, px, py, tilt)[1]);
    cv.shape(behind, ringPaint, { bbox: around(px, py, 0.38) });
    const planet = circle(px, py, 0.17);
    cv.glow(planet, CYAN, 0.1, 0.6, { bbox: around(px, py, 0.29) });
    cv.shape(planet, (x, y) => {
        const u = (x - px) / 0.17;
        const v = (y - py) / 0.17;
        const bands = 0.5 + 0.5 * Math.sin(v * 9 + 1.3 * fbm(u * 3, v * 3, 3));
        const lit = clamp(0.25 + 0.75 * (-u * 0.6 - v * 0.7 + Math.sqrt(Math.max(0, 1 - u * u - v * v)) * 0.6));
        const c = mixc(mixc("#0b2a55", "#1fa7c9", bands), "#b8fff0", lit * 0.35);
        return mixc("#020610", c, lit);
    }, { bbox: around(px, py, 0.18) });
    cv.shape(before, ringPaint, { bbox: around(px, py, 0.38) });
    sparkle(cv, 1.3, -1.3, 0.08, CYAN);
    sparkle(cv, -1.3, -1.36, 0.06, WHITE);
}

// ============================================================
// Arcane Grimoire: a violet enamel band in gold trims over a
// glowing rune circle, gold curls, floating crystals, a crescent moon
// cradling an orb.
// ============================================================
const VIOLET = ramp([[0, "#08020f"], [0.3, "#250b46"], [0.52, "#4c1b8a"], [0.7, "#8148dc"], [0.86, "#c7a6ff"], [1, "#ffffff"]]);

function crystal(cv, x, y, h, w, angle = 0) {
    const pts = placed([[-h, 0], [0, -w], [h, 0], [0, w]], x, y, angle);
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.glow(sdf, "#b06bff", 0.1, 0.55, { bbox: bboxOf(pts, 0.12) });
    cv.shape(sdf, (px, py, d) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        const normal = angle + (u < 0 ? Math.PI : 0) + (v < 0 ? -Math.PI / 4 : Math.PI / 4) * (u < 0 ? -1 : 1);
        const c = VIOLET(facetLight(normal) + 0.2 + smoothstep(0.012, 0, -d) * 0.25);
        return [c[0], c[1], c[2], 0.95];
    }, { bbox: bboxOf(pts, 0.02) });
}

function arcane(cv) {
    const RUNE = hex("#c99bff");
    // The rune circle behind.
    const runeRing = (x, y) => Math.min(Math.abs(Math.hypot(x, y) - 1.38) - 0.007, Math.abs(Math.hypot(x, y) - 1.26) - 0.005);
    cv.glow(runeRing, "#9a4dff", 0.08, 0.55, { bbox: B(1.5) });
    cv.shape(runeRing, flat(RUNE, 0.9), { bbox: B(1.42) });
    const glyphs = rng(23);
    const strokes = [];
    for (let k = 0; k < 36; k++) {
        const a = (k / 36) * TAU;
        const [cx, cy] = [1.32 * Math.cos(a), 1.32 * Math.sin(a)];
        const n = 2 + Math.floor(glyphs() * 2);
        for (let i = 0; i < n; i++) {
            const a0 = glyphs() * TAU;
            const l = 0.02 + glyphs() * 0.025;
            const ox = (glyphs() - 0.5) * 0.03;
            const oy = (glyphs() - 0.5) * 0.03;
            strokes.push([cx + ox, cy + oy, cx + ox + l * Math.cos(a0), cy + oy + l * Math.sin(a0)]);
        }
    }
    const runes = (x, y) => Math.min(...strokes.map(([ax, ay, bx, by]) => sdSegment(x, y, ax, ay, bx, by))) - 0.005;
    cv.glow(runes, "#9a4dff", 0.04, 0.5, { bbox: B(1.5) });
    cv.shape(runes, flat(RUNE), { bbox: B(1.42) });

    const ring = band(1.14, 0.07);
    cv.shadow(ring, { bbox: B(1.3), opacity: 0.6 });
    cv.shape(ring, (x, y, d) => {
        const sparkleDust = hash(Math.floor(x * 140), Math.floor(y * 140)) > 0.985 ? 0.5 : 0;
        const { q } = bandCoords(x, y);
        const c = VIOLET(0.36 + 0.22 * Math.sin(q * 18) - y * 0.06 + sparkleDust + 0.1 * fbm(x * 6, y * 6, 3));
        return c;
    }, { bbox: B(1.18) });
    for (const [h, r, w] of [[1.125, 0.07, 0.016], [0.985, 0.035, 0.016]]) {
        const trim = tube(h, r, w);
        cv.shape(trim, metal(trim, RAMPS.gold, { bevel: w, contrast: 1.6 }), { bbox: B(h + 0.04) });
    }
    // Gold curls on three corners.
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1]]) {
        for (const flip of [0, 1]) {
            const pts = [];
            for (let t = 0; t <= 1; t += 0.02) {
                const a = t * 1.8 * Math.PI;
                const r = 0.11 * (1 - 0.75 * t);
                const along = 0.22 * (1 - t) + 0.02;
                const [ux, uy] = flip ? [along, 0] : [0, along];
                const lx = ux + (flip ? 0 : r) * Math.sin(a) + (flip ? r * (1 - Math.cos(a)) : 0);
                const ly = uy + (flip ? r : 0) * Math.sin(a) + (flip ? 0 : r * (1 - Math.cos(a)));
                pts.push([sx * (1.04 - lx * 0.9), sy * (1.04 - ly * 0.9)]);
            }
            const curl = stroke(pts, 0.018, 0.006);
            cv.shadow(curl.sdf, { bbox: curl.bbox, blur: 0.03, opacity: 0.5 });
            cv.shape(curl.sdf, metal(curl.sdf, RAMPS.gold, { bevel: 0.016, contrast: 1.5 }), { bbox: curl.bbox });
        }
        const g = circle(sx * 1.05, sy * 1.05, 0.045);
        setGem(cv, g, around(sx * 1.05, sy * 1.05, 0.09), sx * 1.05, sy * 1.05, 0.045, hex("#a54dff"));
    }
    crystal(cv, -1.26, -0.1, 0.2, 0.055, rad(90));
    crystal(cv, -1.33, 0.2, 0.09, 0.03, rad(80));
    crystal(cv, 1.26, -0.1, 0.2, 0.055, rad(90));
    crystal(cv, 1.33, -0.42, 0.09, 0.03, rad(100));

    // The crescent and its orb.
    const cx = 0;
    const cy = -1.2;
    const crescent = (x, y) => Math.max(sdCircle(x, y, cx, cy, 0.2), -sdCircle(x, y, cx, cy - 0.075, 0.185));
    cv.shadow(crescent, { bbox: around(cx, cy, 0.32) });
    cv.shape(crescent, metal(crescent, RAMPS.gold, { bevel: 0.03, contrast: 1.5 }), { bbox: around(cx, cy, 0.22) });
    const orb = circle(cx, cy - 0.06, 0.11);
    cv.glow(orb, "#c06bff", 0.2, 0.8, { bbox: around(cx, cy - 0.06, 0.34) });
    cv.shape(orb, (x, y) => {
        const u = (x - cx) / 0.11;
        const v = (y - cy + 0.06) / 0.11;
        const swirl = fbm(u * 2.5 + 3, v * 2.5 + Math.atan2(v, u), 4);
        const c = mixc(mixc("#3b0a7a", "#ff7ae6", swirl), WHITE, clamp(0.6 - Math.hypot(u + 0.35, v + 0.4)) * 1.5);
        return c;
    }, { bbox: around(cx, cy - 0.06, 0.12) });
    for (const [x, y, s] of [[-0.3, -1.33, 0.06], [0.32, -1.36, 0.08], [0.2, -1.12, 0.035], [-1.38, -1.1, 0.07], [1.36, 0.4, 0.06]]) {
        sparkle(cv, x, y, s, hex("#f2c9ff"));
    }

    // A gold plaque with an amethyst below.
    const plaque = (x, y) => sdPolygon(x, y, [[-0.2, 1.1], [-0.13, 1.03], [0.13, 1.03], [0.2, 1.1], [0.13, 1.19], [-0.13, 1.19]]);
    cv.shadow(plaque, { bbox: [-0.3, 0.95, 0.3, 1.3] });
    cv.shape(plaque, metal(plaque, RAMPS.gold, { bevel: 0.03, contrast: 1.4 }), { bbox: [-0.22, 1.0, 0.22, 1.22] });
    const g = (x, y) => sdLens(x, y, 0, 1.11, 0.1, 0.05, 0);
    setGem(cv, g, [-0.14, 1.03, 0.14, 1.19], 0, 1.11, 0.07, hex("#a54dff"), { setting: null, glowColor: "#b06bff" });
}

// ============================================================
// Spice of Arrakis: carved sandstone, a sandworm's maw ringed with
// teeth on top, glowing Fremen-blue eyes, dunes and spice below, two moons.
// ============================================================
const SAND = ramp([[0, "#241004"], [0.25, "#653512"], [0.45, "#a4632a"], [0.62, "#d29a55"], [0.8, "#efcb8a"], [1, "#fff2d2"]]);
const FLESH = ramp([[0, "#220d08"], [0.3, "#6a3727"], [0.55, "#a7694c"], [0.76, "#d8a183"], [1, "#fbe4d0"]]);

function spiceOfArrakis(cv) {
    // Spice haze behind.
    cv.glow((x, y) => sdBox(x, y, 0, 0, 1.14, 1.14, 0.05), "#ff8a1e", 0.3, 0.28, { bbox: B(1.5) });
    const moons = [[-1.22, -1.3, 0.085], [-1.02, -1.4, 0.05]];
    for (const [mx, my, mr] of moons) {
        const moon = (x, y) => Math.max(sdCircle(x, y, mx, my, mr), -sdCircle(x, y, mx + mr * 0.45, my - mr * 0.3, mr * 0.9));
        cv.glow(moon, "#ffe9c4", 0.06, 0.5, { bbox: around(mx, my, mr + 0.08) });
        cv.shape(moon, flat("#fff1d8"), { bbox: around(mx, my, mr + 0.01) });
    }

    const ring = band(1.14, 0.05);
    cv.shadow(ring, { bbox: B(1.3), opacity: 0.6 });
    cv.shape(ring, metal(ring, SAND, {
        bevel: 0.055, spec: 0.12, shininess: 6,
        texture: (x, y) => {
            const { s, q } = bandCoords(x, y);
            const strata = 0.08 * Math.sin((x * 0.6 + y) * 36 + 6 * fbm(x * 3, y * 3, 3)) + 0.12 * (fbm(x * 18, y * 18, 3) - 0.5);
            const zig = 0.06 * (Math.abs((((s * 7) % 1) + 1) % 1 - 0.5) - 0.25);
            const offset = q - 0.088 - zig;
            const groove = smoothstep(0.009, 0.004, Math.abs(offset)) * -0.38 + smoothstep(0.004, 0.012, offset) * smoothstep(0.018, 0.012, offset) * 0.14;
            const lines = (smoothstep(0.005, 0.002, Math.abs(q - 0.03)) + smoothstep(0.005, 0.002, Math.abs(q - 0.148))) * -0.3;
            return strata + groove + lines;
        },
    }), { bbox: B(1.18) });

    // Dunes drifting over the bottom.
    const dune = (y0, height, phase, k) => (x, y) => {
        const crest = y0 - height * (0.55 + 0.45 * Math.sin(x * k + phase)) - 0.03 * fbm(x * 4, phase, 2);
        return Math.max(crest - y, y - 1.48, Math.abs(x) - 1.38 + 0.25 * smoothstep(0.6, 1.4, Math.abs(x)) * 0);
    };
    const duneBack = dune(1.22, 0.16, 0.6, 2.6);
    const duneFront = dune(1.32, 0.13, 2.4, 3.4);
    for (const [shape, base] of [[duneBack, 0.42], [duneFront, 0.58]]) {
        cv.shape(shape, (x, y) => {
            const ripple = 0.06 * Math.sin(x * 70 + y * 25 + 3 * fbm(x * 5, y * 5, 2));
            const fade = (1 - smoothstep(1.0, 1.38, Math.abs(x))) * (1 - smoothstep(1.36, 1.49, y));
            const c = SAND(base + ripple + 0.25 * smoothstep(0.08, 0, y - 1.1) - 0.15 * (y - 1.2));
            return [c[0], c[1], c[2], fade];
        }, { bbox: [-1.42, 0.98, 1.42, 1.5] });
    }

    // Fremen-blue eyes on both sides.
    for (const side of [-1, 1]) {
        const ex = side * 1.055;
        const ey = -0.1;
        const socket = (x, y) => sdLens(x, y, ex, ey, 0.13, 0.06, rad(90));
        cv.shape(socket, metal(socket, SAND, { bevel: 0.03, base: 0.25 }), { bbox: around(ex, ey, 0.16) });
        const eye = (x, y) => sdLens(x, y, ex, ey, 0.1, 0.042, rad(90));
        cv.glow(eye, "#2f8cff", 0.12, 0.8, { bbox: around(ex, ey, 0.25) });
        cv.shape(eye, (x, y) => {
            const t = clamp(Math.hypot((x - ex) / 0.042, (y - ey) / 0.1));
            return mixc(mixc("#e8f8ff", "#3fa2ff", clamp(t * 1.6)), "#0b2e8a", clamp((t - 0.6) * 2.5));
        }, { bbox: around(ex, ey, 0.11) });
    }

    // The sandworm's maw.
    const mx = 0;
    const my = -1.22;
    const R = 0.245;
    const lip = circle(mx, my, R);
    cv.glow(lip, "#ff7a1a", 0.2, 0.55, { bbox: around(mx, my, R + 0.22) });
    cv.shadow(lip, { bbox: around(mx, my, R + 0.12), opacity: 0.6 });
    cv.shape(lip, metal(lip, FLESH, {
        bevel: 0.07, spec: 0.25, shininess: 10,
        texture: (x, y) => 0.16 * Math.sin(Math.hypot(x - mx, y - my) * 95) + 0.1 * (fbm(x * 20, y * 20, 2) - 0.5),
    }), { bbox: around(mx, my, R + 0.02) });
    const throatR = R * 0.74;
    cv.shape(circle(mx, my, throatR), (x, y) => {
        const t = clamp(Math.hypot(x - mx, y - my) / throatR);
        return mixc(mixc("#ffe27a", "#e0560f", clamp(t * 4)), "#140402", smoothstep(0.15, 0.55, t));
    }, { bbox: around(mx, my, throatR + 0.01) });
    [[18, throatR + 0.004, 0.06, 0.028], [13, throatR * 0.72, 0.05, 0.026], [9, throatR * 0.46, 0.04, 0.022]].forEach(([n, r0, len, w], row) => {
        const sector = TAU / n;
        const teeth = (x, y) => {
            const dx = x - mx;
            const dy = y - my;
            const rr = Math.hypot(dx, dy);
            let a = Math.atan2(dy, dx) + row * 0.13;
            a = (((a % sector) + sector) % sector) - sector / 2;
            const u = rr * Math.cos(a);
            const v = rr * Math.sin(a);
            return sdPolygon(u, v, [[r0 + 0.004, -w], [r0 + 0.004, w], [r0 - len, 0]]);
        };
        cv.shape((x, y) => teeth(x, y) - 0.005, flat("#120302"), { bbox: around(mx, my, r0 + 0.015) });
        cv.shape(teeth, (x, y) => mixc("#fffdf5", "#cdb894", clamp((r0 - Math.hypot(x - mx, y - my)) / len) ** 0.7), { bbox: around(mx, my, r0 + 0.01) });
    });

    const spice = rng(3);
    for (let i = 0; i < 26; i++) {
        const x = (spice() * 2 - 1) * 1.42;
        const y = (spice() * 2 - 1) * 1.42;
        if (Math.max(Math.abs(x), Math.abs(y)) < 1.16 || isPipCorner(x, y)) continue;
        dot(cv, x, y, 0.006 + spice() * 0.008, hex("#ffb347"), 0.05, 0.75);
    }
}

// ============================================================
// Dragon's Breath: flames licking up from a band of red scales,
// sweeping horns, dorsal spikes and a slit-pupil dragon eye.
// ============================================================
const SCALES = ramp([[0, "#0b0202"], [0.25, "#3d0707"], [0.45, "#7c1010"], [0.62, "#c22a16"], [0.78, "#ff7a2e"], [0.9, "#ffc46b"], [1, "#fff3d0"]]);
const BONE = ramp([[0, "#1d150c"], [0.3, "#5b4630"], [0.5, "#9a8160"], [0.7, "#d2bf98"], [0.88, "#f4ead2"], [1, "#ffffff"]]);

// The fish scale under (s, q): rows across the band, inner rows on top.
function fishScale(s, q) {
    const cw = 0.07;
    const ch = 0.05;
    const R = 0.042;
    const row0 = Math.floor(q / ch);
    for (let r = row0 - 1; r <= row0 + 1; r++) {
        const offset = (((r % 2) + 2) % 2) * cw * 0.5;
        const cell = Math.round((s - offset) / cw);
        const dist = Math.hypot(s - (cell * cw + offset), q - r * ch);
        if (dist < R) return dist / R;
    }
    return 1.2;
}

function dragonBreath(cv) {
    cv.field((x, y) => {
        const e = sdBox(x, y, 0, 0, 1.12, 1.12, 0.1);
        if (e < 0) return null;
        const top = smoothstep(-0.4, -1.0, y);
        const reach = 0.36 * top + 0.2 * smoothstep(0.7, -0.6, y) * smoothstep(1.0, 1.15, Math.abs(x));
        if (reach <= 0.01) return null;
        const n = fbm(x * 5.5, y * 2.2 - 3, 4);
        const h = reach * (0.35 + 1.15 * n ** 1.6);
        const t = e / h + 0.25 * (fbm(x * 12, y * 5 + 9, 3) - 0.5);
        if (t >= 1) return null;
        const c = t < 0.3 ? mixc("#fff6c0", "#ffd23f", t / 0.3) : t < 0.65 ? mixc("#ffd23f", "#ff6a14", (t - 0.3) / 0.35) : mixc("#ff6a14", "#a8100a", (t - 0.65) / 0.35);
        return [c[0], c[1], c[2], 0.95 * (1 - t) ** 0.7];
    }, { bbox: B(1.5) });

    const ring = band(1.13, 0.08);
    cv.shadow(ring, { bbox: B(1.28), opacity: 0.6 });
    cv.shape(ring, metal(ring, SCALES, {
        bevel: 0.05, base: 0.42, spec: 0.5, shininess: 18,
        texture: (x, y) => {
            const { s, q } = bandCoords(x, y);
            const t = fishScale(s, q);
            return t > 1 ? -0.3 : -0.12 + 0.42 * t * t - 0.3 * smoothstep(0.86, 1, t);
        },
    }), { bbox: B(1.18) });
    for (const [h, w] of [[1.12, 0.012], [0.98, 0.013]]) {
        const trim = tube(h, 0.06, w);
        cv.shape(trim, metal(trim, RAMPS.gold, { bevel: w, contrast: 1.5, base: 0.45 }), { bbox: B(h + 0.03) });
    }

    // Horns from the top corners.
    for (const side of [-1, 1]) {
        const pts = bezier([side * 0.6, -1.1], [side * 0.9, -1.42], [side * 1.25, -1.44], [side * 1.43, -1.25], 30);
        const horn = stroke(pts, 0.075, 0.006);
        cv.shadow(horn.sdf, { bbox: horn.bbox, opacity: 0.55, blur: 0.05 });
        cv.shape(horn.sdf, metal(horn.sdf, BONE, {
            bevel: 0.06, spec: 0.45,
            texture: (x, y) => 0.14 * Math.sin(horn.at(x, y) * 60) - 0.2 * horn.at(x, y),
        }), { bbox: horn.bbox });
    }
    // Dorsal spikes along the top.
    for (const side of [-1, 1]) {
        for (const [sx, h] of [[0.3, 0.1], [0.42, 0.08], [0.52, 0.06]]) {
            polygon(cv, [[side * sx - 0.035, -1.12], [side * sx + 0.035, -1.12], [side * (sx + 0.02), -1.12 - h]], sdf => metal(sdf, SCALES, { bevel: 0.02, base: 0.5 }), { shadow: { opacity: 0.4 } });
        }
    }

    // The eye.
    const cx = 0;
    const cy = -1.17;
    const socket = (x, y) => sdLens(x, y, cx, cy, 0.27, 0.13, 0);
    cv.shadow(socket, { bbox: around(cx, cy, 0.4) });
    cv.shape(socket, metal(socket, SCALES, { bevel: 0.05, base: 0.3 }), { bbox: around(cx, cy, 0.3) });
    const rim = (x, y) => Math.abs(sdLens(x, y, cx, cy, 0.225, 0.1, 0)) - 0.012;
    cv.shape(rim, metal(rim, RAMPS.gold, { bevel: 0.012, contrast: 1.6 }), { bbox: around(cx, cy, 0.26) });
    const eye = (x, y) => sdLens(x, y, cx, cy, 0.21, 0.09, 0);
    cv.glow(eye, "#ff9a1e", 0.14, 0.7, { bbox: around(cx, cy, 0.38) });
    cv.shape(eye, (x, y) => {
        const dx = (x - cx) / 0.21;
        const dy = (y - cy) / 0.09;
        const t = clamp(Math.hypot(dx * 1.6, dy));
        const streak = 0.18 * (fbm(Math.atan2(dy, dx) * 6, t * 3, 3) - 0.5);
        return mixc(mixc("#fff3a0", "#ffb21e", clamp(t * 1.6 + streak)), "#7a1405", smoothstep(0.65, 1.05, t + streak));
    }, { bbox: around(cx, cy, 0.22) });
    const pupil = (x, y) => sdLens(x, y, cx, cy, 0.085, 0.018, rad(90));
    cv.shape(pupil, flat("#0a0201"), { bbox: around(cx, cy, 0.1) });
    cv.field((x, y) => {
        const g = sdCircle(x, y, cx - 0.06, cy - 0.035, 0.022);
        return g < 0 ? [1, 1, 1, 0.85 * clamp(-g / 0.022) ** 0.5] : null;
    }, { bbox: around(cx - 0.06, cy - 0.035, 0.03) });

    const embers = rng(17);
    for (let i = 0; i < 22; i++) {
        const x = (embers() * 2 - 1) * 1.4;
        const y = -1.48 + embers() * 1.0;
        if (Math.max(Math.abs(x), Math.abs(y)) < 1.18) continue;
        dot(cv, x, y, 0.006 + embers() * 0.008, hex("#ffb24d"), 0.05, 0.8);
    }
}

// ============================================================
// Royal Pinball: red lacquer in gold trims studded with chasing
// bulbs, pop bumpers on the top corners, a chrome ball in a gold crown
// and two flippers below.
// ============================================================
const LACQUER = ramp([[0, "#1c0003"], [0.3, "#6d0711"], [0.52, "#b5121f"], [0.7, "#e8414a"], [0.86, "#ff9a9a"], [1, "#ffffff"]]);
const WARM = ramp([[0, "#3a2a10"], [0.5, "#ffd36b"], [0.8, "#fff4c8"], [1, "#ffffff"]]);
const DIM = ramp([[0, "#1c1408"], [0.5, "#6e5528"], [0.8, "#a8884a"], [1, "#e8d4a0"]]);
const PLASTIC = ramp([[0, "#3a3d44"], [0.4, "#b9bec8"], [0.7, "#f1f3f7"], [1, "#ffffff"]]);

function bulb(cv, x, y, r, lit) {
    const socket = circle(x, y, r + 0.008);
    cv.shape(socket, flat("#3b2a0a"), { bbox: around(x, y, r + 0.02) });
    if (lit) cv.glow(circle(x, y, r), "#ffcf5a", r * 2.4, 0.75, { bbox: around(x, y, r * 3.6) });
    cv.shape(circle(x, y, r), sphere(x, y, r, lit ? WARM : DIM, { spec: 0.9, shininess: 24 }), { bbox: around(x, y, r + 0.01) });
}

function bumper(cv, x, y) {
    const skirt = circle(x, y, 0.165);
    cv.shadow(skirt, { bbox: around(x, y, 0.28), opacity: 0.6 });
    cv.shape(skirt, metal(skirt, RAMPS.silver, { bevel: 0.045, contrast: 1.5, spec: 0.9 }), { bbox: around(x, y, 0.18) });
    cv.glow(circle(x, y, 0.13), "#ff4f5a", 0.08, 0.5, { bbox: around(x, y, 0.24) });
    const cap = circle(x, y, 0.13);
    cv.shape(cap, (px, py) => {
        const t = Math.hypot(px - x, py - y) / 0.13;
        const base = t > 0.72 ? mixc("#ff3a46", "#8c0a16", (t - 0.72) / 0.28) : mixc("#ffffff", "#ffd9dc", t / 0.72);
        const hl = Math.exp(-(((px - x + 0.04) / 0.13) ** 2 + ((py - y + 0.05) / 0.13) ** 2) / 0.05) * 0.5;
        return [base[0] + hl, base[1] + hl, base[2] + hl];
    }, { bbox: around(x, y, 0.14) });
    const star = starPoints(x, y, 0.065, 0.027, 5);
    polygon(cv, star, sdf => metal(sdf, RAMPS.gold, { bevel: 0.015, contrast: 1.4 }));
}

function flipper(cv, side) {
    const pivot = [side * 0.6, 1.17];
    const tip = [side * 0.15, 1.3];
    const shape = stroke([pivot, tip], 0.072, 0.034);
    cv.shadow(shape.sdf, { bbox: shape.bbox, opacity: 0.6 });
    cv.shape(shape.sdf, metal(shape.sdf, LACQUER, { bevel: 0.016, base: 0.5, spec: 0.6 }), { bbox: shape.bbox });
    const body = (x, y) => shape.sdf(x, y) + 0.016;
    cv.shape(body, metal(body, PLASTIC, { bevel: 0.04, spec: 0.8 }), { bbox: shape.bbox });
    const screw = circle(pivot[0], pivot[1], 0.024);
    cv.shape(screw, metal(screw, RAMPS.silver, { bevel: 0.024, contrast: 1.6 }), { bbox: around(pivot[0], pivot[1], 0.04) });
}

function pinballRoyale(cv) {
    const ring = band(1.15, 0.08);
    cv.shadow(ring, { bbox: B(1.32), opacity: 0.6 });
    cv.shape(ring, metal(ring, LACQUER, { bevel: 0.06, spec: 1, shininess: 34, contrast: 1.2 }), { bbox: B(1.2) });
    for (const [h, r, w] of [[1.138, 0.08, 0.012], [0.982, 0.035, 0.017]]) {
        const trim = tube(h, r, w);
        cv.shape(trim, metal(trim, RAMPS.gold, { bevel: w, contrast: 1.6 }), { bbox: B(h + 0.03) });
    }
    for (let i = 0; i < 40; i++) {
        const p = onRoundSquare((i + 0.5) / 40, 1.064, 0.08);
        if ((Math.abs(p.x) < 0.27 && p.y < 0) || (Math.abs(p.x) < 0.78 && p.y > 0.9) || (Math.abs(p.x) > 0.8 && p.y < -0.8) || isPipCorner(p.x, p.y)) continue;
        bulb(cv, p.x, p.y, 0.026, i % 2 === 0);
    }
    bumper(cv, -1.03, -1.03);
    bumper(cv, 1.03, -1.03);
    flipper(cv, -1);
    flipper(cv, 1);

    // The ball in its crown.
    const crown = [[-0.22, -1.09], [0.22, -1.09], [0.27, -1.33], [0.14, -1.22], [0, -1.4], [-0.14, -1.22], [-0.27, -1.33]];
    polygon(cv, crown, sdf => metal(sdf, RAMPS.gold, { bevel: 0.03, contrast: 1.5 }), { shadow: { opacity: 0.55 } });
    for (const [gx, gy] of [[-0.25, -1.3], [0.25, -1.3]]) {
        const g = circle(gx, gy, 0.028);
        setGem(cv, g, around(gx, gy, 0.05), gx, gy, 0.028, hex("#e0162a"), { settingWidth: 0.008 });
    }
    const ball = circle(0, -1.2, 0.135);
    cv.shadow(ball, { bbox: around(0, -1.2, 0.24), dx: 0.02, dy: 0.035, opacity: 0.6 });
    cv.shape(ball, sphere(0, -1.2, 0.135, RAMPS.silver, { chrome: true, spec: 1, shininess: 40 }), { bbox: around(0, -1.2, 0.14) });
    sparkle(cv, -0.05, -1.28, 0.05, WHITE, 0.9);
}

// ============================================================
// Celestial Legend: platinum in gold trims, angel wings sweeping from
// the top corners, a brilliant diamond under a halo, light rays and an
// aurora glow.
// ============================================================
const FEATHER = ramp([[0, "#3b4566"], [0.35, "#9aa8cc"], [0.65, "#e4ebff"], [0.85, "#ffffff"], [1, "#ffffff"]]);

function feather(cv, x, y, angle, length, width, goldEdge = false) {
    const pts = placed(leafPoints(length, width, { peak: 0.3, tipRound: 0.25 }), x, y, angle);
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.shadow(sdf, { bbox: bboxOf(pts, 0.06), dx: 0.004, dy: 0.012, blur: 0.035, opacity: 0.32 });
    cv.shape(sdf, (px, py, d) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        const vane = v < 0 ? 0.72 : 0.55;
        const barbs = 0.035 * Math.sin((u * 1.2 + Math.abs(v)) * 140);
        const shaft = smoothstep(0.005, 0, Math.abs(v)) * 0.2;
        const edge = smoothstep(0.014, 0, -d);
        const c = FEATHER(vane + barbs + shaft + 0.18 * (u / length) - 0.12);
        return goldEdge ? mixc(c, "#ffd76a", edge * 0.55) : mixc(c, "#dfe6ff", edge * 0.3);
    }, { bbox: bboxOf(pts, 0.02) });
}

function celestialLegend(cv) {
    // Light rays and an aurora behind everything.
    cv.field((x, y) => {
        if (holeSdf(x, y) < 0.02) return null;
        const dx = x;
        const dy = y + 1.2;
        const r = Math.hypot(dx, dy);
        const rays = (0.5 + 0.5 * Math.cos(Math.atan2(dy, dx) * 16)) ** 4;
        const fade = smoothstep(0.1, 0.35, r) * (1 - smoothstep(0.4, 0.9, r)) * smoothstep(-0.7, -1.1, y);
        return [1, 0.92, 0.7, 0.4 * rays * fade];
    }, { bbox: B(1.5), mode: "add" });
    cv.field((x, y) => {
        const e = sdBox(x, y, 0, 0, 1.14, 1.14, 0.07);
        if (e < 0 || e > 0.32 || holeSdf(x, y) < 0) return null;
        const a = Math.atan2(y, x);
        const c = mixc(mixc("#3fe0ff", "#a46bff", 0.5 + 0.5 * Math.sin(a * 2)), "#ff7ad9", 0.5 + 0.5 * Math.sin(a * 3 + 1));
        return [c[0], c[1], c[2], 0.5 * (1 - e / 0.32) ** 2];
    }, { bbox: B(1.5), mode: "add" });

    // Wings: an arm along the top, scalloped feathers hanging from it and
    // long primaries down the sides, behind the band.
    for (const side of [-1, 1]) {
        const arm = bezier([side * 0.18, -1.2], [side * 0.55, -1.47], [side * 1.1, -1.47], [side * 1.4, -1.32], 40);
        const at = t => arm[Math.round(clamp(t) * (arm.length - 1))];
        const along = (t, from, to) => (side < 0 ? rad(from) : Math.PI - rad(from)) + (side < 0 ? 1 : -1) * rad(to - from) * t;
        // Primaries: long, at the outer end, down the side.
        for (let i = 0; i < 6; i++) {
            const t = 0.72 + i * 0.056;
            const [ax, ay] = at(t);
            feather(cv, ax, ay, along(i / 5, 118, 92), 0.42 + i * 0.07, 0.13);
        }
        // Secondaries: medium, along the middle.
        for (let i = 0; i < 7; i++) {
            const t = 0.18 + i * 0.09;
            const [ax, ay] = at(t);
            feather(cv, ax, ay + 0.01, along(i / 6, 128, 112), 0.24 + i * 0.015, 0.13);
        }
        // Coverts: short, gold-edged, over the roots.
        for (let i = 0; i < 9; i++) {
            const t = 0.06 + i * 0.105;
            const [ax, ay] = at(t);
            feather(cv, ax, ay + 0.005, along(i / 8, 140, 110), 0.12 + 0.02 * Math.sin(i), 0.1, true);
        }
        const armStroke = stroke(arm, 0.03, 0.012);
        cv.shadow(armStroke.sdf, { bbox: armStroke.bbox, opacity: 0.4, blur: 0.03 });
        cv.shape(armStroke.sdf, metal(armStroke.sdf, RAMPS.gold, { bevel: 0.022, contrast: 1.5 }), { bbox: armStroke.bbox });
    }

    const ring = band(1.14, 0.07);
    cv.shadow(ring, { bbox: B(1.3), opacity: 0.6 });
    cv.shape(ring, metal(ring, RAMPS.platinum, {
        bevel: 0.07, spec: 0.9, shininess: 28,
        texture: (x, y) => {
            const { s, q } = bandCoords(x, y);
            const scroll = Math.sin(s * 34 + Math.sin(q * 60) * 2.2);
            return 0.1 * smoothstep(0.75, 1, scroll) - 0.12 * smoothstep(0.9, 1, -scroll);
        },
    }), { bbox: B(1.18) });
    for (const [h, r, w] of [[1.13, 0.07, 0.012], [0.985, 0.035, 0.016]]) {
        const trim = tube(h, r, w);
        cv.shape(trim, metal(trim, RAMPS.gold, { bevel: w, contrast: 1.6 }), { bbox: B(h + 0.03) });
    }
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1]]) {
        const g = (x, y) => sdPolygon(x, y, starPoints(sx * 1.055, sy * 1.055, 0.06, 0.035, 4, rad(45)));
        setGem(cv, g, around(sx * 1.055, sy * 1.055, 0.1), sx * 1.055, sy * 1.055, 0.055, hex("#3d7bff"), { facets: 8 });
    }

    // Halo and diamond.
    const halo = (x, y) => Math.abs(sdEllipse(x, y + 1.43, 0.15, 0.035)) - 0.011;
    cv.glow(halo, "#ffe9a6", 0.07, 0.8, { bbox: [-0.25, -1.5, 0.25, -1.36] });
    cv.shape(halo, metal(halo, RAMPS.gold, { bevel: 0.011, contrast: 1.4, base: 0.65 }), { bbox: [-0.18, -1.48, 0.18, -1.38] });
    const setting = circle(0, -1.2, 0.165);
    cv.glow(setting, "#fff2c0", 0.16, 0.6, { bbox: around(0, -1.2, 0.33) });
    cv.shadow(setting, { bbox: around(0, -1.2, 0.28) });
    cv.shape(setting, metal(setting, RAMPS.gold, { bevel: 0.035, contrast: 1.5 }), { bbox: around(0, -1.2, 0.17) });
    const diamond = (x, y) => sdPolygon(x, y, starPoints(0, -1.2, 0.135, 0.125, 8, rad(-90)));
    cv.shape(diamond, gem(0, -1.2, 0.135, hex("#cfeaff"), { sdf: diamond, facets: 16 }), { bbox: around(0, -1.2, 0.14) });
    sparkle(cv, -0.06, -1.27, 0.07, WHITE);
    for (const [x, y, s] of [[-1.38, -0.75, 0.06], [1.38, -0.75, 0.06], [-0.45, -1.42, 0.05], [0.47, -1.42, 0.05], [-1.3, 0.6, 0.05], [0.0, 1.32, 0.06]]) {
        sparkle(cv, x, y, s, hex("#fff3c4"));
    }
}

// ============================================================
// Christmas: a pine-green lacquered band between gold trims, holly sprigs
// with red berries at its corners and sides, a gold star on top and snow
// twinkling around.
// ============================================================
const PINE = ramp([[0, "#021308"], [0.3, "#0b3d1c"], [0.52, "#17663a"], [0.7, "#2f9152"], [0.86, "#8fd3a0"], [1, "#ffffff"]]);
const HOLLY = ramp([[0, "#03170a"], [0.35, "#0f4a22"], [0.6, "#1f7a3a"], [0.8, "#58b463"], [1, "#d8ffd0"]]);
const BERRY = ramp([[0, "#2a0004"], [0.35, "#8a0a14"], [0.6, "#d41c26"], [0.82, "#ff6a5c"], [1, "#ffffff"]]);

// A holly leaf along angle from (x, y): its edges zigzag into spikes.
function hollyLeaf(cv, x, y, angle, length, width) {
    const steps = 8;
    const top = [];
    const bottom = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const w = (width / 2) * Math.sin(Math.PI * t) ** 0.7 * (i % 2 === 1 ? 1 : 0.6);
        top.push([t * length, -w]);
        bottom.push([t * length, w]);
    }
    const pts = placed([...top, ...bottom.reverse()], x, y, angle);
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.shadow(sdf, { bbox: bboxOf(pts, 0.06), blur: 0.03, opacity: 0.45 });
    cv.shape(sdf, (px, py, d) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        const side = v < 0 ? 0.66 : 0.48;
        const vein = smoothstep(0.006, 0, Math.abs(v)) * 0.3 * (1 - u / length);
        const edge = smoothstep(0.012, 0, -d) * -0.14;
        return HOLLY(side + vein + edge);
    }, { bbox: bboxOf(pts, 0.02) });
}

// Two holly leaves spread from (x, y) along angle, berries over their root.
function hollySprig(cv, x, y, angle, size) {
    hollyLeaf(cv, x, y, angle - rad(38), size, size * 0.42);
    hollyLeaf(cv, x, y, angle + rad(38), size, size * 0.42);
    const r = size * 0.13;
    for (const [ox, oy] of [[-0.9, 0.3], [0.9, 0.3], [0, -0.75]]) {
        const bx = x + ox * r;
        const by = y + oy * r;
        const berry = circle(bx, by, r);
        cv.shadow(berry, { bbox: around(bx, by, r * 3), blur: r, opacity: 0.5 });
        cv.shape(berry, sphere(bx, by, r, BERRY, { spec: 0.8 }), { bbox: around(bx, by, r * 1.2) });
    }
}

// The Holiday Frames' common base: a lacquered band of colorRamp, texture
// shifting its shade, between two trims of trimRamp.
function holidayBand(cv, colorRamp, trimRamp, texture) {
    const ring = band(1.13, 0.08);
    cv.shadow(ring, { bbox: B(1.3), opacity: 0.6 });
    cv.shape(ring, metal(ring, colorRamp, { bevel: 0.07, spec: 0.7, shininess: 24, texture }), { bbox: B(1.17) });
    for (const [h, r, w] of [[1.125, 0.08, 0.013], [0.985, 0.035, 0.015]]) {
        const trim = tube(h, r, w);
        cv.shape(trim, metal(trim, trimRamp, { bevel: w, contrast: 1.6 }), { bbox: B(h + 0.03) });
    }
}

// Where the Holiday Frames put their ornaments: three corners and the four
// mid-sides of the band (none on the pip's corner), each with its outward angle.
function ornamentSpots(cornerSize, sideSize) {
    const spots = [];
    for (const [s, size] of [[0, cornerSize], [0.25, cornerSize], [0.75, cornerSize], [0.375, sideSize], [0.625, sideSize], [0.875, sideSize]]) {
        const p = onRoundSquare(s, 1.06, 0.12);
        if (!isPipCorner(p.x, p.y)) spots.push({ x: p.x, y: p.y, angle: Math.atan2(p.ny, p.nx), size });
    }
    return spots;
}

// count points scattered around the band, r from minRadius to minRadius
// + radiusSpan, for paint(x, y, random): off the pip's corner and the top ornament.
function scatter(seed, count, minRadius, radiusSpan, paint) {
    const random = rng(seed);
    for (let i = 0; i < count; i++) {
        const a = random() * TAU;
        const r = minRadius + random() * radiusSpan;
        const x = clamp(Math.cos(a) * r, -1.42, 1.42);
        const y = clamp(Math.sin(a) * r, -1.42, 1.42);
        if (isPipCorner(x, y) || (Math.abs(x) < 0.35 && y < -1)) continue;
        paint(x, y, random);
    }
}

const twinkles = (cv, seed, count, color) => scatter(seed, count, 1.28, 0.14,
    (x, y, random) => sparkle(cv, x, y, 0.03 + 0.02 * random(), hex(color), 0.8));

function christmas(cv) {
    // Faint diagonal stripes, like a wrapped present.
    holidayBand(cv, PINE, RAMPS.gold, (x, y) => 0.06 * smoothstep(0.6, 1, Math.sin((x + y) * 26)));

    for (const { x, y, angle, size } of ornamentSpots(0.34, 0.24)) hollySprig(cv, x, y, angle, size);

    // The star on top, glowing.
    const starSdf = (x, y) => sdPolygon(x, y, starPoints(0, -1.2, 0.22, 0.09, 5));
    cv.glow(starSdf, "#fff0b0", 0.16, 0.7, { bbox: around(0, -1.2, 0.4) });
    cv.shadow(starSdf, { bbox: around(0, -1.2, 0.32) });
    cv.shape(starSdf, metal(starSdf, RAMPS.gold, { bevel: 0.05, contrast: 1.6, spec: 0.9, shininess: 26 }), { bbox: around(0, -1.2, 0.24) });
    sparkle(cv, -0.05, -1.26, 0.08, WHITE);
    twinkles(cv, 25, 16, "#f2f8ff");
}

// ============================================================
// New Year's Day: a midnight-blue band flecked with gold between gold
// trims, fireworks bursting all around it.
// ============================================================
const MIDNIGHT = ramp([[0, "#02040f"], [0.3, "#0b1638"], [0.52, "#1b2f6b"], [0.7, "#3a56a8"], [0.86, "#9db4ff"], [1, "#ffffff"]]);

// A firework burst at (x, y): rays fading out from its heart, a spark at each tip.
function burst(cv, x, y, r, color, rays, seed) {
    const c = hex(color);
    const random = rng(seed);
    cv.glow(circle(x, y, r * 0.15), c, r * 0.9, 0.35, { bbox: around(x, y, r * 1.1) });
    for (let i = 0; i < rays; i++) {
        const a = (i / rays) * TAU + random() * 0.2;
        const length = r * (0.75 + 0.25 * random());
        const tip = [x + Math.cos(a) * length, y + Math.sin(a) * length];
        const ray = stroke([[x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2], tip], 0.004, 0.01);
        cv.shape(ray.sdf, (px, py) => mixc(c, WHITE, 0.5 * (1 - ray.at(px, py))), { bbox: ray.bbox, mode: "add" });
        dot(cv, tip[0] + Math.cos(a) * 0.022, tip[1] + Math.sin(a) * 0.022, 0.012, c, 0.035, 0.5);
    }
    sparkle(cv, x, y, r * 0.3, mixc(c, WHITE, 0.5));
}

function newYear(cv) {
    holidayBand(cv, MIDNIGHT, RAMPS.gold, (x, y) => 0.3 * smoothstep(0.97, 1, hash(Math.floor(x * 70), Math.floor(y * 70))));
    const bursts = [
        [0, -1.27, 0.22, "#ffd84a", 18], [-1.21, -1.21, 0.2, "#ff4fb8", 14], [1.21, -1.2, 0.19, "#3fe0ff", 14],
        [-1.2, 1.2, 0.18, "#6dff7a", 12], [-1.3, 0.05, 0.13, "#ffd84a", 10], [1.3, -0.15, 0.13, "#ff8a3a", 10],
        [0.05, 1.3, 0.13, "#e8ecff", 10],
    ];
    bursts.forEach(([x, y, r, color, rays], index) => burst(cv, x, y, r, color, rays, 40 + index));
    twinkles(cv, 41, 12, "#fff3c0");
}

// ============================================================
// Valentine's Day: a crimson band with a quilted sheen between rose-gold
// trims, glossy hearts along it, a big heart pierced by a gold arrow on top.
// ============================================================
const CRIMSON = ramp([[0, "#24000a"], [0.3, "#6b0420"], [0.52, "#b0123a"], [0.7, "#e0405e"], [0.86, "#ffa0b0"], [1, "#ffffff"]]);
const CANDY = ramp([[0, "#3a0618"], [0.3, "#a01848"], [0.55, "#e84a7e"], [0.75, "#ff8fb2"], [0.9, "#ffd6e2"], [1, "#ffffff"]]);

// A heart's outline centred on (x, y), size its half-width; its point
// is along +v before turning by angle.
function heartPoints(x, y, size, angle = 0) {
    const pts = [];
    for (let i = 0; i < 48; i++) {
        const t = (i / 48) * TAU;
        const v = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
        pts.push([Math.sin(t) ** 3 * size, (v - 0.15) * size]);
    }
    return placed(pts, x, y, angle);
}

function heart(cv, x, y, size, colorRamp, angle = 0) {
    const pts = heartPoints(x, y, size, angle);
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.shadow(sdf, { bbox: bboxOf(pts, 0.06), opacity: 0.5 });
    cv.shape(sdf, metal(sdf, colorRamp, { bevel: size * 0.45, contrast: 1.5, spec: 0.9, shininess: 28 }), { bbox: bboxOf(pts, 0.02) });
    return sdf;
}

function valentine(cv) {
    holidayBand(cv, CRIMSON, RAMPS.copper, (x, y) => 0.05 * smoothstep(0.7, 1, Math.sin((x + y) * 30) * Math.sin((x - y) * 30)));
    ornamentSpots(0.13, 0.09).forEach(({ x, y, size }, index) => heart(cv, x, y, size, index % 2 ? CANDY : CRIMSON, rad(index % 2 ? 12 : -12)));

    // The arrow's shaft first: the heart drawn over it seems pierced.
    const shaft = stroke([[-0.44, -1.1], [0.44, -1.34]], 0.012);
    cv.shadow(shaft.sdf, { bbox: shaft.bbox });
    cv.shape(shaft.sdf, metal(shaft.sdf, RAMPS.gold, { bevel: 0.012, contrast: 1.6 }), { bbox: shaft.bbox });
    polygon(cv, placed([[0, -0.04], [0.09, 0], [0, 0.04]], 0.44, -1.34, rad(-15)), sdf => metal(sdf, RAMPS.gold, { bevel: 0.02 }), { shadow: {} });
    for (const offset of [0, 0.045]) {
        polygon(cv, placed([[0, 0], [-0.06, -0.035], [-0.03, 0], [-0.06, 0.035]], -0.4 - offset, -1.11 + offset * 0.27, rad(-15)), flat("#fff0f4"));
    }
    const top = heart(cv, 0, -1.22, 0.2, CRIMSON);
    cv.glow(top, "#ff6a8a", 0.12, 0.45, { bbox: around(0, -1.22, 0.36) });
    sparkle(cv, -0.08, -1.3, 0.06, WHITE);
    twinkles(cv, 52, 12, "#ffd0dc");
}

// ============================================================
// St. Patrick's Day: an emerald band between gold trims, gold-rimmed
// shamrocks along it, a big one on top, gold coins scattered around.
// ============================================================
const EMERALD = ramp([[0, "#01140a"], [0.3, "#064a26"], [0.52, "#0f7a3e"], [0.7, "#2fae5e"], [0.86, "#a6efbf"], [1, "#ffffff"]]);
const CLOVER = ramp([[0, "#02200c"], [0.35, "#0d5a28"], [0.6, "#22963f"], [0.8, "#6fd77a"], [1, "#e6ffe0"]]);

// A shamrock at (x, y): three heart leaves, one along angle, a stem opposite.
function shamrock(cv, x, y, size, angle) {
    const back = angle + Math.PI;
    const stem = stroke(bezier([x, y], [x + Math.cos(back) * size * 0.5, y + Math.sin(back) * size * 0.5],
        [x + Math.cos(back + 0.5) * size * 0.8, y + Math.sin(back + 0.5) * size * 0.8],
        [x + Math.cos(back + 0.4) * size * 1.1, y + Math.sin(back + 0.4) * size * 1.1], 12), size * 0.07, size * 0.04);
    cv.shape(stem.sdf, metal(stem.sdf, CLOVER, { bevel: size * 0.06 }), { bbox: stem.bbox });
    for (const turn of [0, rad(120), rad(-120)]) {
        const d = angle + turn;
        const pts = heartPoints(x + Math.cos(d) * size * 0.55, y + Math.sin(d) * size * 0.55, size * 0.55, d + Math.PI / 2);
        const leaf = (px, py) => sdPolygon(px, py, pts);
        const rim = (px, py) => leaf(px, py) - size * 0.06;
        cv.shadow(rim, { bbox: bboxOf(pts, 0.08), opacity: 0.45 });
        cv.shape(rim, metal(rim, RAMPS.gold, { bevel: size * 0.06, contrast: 1.6 }), { bbox: bboxOf(pts, 0.04) });
        cv.shape(leaf, metal(leaf, CLOVER, { bevel: size * 0.3, spec: 0.6 }), { bbox: bboxOf(pts, 0.02) });
    }
}

function stPatrick(cv) {
    // Faint Celtic weave: two families of diagonal lines.
    holidayBand(cv, EMERALD, RAMPS.gold, (x, y) => 0.05 * smoothstep(0.85, 1, Math.max(Math.sin((x + y) * 34), Math.sin((x - y) * 34))));
    for (const { x, y, angle, size } of ornamentSpots(0.11, 0.08)) shamrock(cv, x, y, size, angle);
    shamrock(cv, 0, -1.24, 0.15, -Math.PI / 2);
    scatter(63, 9, 1.33, 0, (x, y) => rivet(cv, x, y, 0.03, RAMPS.gold));
    twinkles(cv, 64, 8, "#fff6c8");
}

// ============================================================
// Fête de la Musique: a night-blue band ruled like a stave between brass
// trims, a brass trumpet on top, gold notes dancing around.
// ============================================================
const NIGHT_BLUE = ramp([[0, "#020a14"], [0.3, "#08243f"], [0.52, "#134a73"], [0.7, "#2a77a8"], [0.86, "#9fd2f0"], [1, "#ffffff"]]);

const brassStroke = (cv, pts, w0, w1 = w0) => {
    const line = stroke(pts, w0, w1);
    cv.shadow(line.sdf, { bbox: line.bbox, opacity: 0.5 });
    cv.shape(line.sdf, metal(line.sdf, RAMPS.brass, { bevel: Math.max(w0, w1), contrast: 1.5, spec: 0.8 }), { bbox: line.bbox });
};

function trumpet(cv) {
    const y = -1.24;
    // The lead pipe's loop above the main tube.
    brassStroke(cv, [...bezier([-0.3, y], [-0.42, y], [-0.42, y - 0.1], [-0.3, y - 0.1], 10), [0.12, y - 0.1],
        ...bezier([0.12, y - 0.1], [0.24, y - 0.1], [0.24, y], [0.12, y], 10)], 0.016);
    brassStroke(cv, [[-0.52, y], [0.32, y]], 0.02);
    for (const x of [-0.1, -0.02, 0.06]) {
        brassStroke(cv, [[x, y + 0.03], [x, y - 0.14]], 0.018);
        rivet(cv, x, y - 0.16, 0.022, RAMPS.brass);
    }
    const flare = [];
    for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        flare.push([0.3 + t * 0.3, 0.02 + 0.13 * t ** 2.5]);
    }
    polygon(cv, [...flare.map(([x, w]) => [x, y - w]), ...flare.reverse().map(([x, w]) => [x, y + w])],
        sdf => metal(sdf, RAMPS.brass, { bevel: 0.04, contrast: 1.5, spec: 0.9, shininess: 26 }), { shadow: {} });
    polygon(cv, [[-0.52, y - 0.022], [-0.6, y - 0.04], [-0.6, y + 0.04], [-0.52, y + 0.022]], sdf => metal(sdf, RAMPS.brass, { bevel: 0.02 }));
    sparkle(cv, 0.58, -1.36, 0.05, WHITE);
}

// A gold note: its head at (x, y); flags 1 for a quaver, 0 for a crotchet.
function note(cv, x, y, size, flags) {
    const headSdf = (px, py) => sdEllipse(...toLocal(px, py, x, y, rad(-22)), size * 0.32, size * 0.22);
    const box = around(x, y, size * 0.4);
    cv.shadow(headSdf, { bbox: box, opacity: 0.5 });
    cv.shape(headSdf, metal(headSdf, RAMPS.gold, { bevel: size * 0.15, contrast: 1.6, spec: 0.8 }), { bbox: box });
    const stemX = x + size * 0.28;
    const top = y - size * 1.1;
    brassStroke(cv, [[stemX, y - size * 0.05], [stemX, top]], size * 0.045);
    if (flags) brassStroke(cv, bezier([stemX, top], [stemX + size * 0.1, top + size * 0.3], [stemX + size * 0.45, top + size * 0.35], [stemX + size * 0.3, top + size * 0.75], 12), size * 0.07, size * 0.03);
}

function musicDay(cv) {
    // Five thin stave lines along the band.
    holidayBand(cv, NIGHT_BLUE, RAMPS.brass, (x, y) => {
        const { q } = bandCoords(x, y);
        return q > 0.03 && q < 0.13 ? 0.22 * smoothstep(0.15, 0, Math.abs(Math.sin(((q - 0.035) * Math.PI) / 0.0225))) : 0;
    });
    trumpet(cv);
    for (const [x, y, size, flags] of [[-1.28, -0.45, 0.17, 1], [-1.3, 0.4, 0.14, 0], [1.26, -0.6, 0.16, 0], [1.25, 0.2, 0.15, 1],
        [-0.85, 1.3, 0.15, 1], [0.1, 1.31, 0.13, 0], [-1.22, -1.15, 0.15, 1], [1.12, -1.25, 0.13, 1]]) {
        note(cv, x, y, size, flags);
    }
    twinkles(cv, 75, 8, "#fff0c0");
}

// ============================================================
// Halloween: a dusk-purple band between copper trims, carved pumpkins
// glowing from within, the top one before a pale moon, bats around.
// ============================================================
const DUSK = ramp([[0, "#08020f"], [0.3, "#24093a"], [0.52, "#4a1670"], [0.7, "#7a33a8"], [0.86, "#d0a0ff"], [1, "#ffffff"]]);
const PUMPKIN = ramp([[0, "#2a0a00"], [0.3, "#7a2600"], [0.52, "#d45a08"], [0.72, "#ff8c1a"], [0.88, "#ffd08a"], [1, "#ffffff"]]);
const CANDLE = hex("#ffd23a");

function pumpkin(cv, x, y, r) {
    const lobes = [[-0.42, 0.5], [0.42, 0.5], [0, 0.6]];
    const sdf = (px, py) => Math.min(...lobes.map(([ox, a]) => sdEllipse(px - (x + ox * r), py - y, a * r, 0.8 * r)));
    const box = around(x, y, r * 1.1);
    cv.shadow(sdf, { bbox: box, opacity: 0.55 });
    cv.shape(sdf, metal(sdf, PUMPKIN, {
        bevel: r * 0.5, contrast: 1.4, spec: 0.6,
        // Darker grooves between the ribs.
        texture: px => -0.2 * smoothstep(0.1 * r, 0, Math.abs(Math.abs(px - x) - 0.24 * r)),
    }), { bbox: box });
    const stem = stroke([[x, y - 0.7 * r], [x + 0.08 * r, y - 0.95 * r], [x + 0.2 * r, y - 1.02 * r]], 0.09 * r, 0.06 * r);
    cv.shape(stem.sdf, metal(stem.sdf, CLOVER, { bevel: 0.06 * r }), { bbox: stem.bbox });
    const face = [
        [[-0.45, -0.05], [-0.15, -0.05], [-0.3, -0.35]],
        [[0.15, -0.05], [0.45, -0.05], [0.3, -0.35]],
        [[-0.55, 0.2], [-0.3, 0.3], [-0.18, 0.2], [0, 0.32], [0.18, 0.2], [0.3, 0.3], [0.55, 0.2], [0.3, 0.52], [0, 0.45], [-0.3, 0.52]],
    ];
    for (const part of face) {
        const pts = part.map(([u, v]) => [x + u * r, y + v * r]);
        const hole = polygon(cv, pts, (px, py) => mixc(CANDLE, WHITE, 0.4 * clamp(1 - Math.hypot(px - x, py - y) / r)));
        cv.glow(hole, CANDLE, 0.12 * r, 0.6, { bbox: bboxOf(pts, 0.12 * r) });
    }
}

// A bat at (x, y), its wings spread across, turned by angle.
function bat(cv, x, y, size, angle) {
    const wing = [[0.12, -0.38], [0.2, -0.16], [0.55, -0.42], [1, -0.18], [0.84, 0.06], [0.7, 0], [0.6, 0.16], [0.45, 0.05], [0.3, 0.24], [0.12, 0.12]];
    const half = wing.map(([u, v]) => [u * size, v * size]);
    const pts = placed([[0, -0.22 * size], ...half, [0, 0.3 * size], ...half.reverse().map(([u, v]) => [-u, v])], x, y, angle);
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.glow(sdf, "#b070ff", 0.03, 0.4, { bbox: bboxOf(pts, 0.05) });
    cv.shape(sdf, flat("#120616"), { bbox: bboxOf(pts, 0.02) });
}

function halloween(cv) {
    // Faint cobweb rings around the Avatar.
    holidayBand(cv, DUSK, RAMPS.copper, (x, y) => 0.06 * smoothstep(0.8, 1, Math.sin(Math.hypot(x, y) * 60)));
    const moon = circle(0, -1.25, 0.24);
    cv.glow(moon, "#fff4c8", 0.14, 0.45, { bbox: around(0, -1.25, 0.4) });
    cv.shape(moon, sphere(0, -1.25, 0.24, ramp([[0, "#8a8468"], [0.6, "#e8e0b8"], [1, "#fffbe8"]]), { spec: 0.2 }), { bbox: around(0, -1.25, 0.26) });
    pumpkin(cv, 0, -1.2, 0.2);
    for (const { x, y, size } of ornamentSpots(0.14, 0.09)) pumpkin(cv, x, y, size);
    for (const [x, y, size, angle] of [[-1.27, -0.5, 0.13, -15], [1.28, -0.6, 0.12, 20], [1.27, 0.35, 0.1, -10], [-1.28, 0.55, 0.11, 10],
        [-0.55, 1.3, 0.12, -5], [0.38, 1.32, 0.09, 15], [0.55, -1.36, 0.08, 10], [-0.6, -1.36, 0.09, -20]]) {
        bat(cv, x, y, size, rad(angle));
    }
}

// ============================================================
// Día de los Muertos: a magenta band between gold trims, marigolds along
// it, a sugar skull on top with flowers for eyes, petals scattered around.
// ============================================================
const FUCHSIA = ramp([[0, "#16021a"], [0.3, "#4a0a52"], [0.52, "#8a1a8a"], [0.7, "#c94fc0"], [0.86, "#ffc0f0"], [1, "#ffffff"]]);
const MARIGOLD = ramp([[0, "#3a0e00"], [0.3, "#a83a00"], [0.55, "#f07a08"], [0.75, "#ffb020"], [0.9, "#ffe27a"], [1, "#ffffff"]]);
const SUGAR = ramp([[0, "#3a3028"], [0.35, "#9d9284"], [0.65, "#e8e2d6"], [1, "#ffffff"]]);

// A marigold at (x, y): rings of round petals, the outer ones darker.
function marigold(cv, x, y, r) {
    cv.shadow(circle(x, y, r), { bbox: around(x, y, r * 1.3), opacity: 0.5 });
    for (const [ring, count, petal, shade] of [[0.68, 13, 0.34, 0.8], [0.42, 9, 0.3, 0.9], [0.16, 5, 0.26, 1]]) {
        for (let i = 0; i < count; i++) {
            const a = (i / count) * TAU + ring * 3;
            const px = x + Math.cos(a) * r * ring;
            const py = y + Math.sin(a) * r * ring;
            cv.shape(circle(px, py, r * petal), sphere(px, py, r * petal, t => MARIGOLD(t * shade), { spec: 0.3 }), { bbox: around(px, py, r * petal * 1.1) });
        }
    }
}

function sugarSkull(cv, x, y, s) {
    const skull = (px, py) => Math.min(sdCircle(px, py, x, y, s), sdBox(px, py, x, y + 0.7 * s, 0.6 * s, 0.4 * s, 0.25 * s));
    const box = [x - s * 1.1, y - s * 1.1, x + s * 1.1, y + s * 1.2];
    cv.shadow(skull, { bbox: box, opacity: 0.55 });
    cv.shape(skull, metal(skull, SUGAR, { bevel: s * 0.3, contrast: 1.2, spec: 0.5 }), { bbox: box });
    for (const [side, color] of [[-1, "#2fd6e8"], [1, "#ff4fa8"]]) {
        const ex = x + side * 0.4 * s;
        const ey = y + 0.12 * s;
        cv.shape(circle(ex, ey, 0.3 * s), flat("#1a0a1e"), { bbox: around(ex, ey, 0.32 * s) });
        flower(cv, ex, ey, 0.26 * s, color, "#e0a020", 6);
    }
    polygon(cv, heartPoints(x, y + 0.5 * s, 0.1 * s, Math.PI), flat("#1a0a1e"));
    const teethY = y + 0.85 * s;
    const mouth = stroke([[x - 0.4 * s, teethY], [x + 0.4 * s, teethY]], 0.025 * s);
    cv.shape(mouth.sdf, flat("#1a0a1e"), { bbox: mouth.bbox });
    for (let i = -3; i <= 3; i++) {
        const tooth = stroke([[x + i * 0.11 * s, teethY - 0.1 * s], [x + i * 0.11 * s, teethY + 0.1 * s]], 0.018 * s);
        cv.shape(tooth.sdf, flat("#1a0a1e"), { bbox: tooth.bbox });
    }
    marigold(cv, x, y - 0.55 * s, 0.22 * s);
}

function deadDay(cv) {
    // Faint papel picado diamonds.
    holidayBand(cv, FUCHSIA, RAMPS.gold, (x, y) => 0.06 * smoothstep(0.75, 1, Math.abs(Math.sin(x * 28)) * Math.abs(Math.sin(y * 28))));
    for (const { x, y, size } of ornamentSpots(0.13, 0.09)) marigold(cv, x, y, size);
    sugarSkull(cv, 0, -1.22, 0.17);
    scatter(86, 14, 1.28, 0.14, (x, y, random) => dot(cv, x, y, 0.016 + 0.01 * random(), hex(random() < 0.5 ? "#ff9a1a" : "#ffd040"), 0.03, 0.4));
}

// ============================================================
// Mardi Gras: a royal-purple band checked like a harlequin between gold
// trims, fans of purple, green and gold plumes along it, a masquerade
// mask on top before a fan of plumes, confetti all around.
// ============================================================
const ROYAL = ramp([[0, "#0c0218"], [0.3, "#2e0a52"], [0.52, "#5a1a96"], [0.7, "#8a4ad0"], [0.86, "#d4b0ff"], [1, "#ffffff"]]);
const JADE = ramp([[0, "#011a0e"], [0.3, "#065a30"], [0.52, "#0f9a52"], [0.7, "#3ed48a"], [0.86, "#b0ffd8"], [1, "#ffffff"]]);
const CARNIVAL = ["#b050ff", "#22c878", "#ffc830"];

// A plume of colorRamp along angle from (x, y), its barbs combed toward the tip.
function plume(cv, x, y, angle, length, width, colorRamp) {
    const pts = placed(leafPoints(length, width, { peak: 0.55, tipRound: 0.2 }), x, y, angle);
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.shadow(sdf, { bbox: bboxOf(pts, 0.06), blur: 0.03, opacity: 0.4 });
    cv.shape(sdf, (px, py, d) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        const barbs = 0.06 * Math.sin((u + Math.abs(v) * 1.5) * 150);
        const shaft = smoothstep(0.006, 0, Math.abs(v)) * 0.3;
        const edge = smoothstep(0.012, 0, -d) * -0.15;
        return colorRamp((v < 0 ? 0.6 : 0.46) + barbs + shaft + edge + 0.15 * (u / length));
    }, { bbox: bboxOf(pts, 0.02) });
}

// Plumes fanning out from (x, y) along angle, one per turn (degrees), in turn purple, green and gold.
function plumeFan(cv, x, y, angle, size, turns) {
    turns.forEach((turn, index) => plume(cv, x, y, angle + rad(turn), size, size * 0.34, [ROYAL, JADE, RAMPS.gold][index % 3]));
}

// A gold-rimmed eye mask centred on (x, y), s its half-height: purple on
// the left, green on the right.
function masqueradeMask(cv, x, y, s) {
    const lobe = side => (px, py) => sdEllipse(...toLocal(px, py, x + side * 0.5 * s, y, rad(side * 12)), 0.62 * s, 0.4 * s);
    const eye = side => (px, py) => sdLens(px, py, x + side * 0.46 * s, y - 0.04 * s, 0.24 * s, 0.11 * s, rad(side * 10));
    const nose = circle(x, y + 0.42 * s, 0.16 * s);
    const sdf = (px, py) => Math.max(Math.min(lobe(-1)(px, py), lobe(1)(px, py)), -eye(-1)(px, py), -eye(1)(px, py), -nose(px, py));
    const rim = (px, py) => sdf(px, py) - 0.05 * s;
    const box = [x - 1.25 * s, y - 0.65 * s, x + 1.25 * s, y + 0.65 * s];
    cv.shadow(rim, { bbox: box, opacity: 0.55 });
    cv.shape(rim, metal(rim, RAMPS.gold, { bevel: 0.05 * s, contrast: 1.6, spec: 0.9 }), { bbox: box });
    const left = metal(sdf, ROYAL, { bevel: 0.25 * s, spec: 0.8, shininess: 26 });
    const right = metal(sdf, JADE, { bevel: 0.25 * s, spec: 0.8, shininess: 26 });
    cv.shape(sdf, (px, py, d) => (px < x ? left : right)(px, py, d), { bbox: box });
}

function mardiGras(cv) {
    holidayBand(cv, ROYAL, RAMPS.gold, (x, y) => 0.12 * smoothstep(-0.2, 0.2, Math.sin((x + y) * 14) * Math.sin((x - y) * 14)) - 0.06);
    for (const { x, y, angle, size } of ornamentSpots(0.34, 0.26)) plumeFan(cv, x, y, angle, size, [-30, 30, 0]);
    plumeFan(cv, 0, -1.18, -Math.PI / 2, 0.3, [-50, 50, -25, 25, 0]);
    masqueradeMask(cv, 0, -1.18, 0.25);
    scatter(97, 26, 1.24, 0.2, (x, y, random) => polygon(cv,
        placed([[-0.022, -0.011], [0.022, -0.011], [0.022, 0.011], [-0.022, 0.011]], x, y, random() * TAU),
        flat(CARNIVAL[Math.floor(random() * CARNIVAL.length)])));
    twinkles(cv, 98, 8, "#fff0c0");
}

// ============================================================
// Easter: a spring-green band with a faint dotted print between gold
// trims, painted eggs at its corners, spring flowers along its sides, a
// big gold-striped egg on top between two flowers.
// ============================================================
const MEADOW = ramp([[0, "#06200a"], [0.3, "#1d5a22"], [0.52, "#3f9a3a"], [0.7, "#7fcf5e"], [0.86, "#d6f5b0"], [1, "#ffffff"]]);
// Each egg's base and stripe colours, and each flower's petals.
const EGG_COLORS = [["#ff9ec4", "#fff1a8"], ["#9fd8ff", "#ffffff"], ["#c8a6ff", "#ffe08a"], ["#ffd36a", "#ff7fa8"]];
const BLOSSOMS = ["#ffb8d8", "#fff4a0", "#b8d8ff", "#e0c0ff"];
const shaded = color => ramp([[0, mixc(color, "#000000", 0.75)], [0.35, mixc(color, "#000000", 0.3)], [0.62, color], [0.88, mixc(color, WHITE, 0.6)], [1, WHITE]]);

// A painted egg at (x, y), its narrow end along angle: a zigzag, a band
// and a row of dots of stripe on base.
function egg(cv, x, y, size, base, stripe, angle) {
    const sdf = (px, py) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        return sdEllipse(u, v, u > 0 ? 0.6 * size : 0.46 * size, 0.42 * size);
    };
    const box = around(x, y, 0.65 * size);
    const baseLit = metal(sdf, shaded(base), { bevel: 0.4 * size, spec: 0.7, shininess: 30 });
    const stripeLit = metal(sdf, shaded(stripe), { bevel: 0.4 * size, spec: 0.7, shininess: 30 });
    const dotPitch = 0.2 * size;
    cv.shadow(sdf, { bbox: box, opacity: 0.5 });
    cv.shape(sdf, (px, py, d) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        const zigzag = Math.abs(u - 0.1 * size - 0.08 * size * Math.abs((((v / (0.16 * size)) % 2) + 2) % 2 - 1)) < 0.05 * size;
        const stripeBand = Math.abs(u + 0.18 * size) < 0.04 * size;
        const dots = Math.hypot(u - 0.34 * size, ((v % dotPitch) + dotPitch) % dotPitch - dotPitch / 2) < 0.035 * size;
        return (zigzag || stripeBand || dots ? stripeLit : baseLit)(px, py, d);
    }, { bbox: box });
}

function easter(cv) {
    holidayBand(cv, MEADOW, RAMPS.gold, (x, y) => 0.06 * smoothstep(0.75, 1, Math.sin(x * 40) * Math.sin(y * 40)));
    ornamentSpots(0.3, 0.13).forEach(({ x, y, angle, size }, index) => {
        if (index < 3) {
            const [base, stripe] = EGG_COLORS[index];
            egg(cv, x, y, size, base, stripe, angle);
            return;
        }
        for (const turn of [-55, 55]) leaf(cv, x, y, angle + rad(turn), size * 1.5, size * 0.6);
        flower(cv, x, y, size, BLOSSOMS[index % BLOSSOMS.length], "#f0a020", 5, angle);
    });
    for (const side of [-1, 1]) {
        leaf(cv, side * 0.26, -1.12, -Math.PI / 2 + side * rad(70), 0.2, 0.08);
        flower(cv, side * 0.32, -1.18, 0.12, BLOSSOMS[side < 0 ? 0 : 2], "#f0a020", 5);
    }
    const [base, stripe] = EGG_COLORS[3];
    egg(cv, 0, -1.22, 0.42, base, stripe, -Math.PI / 2);
    sparkle(cv, -0.07, -1.34, 0.06, WHITE);
    twinkles(cv, 104, 10, "#fffbe0");
}

// ============================================================
// Thanksgiving: a russet band with a faint grain between copper trims,
// maple leaves in red, orange and gold at its corners, sheaves of wheat
// along its sides, a big maple leaf over crossed ears on top, leaves falling.
// ============================================================
const HARVEST = ramp([[0, "#160902"], [0.3, "#4a2208"], [0.52, "#7e3e12"], [0.7, "#b66a2a"], [0.86, "#f0c48a"], [1, "#ffffff"]]);
const AUTUMN = [
    ramp([[0, "#2a0300"], [0.35, "#8a1406"], [0.6, "#d4361a"], [0.82, "#ff8a50"], [1, "#fff0d0"]]),
    ramp([[0, "#2a0e00"], [0.35, "#9a3a04"], [0.6, "#e8720e"], [0.82, "#ffb050"], [1, "#fff4d8"]]),
    ramp([[0, "#2a1a00"], [0.35, "#8a5a04"], [0.6, "#d8a018"], [0.82, "#ffd860"], [1, "#fffbe0"]]),
];

// A maple leaf at (x, y), its middle lobe along angle: five broad,
// pointed, serrated lobes, smaller toward the stem, a vein each.
function mapleLeaf(cv, x, y, size, angle, colorRamp) {
    const outline = [];
    for (let i = 0; i < 160; i++) {
        const a = (i / 160) * TAU;
        const lobe = 0.25 + 0.75 * (1 - Math.abs(Math.sin(2.5 * a))) ** 0.6 + 0.07 * Math.abs(Math.sin(12.5 * a));
        const r = size * lobe * (0.78 + 0.22 * Math.cos(a));
        outline.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const pts = placed(outline, x, y, angle);
    const stem = stroke([[x, y], [x - Math.cos(angle) * size * 0.7, y - Math.sin(angle) * size * 0.7]], size * 0.04, size * 0.025);
    cv.shape(stem.sdf, metal(stem.sdf, HARVEST, { bevel: size * 0.03 }), { bbox: stem.bbox });
    const sdf = (px, py) => sdPolygon(px, py, pts);
    cv.shadow(sdf, { bbox: bboxOf(pts, 0.06), blur: 0.03, opacity: 0.45 });
    cv.shape(sdf, (px, py, d) => {
        const [u, v] = toLocal(px, py, x, y, angle);
        const r = Math.hypot(u, v);
        // Roughly the distance to the nearest lobe's axis.
        const vein = smoothstep(0.006, 0, (r * Math.abs(Math.sin(2.5 * Math.atan2(v, u)))) / 2.5) * 0.25;
        const edge = smoothstep(0.012, 0, -d) * -0.15;
        return colorRamp(0.55 + vein + edge + 0.12 * (r / size));
    }, { bbox: bboxOf(pts, 0.02) });
}

// An ear of wheat from (x, y) along angle: a stalk, then pairs of grains
// up to a grain at its tip, and three awns beyond it.
function wheatEar(cv, x, y, angle, length) {
    const at = t => [x + Math.cos(angle) * length * t, y + Math.sin(angle) * length * t];
    const stalk = stroke([at(0), at(0.95)], length * 0.018, length * 0.012);
    cv.shadow(stalk.sdf, { bbox: stalk.bbox, opacity: 0.4 });
    cv.shape(stalk.sdf, metal(stalk.sdf, RAMPS.gold, { bevel: length * 0.015 }), { bbox: stalk.bbox });
    const grain = (cx, cy, grainLength, grainAngle) => {
        const sdf = (px, py) => sdLens(px, py, cx, cy, grainLength, grainLength * 0.5, grainAngle);
        const box = around(cx, cy, grainLength * 1.2);
        cv.shadow(sdf, { bbox: box, blur: 0.02, opacity: 0.4 });
        cv.shape(sdf, metal(sdf, RAMPS.gold, { bevel: grainLength * 0.5, base: 0.68, contrast: 1.2, spec: 0.7 }), { bbox: box });
    };
    for (let i = 0; i < 6; i++) {
        const [gx, gy] = at(0.36 + i * 0.1);
        const grainLength = length * 0.12 * (1 - i * 0.07);
        for (const side of [-1, 1]) {
            const grainAngle = angle + side * rad(28);
            grain(gx + Math.cos(grainAngle) * grainLength, gy + Math.sin(grainAngle) * grainLength, grainLength, grainAngle);
        }
    }
    const [tx, ty] = at(1);
    grain(tx, ty, length * 0.05, angle);
    for (const turn of [-12, 0, 12]) {
        const awnAngle = angle + rad(turn);
        const awn = stroke([[tx, ty], [tx + Math.cos(awnAngle) * length * 0.22, ty + Math.sin(awnAngle) * length * 0.22]], length * 0.005, length * 0.002);
        cv.shape(awn.sdf, flat("#f0d080"), { bbox: awn.bbox });
    }
}

function thanksgiving(cv) {
    holidayBand(cv, HARVEST, RAMPS.copper, (x, y) => {
        const { s, q } = bandCoords(x, y);
        return 0.16 * (fbm(s * 4, q * 40, 3) - 0.5);
    });
    ornamentSpots(0.25, 0.34).forEach(({ x, y, angle, size }, index) => {
        if (index < 3) {
            [-38, 38, 0].forEach((turn, k) => {
                const a = angle + rad(turn);
                mapleLeaf(cv, x + Math.cos(a) * size * 0.4, y + Math.sin(a) * size * 0.4, size * (k === 2 ? 0.7 : 0.55), a, AUTUMN[(index + k) % 3]);
            });
            return;
        }
        for (const turn of [-22, 22, 0]) wheatEar(cv, x, y, angle + rad(turn), size);
    });
    for (const side of [-1, 1]) wheatEar(cv, side * 0.05, -1.1, -Math.PI / 2 + side * rad(38), 0.38);
    mapleLeaf(cv, 0, -1.22, 0.2, -Math.PI / 2, AUTUMN[0]);
    scatter(113, 12, 1.3, 0.12, (x, y, random) => mapleLeaf(cv, x, y, 0.055, random() * TAU, AUTUMN[Math.floor(random() * AUTUMN.length)]));
}

// ============================================================
// Chinese New Year: a red lacquer band with a faint lattice between gold
// trims, red lanterns at its corners, gold coins along its sides, a gold
// dragon on top chasing a flaming pearl.
// ============================================================

// A red lantern hanging upright at (x, y), size its height: gold caps, a
// cord above and a tassel below.
function lantern(cv, x, y, size) {
    const a = 0.4 * size;
    const b = 0.34 * size;
    const cord = stroke([[x, y - 0.62 * size], [x, y - 0.36 * size]], 0.01, 0.01);
    cv.shape(cord.sdf, metal(cord.sdf, RAMPS.gold, { bevel: 0.01 }), { bbox: cord.bbox });
    for (const turn of [-16, -6, 6, 16]) {
        const end = [x + Math.sin(rad(turn)) * 0.36 * size, y + 0.36 * size + Math.cos(rad(turn)) * 0.36 * size];
        const tassel = stroke([[x, y + 0.38 * size], end], 0.012, 0.004);
        cv.shape(tassel.sdf, metal(tassel.sdf, LACQUER, { bevel: 0.01, base: 0.6 }), { bbox: tassel.bbox });
    }
    const body = (px, py) => sdEllipse(px - x, py - y, a, b);
    cv.glow(body, "#ff7a2a", 0.35 * size, 0.6, { bbox: around(x, y, 1.1 * size) });
    cv.shadow(body, { bbox: around(x, y, 0.6 * size), opacity: 0.5 });
    const lacquer = metal(body, LACQUER, { bevel: 0.35 * size, spec: 0.8, shininess: 26 });
    cv.shape(body, (px, py, d) => {
        const u = clamp((px - x) / a, -1, 1);
        // Ribs bending around its sides, lit from within at its heart.
        const rib = smoothstep(0.82, 1, Math.cos(Math.asin(u) * 8));
        const heart = Math.exp(-((u * 1.4) ** 2 + ((py - y) / b * 1.6) ** 2));
        return mixc(mixc(lacquer(px, py, d), hex("#ffcf6a"), 0.45 * heart), hex("#5a0208"), 0.45 * rib);
    }, { bbox: around(x, y, a + 0.02) });
    for (const side of [-1, 1]) {
        const cap = (px, py) => sdBox(px, py, x, y + side * 0.33 * size, 0.2 * size, 0.06 * size, 0.02 * size);
        cv.shape(cap, metal(cap, RAMPS.gold, { bevel: 0.03 * size, contrast: 1.6 }), { bbox: around(x, y + side * 0.33 * size, 0.22 * size) });
    }
}

// A gold coin with its square hole at (x, y), r its radius.
function coin(cv, x, y, r) {
    const sdf = (px, py) => Math.max(sdCircle(px, py, x, y, r), -sdBox(px, py, x, y, 0.3 * r, 0.3 * r));
    cv.shadow(sdf, { bbox: around(x, y, r + 0.06), opacity: 0.5 });
    cv.shape(sdf, metal(sdf, RAMPS.gold, { bevel: 0.35 * r, contrast: 1.5, spec: 0.9 }), { bbox: around(x, y, r + 0.01) });
}

// The dragon along the top, tail on the left, head on the right, then its pearl.
function dragon(cv) {
    const path = [];
    for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        path.push([-0.8 + 1.12 * t, -1.22 + 0.09 * Math.sin(t * TAU * 1.5)]);
    }
    const halfWidthAt = t => 0.025 + 0.06 * t;
    // Red spikes along its back, drawn first so the body covers their bases.
    for (let i = 4; i < 46; i += 3) {
        const [px, py] = path[i];
        const [nx, ny] = path[i + 1];
        const w = halfWidthAt(i / 48);
        polygon(cv, placed([[-0.035, -w * 0.5], [0.035, -w * 0.5], [-0.02, -w - 0.065]], px, py, Math.atan2(ny - py, nx - px)),
            sdf => metal(sdf, LACQUER, { bevel: 0.02, base: 0.6, contrast: 1.4 }), { shadow: { opacity: 0.35 } });
    }
    // Head points with the snout along +u, scaled to the body's end.
    const HEAD = 1.5;
    const headAt = (u, v) => [0.32 + u * HEAD, -1.22 + v * HEAD];
    const mane = placed([[-0.1, -0.06], [-0.04, -0.12], [0, -0.07], [0.04, -0.13], [0.06, -0.06], [-0.02, 0.07], [-0.1, 0.06], [-0.14, 0.02]]
        .map(([u, v]) => [u * HEAD, v * HEAD]), 0.32, -1.22);
    polygon(cv, mane, sdf => metal(sdf, LACQUER, { bevel: 0.03, base: 0.6 }), { shadow: { opacity: 0.4 } });
    const horn = stroke(bezier(headAt(0.02, -0.06), headAt(-0.02, -0.12), headAt(-0.08, -0.15), headAt(-0.14, -0.15), 12), 0.018, 0.005);
    cv.shape(horn.sdf, metal(horn.sdf, BONE, { bevel: 0.015 }), { bbox: horn.bbox });
    const body = stroke(path, 0.025, 0.085);
    cv.shadow(body.sdf, { bbox: body.bbox, opacity: 0.55 });
    cv.shape(body.sdf, metal(body.sdf, RAMPS.gold, {
        bevel: 0.05, spec: 0.85, shininess: 26,
        texture: (px, py) => -0.18 * smoothstep(0.5, 1, Math.sin(body.at(px, py) * 160)),
    }), { bbox: body.bbox });
    const head = [[-0.06, -0.07], [0.03, -0.075], [0.09, -0.05], [0.17, -0.04], [0.19, -0.01], [0.17, 0.015],
        [0.1, 0.02], [0.13, 0.05], [0.08, 0.065], [0, 0.06], [-0.07, 0.04]].map(([u, v]) => headAt(u, v));
    polygon(cv, head, sdf => metal(sdf, RAMPS.gold, { bevel: 0.05, contrast: 1.5, spec: 0.9 }), { shadow: { opacity: 0.5 } });
    dot(cv, ...headAt(0.06, -0.035), 0.02, hex("#fff2a0"), 0.05, 0.7);
    dot(cv, ...headAt(0.064, -0.035), 0.009, hex("#200400"));
    for (const [control, end] of [[[0.28, -0.08], [0.24, -0.16]], [[0.26, 0.07], [0.18, 0.12]]]) {
        const whisker = stroke(bezier(headAt(0.18, 0), headAt(...control), headAt(...control), headAt(...end), 14), 0.008, 0.002);
        cv.shape(whisker.sdf, metal(whisker.sdf, RAMPS.gold, { bevel: 0.006 }), { bbox: whisker.bbox });
    }
    cv.glow(circle(0.78, -1.24, 0.065), "#ff9a3a", 0.14, 0.8, { bbox: around(0.78, -1.24, 0.24) });
    cv.shape(circle(0.78, -1.24, 0.065), sphere(0.78, -1.24, 0.065, WARM), { bbox: around(0.78, -1.24, 0.08) });
}

function chineseNewYear(cv) {
    holidayBand(cv, LACQUER, RAMPS.gold, (x, y) => 0.06 * smoothstep(0.85, 1, Math.max(Math.abs(Math.sin(x * 34)), Math.abs(Math.sin(y * 34)))) - 0.03);
    ornamentSpots(0.5, 0.11).forEach(({ x, y, size }, index) => (index < 3 ? lantern(cv, x, y, size) : coin(cv, x, y, size)));
    dragon(cv);
    twinkles(cv, 120, 12, "#ffe8a0");
}

// ============================================================
// Household: the house's pastel pink band between rose-gold trims, little
// houses with a lit window along it, a bigger one on top, its window a heart.
// ============================================================
const BLUSH = ramp([[0, "#4a1a30"], [0.25, "#a8527a"], [0.45, "#e48fb3"], [0.62, "#f4a7c6"], [0.8, "#ffdceb"], [1, "#ffffff"]]);
const ROOF = ramp([[0, "#2a0712"], [0.35, "#7e1f3c"], [0.6, "#c2456a"], [0.82, "#ef8aa6"], [1, "#ffe2ea"]]);
const WALL = ramp([[0, "#3a2a2e"], [0.4, "#c9b3ba"], [0.7, "#f6e9ee"], [1, "#ffffff"]]);

// A little house at (x, y), size its width, its roof along angle.
function house(cv, x, y, size, angle, { heartWindow = false } = {}) {
    const turn = angle + Math.PI / 2;
    const at = pts => placed(pts.map(([u, v]) => [u * size, v * size]), x, y, turn);
    polygon(cv, at([[-0.4, 0.45], [-0.4, -0.08], [0.4, -0.08], [0.4, 0.45]]), sdf => metal(sdf, WALL, { bevel: size * 0.12, spec: 0.5 }), { shadow: { opacity: 0.5 } });
    polygon(cv, at([[-0.55, -0.02], [0, -0.55], [0.55, -0.02]]), sdf => metal(sdf, ROOF, { bevel: size * 0.14, contrast: 1.5, spec: 0.8 }), { shadow: { opacity: 0.4 } });
    const [cx, cy] = at([[0, 0.17]])[0];
    if (heartWindow) {
        const pts = heartPoints(cx, cy, size * 0.17, turn);
        const sdf = (px, py) => sdPolygon(px, py, pts);
        cv.glow(sdf, "#ffd36b", size * 0.35, 0.6, { bbox: around(cx, cy, size * 0.6) });
        cv.shape(sdf, metal(sdf, WARM, { bevel: size * 0.08 }), { bbox: bboxOf(pts, 0.02) });
        return;
    }
    const pane = at([[-0.13, 0.04], [0.13, 0.04], [0.13, 0.3], [-0.13, 0.3]]);
    const sdf = (px, py) => sdPolygon(px, py, pane);
    cv.glow(sdf, "#ffd36b", size * 0.3, 0.5, { bbox: around(cx, cy, size * 0.5) });
    cv.shape(sdf, metal(sdf, WARM, { bevel: size * 0.06 }), { bbox: bboxOf(pane, 0.02) });
}

function household(cv) {
    // Faint checks, like a tablecloth.
    holidayBand(cv, BLUSH, RAMPS.copper, (x, y) => 0.05 * smoothstep(0.8, 1, Math.max(Math.sin(x * 30), Math.sin(y * 30))));
    // Upright everywhere: a house on its side reads as an arrow.
    for (const { x, y, size } of ornamentSpots(0.3, 0.24)) house(cv, x, y - size * 0.1, size, -Math.PI / 2);
    house(cv, 0, -1.24, 0.5, -Math.PI / 2, { heartWindow: true });
    twinkles(cv, 130, 12, "#ffe2ee");
}

// The frames of other rewards, by their id in the Profile Rewards module.
export const REWARD_FRAMES = [
    { id: "household", name: "Household", draw: household },
];

// The Holiday Frames, by their id in the Profile Rewards module.
export const HOLIDAY_FRAMES = [
    { id: "newYear", name: "New Year's Day", draw: newYear },
    { id: "chineseNewYear", name: "Chinese New Year", draw: chineseNewYear },
    { id: "valentine", name: "Valentine's Day", draw: valentine },
    { id: "mardiGras", name: "Mardi Gras", draw: mardiGras },
    { id: "stPatrick", name: "St. Patrick's Day", draw: stPatrick },
    { id: "easter", name: "Easter", draw: easter },
    { id: "musicDay", name: "Fete de la Musique", draw: musicDay },
    { id: "halloween", name: "Halloween", draw: halloween },
    { id: "deadDay", name: "Dia de los Muertos", draw: deadDay },
    { id: "thanksgiving", name: "Thanksgiving", draw: thanksgiving },
    { id: "christmas", name: "Christmas", draw: christmas },
];

// In Collection Tier order.
export const FRAMES = [
    { name: "Enchanted Forest", draw: enchantedForest },
    { name: "Steam and Gears", draw: steampunk },
    { name: "Arcade Neon", draw: neonArcade },
    { name: "Eternal Frost", draw: frost },
    { name: "Spice of Arrakis", draw: spiceOfArrakis },
    { name: "Arcane Grimoire", draw: arcane },
    { name: "Orbital Station", draw: orbitalStation },
    { name: "Dragon's Breath", draw: dragonBreath },
    { name: "Royal Pinball", draw: pinballRoyale },
    { name: "Celestial Legend", draw: celestialLegend },
];
