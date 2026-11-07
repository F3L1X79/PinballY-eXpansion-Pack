// ============================================================
// Pixel shapes shared by the Steamball painters: diamonds, stars, rounded
// corners and capsules, drawn line by line with fillRect, the drawing context
// having no path fill. Only drawing: no layer, no event, no side effect.
// ============================================================

// A diamond centred on (centerX, centerY), drawn as stacked lines.
export function fillDiamond(dc, centerX, centerY, radius, color) {
    for (let dy = -radius; dy <= radius; dy++) {
        const half = radius - Math.abs(dy);
        dc.fillRect(Math.round(centerX - half), Math.round(centerY + dy), 2 * half + 1, 1, color);
    }
}

// How far a rounded corner eats into line i (0 = top line) of a shape.
export function cornerInset(radius, i) {
    return Math.round(radius - Math.sqrt(radius * radius - (radius - i - 0.5) ** 2));
}

// The ten corners of a five-pointed star, point up, centred on (0, 0).
function starCorners(radius) {
    const inner = radius * 0.382;
    return Array.from({ length: 10 }, (_, i) => {
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 === 0 ? radius : inner;
        return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
    });
}

// The spans [from, to] that one horizontal line through the star covers.
function starSpans(corners, dy) {
    const crossings = [];
    corners.forEach((a, i) => {
        const b = corners[(i + 1) % corners.length];
        if ((a.y <= dy) !== (b.y <= dy)) crossings.push(a.x + (dy - a.y) * (b.x - a.x) / (b.y - a.y));
    });
    crossings.sort((first, second) => first - second);
    const spans = [];
    for (let i = 0; i + 1 < crossings.length; i += 2) spans.push([crossings[i], crossings[i + 1]]);
    return spans;
}

// A five-pointed star centred on (centerX, centerY), centerX whole, drawn
// line by line; only its part between minX and maxX (centerX for a half
// star). Each line's spans round alike on both sides of the centre, so
// each half is exactly half the star.
export function fillStar(dc, centerX, centerY, radius, color, { minX = -Infinity, maxX = Infinity } = {}) {
    const corners = starCorners(radius);
    for (let dy = -radius; dy <= radius; dy++) {
        for (const [from, to] of starSpans(corners, dy + 0.5)) {
            const left = Math.max(centerX + Math.sign(from) * Math.round(Math.abs(from)), minX);
            const right = Math.min(centerX + Math.sign(to) * Math.round(Math.abs(to)), maxX);
            if (right > left) dc.fillRect(left, Math.round(centerY + dy), right - left, 1, color);
        }
    }
}

// A vertical capsule (both ends rounded), drawn line by line.
export function fillCapsule(dc, x, y, width, height, color) {
    const radius = width / 2;
    for (let i = 0; i < height; i++) {
        const fromEnd = Math.min(i, height - 1 - i);
        const inset = fromEnd < radius ? cornerInset(radius, fromEnd) : 0;
        dc.fillRect(x + inset, y + i, width - 2 * inset, 1, color);
    }
}
