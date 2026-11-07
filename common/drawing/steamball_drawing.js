// ============================================================
// Steamball drawing helpers shared by the drawn screens and the Profile
// badge: texts, fills, glows, backdrop and panel, Avatar and Avatar Frame,
// wheel logo, Exit Button, Button Hints, Player Level pip.
// Only drawing, on the context given: no layer, no event, no side effect.
// ============================================================

import { STEAMBALL_COLORS as COLORS, STEAMBALL_FONTS as FONTS, RANK_COLORS } from "./steamball_palette.js";
import { mix, withAlpha, WHITE } from "../mastery/table_mastery.js";
import { playerLevelMetalOf } from "../levels/player_level.js";

const TOOLTIP = Object.freeze({ color: 0xFF0C0C0E, size: 22, weight: 400, height: 52, padX: 28, radius: 6, arrow: 10 });

// Measured unbounded: within a width, it would wrap instead.
export const UNBOUNDED = 100000;
// The wheel dimmed behind a drawn screen's panel.
export const DIMMED_WHEEL = 0xD0080A0E;

// Wraps within width, centred in height when given.
// str: a string, or runs (strings and StyledText descriptors such as
// { text, weight }) whose own style overrides the base one.
export function addStyledText(styled, str) {
    for (const run of Array.isArray(str) ? str : [str]) styled.add(run);
}

// The width of str on one line, in whole pixels.
export function measureWidth(host, str, { size, weight, font = FONTS.body }) {
    const styled = host.createStyledText({ textAlign: "left", textStyle: { font, size, weight, color: COLORS.title } });
    styled.add(str);
    return Math.ceil(styled.measure(UNBOUNDED).width);
}

export function text(host, dc, str, { x, y, width, height, size, weight = 400, color = COLORS.title, font = FONTS.body, align = "left" }) {
    const styled = host.createStyledText({ textAlign: align, textStyle: { font, size, weight, color } });
    addStyledText(styled, str);
    const measured = styled.measure(width).height;
    const top = height === undefined ? y : y + (height - measured) / 2;
    styled.draw(dc, { x, y: top, width, height: measured });
}

// One line of text in width: the size goes down to minSize, then the end
// gives way to "…" unless cut is false (a time is never cut). Returns the width drawn.
export function oneLine(host, dc, str, { x, y, width, height, size, minSize = size, weight = 600, color = COLORS.title, font = FONTS.body, align = "left", cut = true }) {
    const styledAt = (candidate, fontSize) => {
        const styled = host.createStyledText({ textAlign: "left", textStyle: { font, size: fontSize, weight, color } });
        styled.add(candidate);
        return styled;
    };
    const fits = styled => styled.measure(UNBOUNDED).width <= width;
    let fontSize = size;
    let styled = styledAt(str, fontSize);
    while (!fits(styled) && fontSize > minSize) styled = styledAt(str, --fontSize);
    for (let end = str.length - 1; cut && !fits(styled) && end > 1; end--) styled = styledAt(`${str.slice(0, end).trimEnd()}…`, fontSize);
    const measured = styled.measure(UNBOUNDED);
    const top = height === undefined ? y : y + (height - measured.height) / 2;
    // A little wider than measured, so the line never wraps on rounding.
    if (align === "left") {
        styled.draw(dc, { x, y: top, width: width + 4, height: measured.height });
    } else {
        const left = align === "right" ? x + width - measured.width : x + (width - measured.width) / 2;
        styled.draw(dc, { x: left, y: top, width: measured.width + 4, height: measured.height });
    }
    return measured.width;
}

// Text wrapped in the box and centred in its height: the size goes down
// to minSize until every line fits, then the end gives way to "…".
export function textInBox(host, dc, str, { x, y, width, height, size, minSize = size, weight = 600, color = COLORS.title, font = FONTS.body }) {
    const styledAt = (candidate, fontSize) => {
        const styled = host.createStyledText({ textAlign: "left", textStyle: { font, size: fontSize, weight, color } });
        styled.add(candidate);
        return styled;
    };
    const fits = styled => styled.measure(width).height <= height;
    let fontSize = size;
    let styled = styledAt(str, fontSize);
    while (!fits(styled) && fontSize > minSize) styled = styledAt(str, --fontSize);
    for (let cut = str.length - 1; !fits(styled) && cut > 1; cut--) styled = styledAt(`${str.slice(0, cut).trimEnd()}…`, fontSize);
    const measured = styled.measure(width).height;
    styled.draw(dc, { x, y: y + (height - measured) / 2, width, height: measured });
}

export function fillDisc(dc, cx, cy, r, color) {
    for (let dy = -r; dy < r; dy++) {
        const half = Math.round(Math.sqrt(r * r - (dy + 0.5) * (dy + 0.5)));
        dc.fillRect(Math.round(cx - half), Math.round(cy + dy), 2 * half, 1, color);
    }
}

export function fillRounded(dc, x, y, w, h, r, color) {
    dc.fillRect(x + r, y, w - 2 * r, h, color);
    dc.fillRect(x, y + r, r, h - 2 * r, color);
    dc.fillRect(x + w - r, y + r, r, h - 2 * r, color);
    for (const [cx, cy] of [[x + r, y + r], [x + w - r, y + r], [x + r, y + h - r], [x + w - r, y + h - r]]) fillDisc(dc, cx, cy, r, color);
}

// In 4-pixel bands: the drawing context has no gradient fill.
export function fillGradient(dc, x, y, w, h, top, bottom) {
    for (let row = 0; row < h; row += 4) dc.fillRect(x, y + row, w, Math.min(4, h - row), mix(top, bottom, row / Math.max(1, h - 1)));
}

export function glow(dc, x, y, w, h, color, rings, peak) {
    for (let ring = rings; ring >= 1; ring--) {
        dc.frameRect(x - ring, y - ring, w + 2 * ring, h + 2 * ring, 1, withAlpha(color, Math.round(peak * (1 - ring / (rings + 1)))));
    }
}

// The Player Level's colour (pip, Level Toast, Profile Stats card): its
// Rank's metal, a little lighter at each level up to the next Rank.
export function playerLevelColorOf(level) {
    const { rank, progress } = playerLevelMetalOf(level);
    return mix(RANK_COLORS[rank], WHITE, 0.3 * progress);
}

const LEVEL_PIP_RATIO = 1 / 4;

// Where the level pip sits on an Avatar whose box, frame included, is side
// pixels from (x, y): on its bottom-right corner, in the same proportions on
// the Profile badge, the Welcome Screen and the Profile picker. The pip is
// ratio of the side high; its centre sits inside the corner by 9/34 of it.
export function levelPipOn(x, y, side, ratio = LEVEL_PIP_RATIO) {
    const inset = side * ratio * 9 / 34;
    return { cx: x + side - inset, cy: y + side - inset, size: Math.round(side * ratio) };
}

// The Player Level pip, centred on (cx, cy), size pixels high: round, in
// the metal of the level (Bronze up to Platinum), widening into an oval for three digits or more.
// A dark ring keeps it apart from any Avatar.
export function drawLevelPip(host, dc, level, cx, cy, size) {
    const number = String(level);
    const styled = host.createStyledText({ textAlign: "center", textStyle: { font: FONTS.display, size: Math.round(size * 0.6), weight: 700, color: COLORS.panel } });
    styled.add(number);
    const measured = styled.measure(UNBOUNDED);
    const ring = Math.max(2, Math.round(size / 14));
    // Even, so the round ends have a whole radius.
    const height = 2 * Math.round((size - 2 * ring) / 2);
    const width = number.length < 3 ? height : Math.max(height, Math.ceil(measured.width) + height / 2);
    const x = Math.round(cx - width / 2);
    const y = Math.round(cy - height / 2);
    fillPill(dc, x - ring, y - ring, width + 2 * ring, height + 2 * ring, COLORS.tile);
    fillPill(dc, x, y, width, height, playerLevelColorOf(level));
    styled.draw(dc, { x, y: y + (height - measured.height) / 2, width, height: measured.height });
}

// A disc when as wide as high, an oval with round ends when wider.
function fillPill(dc, x, y, w, h, color) {
    const r = h / 2;
    if (w > h) dc.fillRect(Math.round(x + r), y, Math.round(w - h), h, color);
    fillDisc(dc, x + r, y + r, r, color);
    if (w > h) fillDisc(dc, x + w - r, y + r, r, color);
}

// An Avatar Frame reaches this share of the Avatar's size beyond it on
// every side: the image's middle two thirds is the Avatar's box.
export const AVATAR_FRAME_MARGIN = 0.25;

export const avatarFrameSide = avatarSize => avatarSize * (1 + 2 * AVATAR_FRAME_MARGIN);

// The room to leave on every side of an Avatar size pixels wide for its
// frame framePath: none for null.
export const avatarFrameInset = (framePath, size) => (framePath ? size * AVATAR_FRAME_MARGIN : 0);

// The Avatar Frame image framePath around the Avatar's box at (x, y), size
// pixels wide; nothing for null. Drawn after the Avatar and before the
// Player Level pip, which stays on top.
export function drawAvatarFrame(dc, framePath, x, y, size) {
    if (!framePath) return;
    const margin = size * AVATAR_FRAME_MARGIN;
    dc.drawImage(framePath, x - margin, y - margin, avatarFrameSide(size), avatarFrameSide(size));
}

export function drawAvatar(dc, path, x, y, size) {
    dc.fillRect(x, y, size, size, COLORS.tile);
    if (path) dc.drawImage(path, x + 3, y + 3, size - 6, size - 6);
    dc.frameRect(x, y, size, size, 3, COLORS.border);
}

// The Exit Button's two looks: the back arrow where Exit brings back a
// screen or a menu, the cross where it leaves the bare wheel.
export const EXIT_BUTTON_LOOK = Object.freeze({ BACK: "back", CLOSE: "close" });

// The Exit Button and the Button Hints' footer of a drawn screen, in
// reference pixels (the window's height is 1920): the button's side, the
// room on its left for its tooltip and the margin round both on the
// tooltip's layer; the footer's gap above it, its height down to the
// panel's bottom (the Achievement List's band, 112, at hintsScale, so the
// hints keep its room above and below them), and the hints' look at
// hintsScale times the Achievement List's.
export const EXIT_AND_HINTS_METRICS = Object.freeze({
    exitButton: 56, exitTooltipRoom: 240, tooltipMargin: 16,
    footerGap: 16, footerH: 168, hintsScale: 1.5,
});

// The footer band's gradient top, a step lighter than the panel.
const FOOTER_TOP_COLOR = 0xFF1C2330;

// The Exit Button on a small tile, size pixels wide: the cross or the back arrow.
export function drawExitButton(dc, look, x = 0, y = 0, size = EXIT_AND_HINTS_METRICS.exitButton) {
    fillGradient(dc, x, y, size, size, COLORS.rowUnlocked, COLORS.tile);
    dc.frameRect(x, y, size, size, 2, COLORS.border);
    if (look === EXIT_BUTTON_LOOK.BACK) drawBackArrow(dc, x, y, size);
    else drawCross(dc, x, y, size);
}

// The back arrow's centre line in a 128-pixel box: a chevron pointing
// left on the top stroke, which runs right, turns down round a half circle
// and comes back left, all in round-ended strokes 12 pixels thick.
const BACK_ARROW = Object.freeze({
    box: 128, thickness: 12, extent: { x: 10, y: 18, w: 98, h: 82 },
    lines: [[16, 46, 38, 24], [16, 46, 38, 68], [16, 46, 78, 46], [78, 94, 58, 94]],
    hook: { cx: 78, cy: 70, r: 24 },
});

// The back arrow, its strokes as thick as the cross's and its width this
// share of the tile, centred on it.
const BACK_ARROW_SHARE = 0.46;

// In the cross's colour: both are the same button, only Exit's way differs.
function drawBackArrow(dc, x, y, size) {
    const { extent, lines, hook } = BACK_ARROW;
    const k = size * BACK_ARROW_SHARE / extent.w;
    const left = x + (size - extent.w * k) / 2 - extent.x * k;
    const top = y + (size - extent.h * k) / 2 - extent.y * k;
    const r = Math.max(3, Math.round(size / 14)) / 2;
    // A round brush stamped every pixel along the line.
    const dab = (px, py) => fillDisc(dc, left + px * k, top + py * k, r, COLORS.description);
    for (const [x0, y0, x1, y1] of lines) {
        const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * k));
        for (let step = 0; step <= steps; step++) dab(x0 + (x1 - x0) * step / steps, y0 + (y1 - y0) * step / steps);
    }
    const steps = Math.ceil(Math.PI * hook.r * k);
    for (let step = 0; step <= steps; step++) {
        const angle = -Math.PI / 2 + Math.PI * step / steps;
        dab(hook.cx + hook.r * Math.cos(angle), hook.cy + hook.r * Math.sin(angle));
    }
}

function drawCross(dc, x, y, size) {
    const inset = Math.round(size * 0.3);
    const t = Math.max(3, Math.round(size / 14));
    for (let i = 0; i <= size - 2 * inset; i++) {
        dc.fillRect(x + inset + i - 1, y + inset + i - 1, t, t, COLORS.description);
        dc.fillRect(x + size - inset - i - t + 1, y + inset + i - 1, t, t, COLORS.description);
    }
}

// The Button Hints' look at scale 1, in the Achievement List's layout
// pixels; sideMargin: the room kept free on each side of the box.
const BUTTON_HINTS = Object.freeze({ keySize: 15, keyPadding: 8, keyRadius: 6, labelSize: 18, keyGap: 8, labelGap: 12, groupGap: 48, sideMargin: 24 });

const piecesWidth = pieces => pieces.reduce((sum, piece) => sum + (piece.gap || piece.width), 0);

// The Button Hints centred in the box, both ways: groups ([{ keys: [key
// cap texts], label }]) of key caps then what they do, side by side.
// scale: the look's size against the Achievement List's; shrunk further
// when the hints would not fit in the box's width less its side margins
// (a narrow portrait panel).
export function drawButtonHints(host, dc, groups, { x, y, width, height, scale = 1 }) {
    const room = width - 2 * Math.round(BUTTON_HINTS.sideMargin * scale);
    let pieces = buttonHintPieces(host, groups, width, scale);
    const total = piecesWidth(pieces);
    if (total > room) pieces = buttonHintPieces(host, groups, width, scale * room / total);
    let pieceX = x + (width - piecesWidth(pieces)) / 2;
    for (const piece of pieces) {
        if (piece.gap) {
            pieceX += piece.gap;
            continue;
        }
        // A little wider than measured, so the last letter never wraps.
        piece.text.draw(dc, { x: pieceX, y: y + (height - piece.height) / 2, width: piece.width + 2, height: piece.height });
        pieceX += piece.width;
    }
}

// Each key cap and label measured, with the gaps between them.
function buttonHintPieces(host, groups, width, scale) {
    const look = BUTTON_HINTS;
    const px = value => Math.max(1, Math.round(value * scale));
    const keyCap = () => host.createStyledText({
        backgroundColor: COLORS.keyCap, cornerRadius: px(look.keyRadius), padding: px(look.keyPadding),
        textStyle: { font: FONTS.display, size: px(look.keySize), weight: 700, color: COLORS.title },
    });
    const label = () => host.createStyledText({ textStyle: { font: FONTS.display, size: px(look.labelSize), weight: 600, color: COLORS.description } });
    const measured = (styled, str) => {
        styled.add(str);
        const size = styled.measure(width);
        return { text: styled, width: size.width, height: size.height };
    };
    return groups.flatMap((group, index) => [
        ...(index > 0 ? [{ gap: px(look.groupGap) }] : []),
        ...group.keys.flatMap((key, keyIndex) => [...(keyIndex > 0 ? [{ gap: px(look.keyGap) }] : []), measured(keyCap(), key)]),
        { gap: px(look.labelGap) },
        measured(label(), group.label),
    ]);
}

// A web-style tooltip: a dark rounded label with a small arrow whose tip
// is at (tipX, tipY), the label on the given side of the tip.
export function tooltip(host, dc, str, tipX, tipY, side) {
    const { color, size, weight, height, padX, radius, arrow } = TOOLTIP;
    const styled = host.createStyledText({ textAlign: "center", textStyle: { font: FONTS.body, size, weight, color: WHITE } });
    styled.add(str);
    const w = Math.ceil(styled.measure(2000).width) + 2 * padX;
    const x = side === "left" ? tipX - arrow - w : tipX + arrow;
    const y = Math.round(tipY - height / 2);
    fillRounded(dc, x, y, w, height, radius, color);
    for (let i = 0; i < arrow; i++) {
        const half = arrow - i;
        if (side === "left") dc.fillRect(x + w + i, tipY - half, 1, 2 * half, color);
        else dc.fillRect(x - i - 1, tipY - half, 1, 2 * half, color);
    }
    const th = styled.measure(w).height;
    styled.draw(dc, { x, y: y + (height - th) / 2, width: w, height: th });
}

// The Exit Button's tooltip layer: round the button, room wide on its
// left for the tooltip.
export function exitTooltipRectOf(exitButton, { room = EXIT_AND_HINTS_METRICS.exitTooltipRoom, margin = EXIT_AND_HINTS_METRICS.tooltipMargin } = {}) {
    return { x: exitButton.x - room, y: exitButton.y - margin, w: room + exitButton.w + margin, h: exitButton.h + 2 * margin };
}

// The Exit Button's tooltip on that layer, in the layer's own pixels,
// pointing at the button on its right.
export function drawExitTooltip(host, dc, word, {
    buttonSize = EXIT_AND_HINTS_METRICS.exitButton, room = EXIT_AND_HINTS_METRICS.exitTooltipRoom, margin = EXIT_AND_HINTS_METRICS.tooltipMargin,
} = {}) {
    // The tip short of the button by the same share of its side on every screen.
    tooltip(host, dc, word, room - buttonSize * 9 / 28, margin + buttonSize / 2, "left");
}

// A drawn screen's footer in the box: a rule on its top, the Button Hints
// centred under it (see drawButtonHints()).
export function drawButtonHintsFooter(host, dc, groups, { x = 0, y = 0, width, height, scale = EXIT_AND_HINTS_METRICS.hintsScale }) {
    dc.fillRect(x, y, width, 1, COLORS.border);
    drawButtonHints(host, dc, groups, { x, y, width, height, scale });
}

// A drawn screen's footer band: the panel's whole width inside its border,
// from footerH above the panel's bottom.
export function buttonHintsFooterRectOf(panel) {
    const height = EXIT_AND_HINTS_METRICS.footerH;
    return { x: panel.x + 1, y: panel.y + panel.h - height, w: panel.w - 2, h: height - 1 };
}

// The footer band in the box: a gradient from a step lighter than the
// panel down to the panel, the rule from end to end, the Button Hints.
export function drawButtonHintsBand(host, dc, groups, { x = 0, y = 0, width, height, scale = EXIT_AND_HINTS_METRICS.hintsScale }) {
    fillGradient(dc, x, y, width, height, FOOTER_TOP_COLOR, COLORS.panel);
    drawButtonHintsFooter(host, dc, groups, { x, y, width, height, scale });
}

// A drawn screen's backdrop, on a window-sized canvas whose height is
// referenceHeight * scale: the dimmed wheel and the panel (in reference
// pixels), with a soft gold glow.
export function drawBackdrop(dc, { width, height }, referenceHeight, panel) {
    const scale = height / referenceHeight;
    dc.fillRect(0, 0, width, height, DIMMED_WHEEL);
    const [x, y, w, h] = [panel.x, panel.y, panel.w, panel.h].map(value => Math.round(value * scale));
    glow(dc, x, y, w, h, COLORS.gold, 6, 0x30);
    fillGradient(dc, x, y, w, h, COLORS.panelTop, COLORS.panel);
    dc.frameRect(x, y, w, h, 1, COLORS.border);
}

// A table's wheel logo ({ title, logoPath }) fitted in the box, its aspect
// kept; its title in size when it has none.
export function drawWheelLogo(host, dc, { title, logoPath }, { x, y, w, h }, size) {
    const image = logoPath ? dc.getImageSize(logoPath) : null;
    if (image && image.width > 0 && image.height > 0) {
        const scale = Math.min(w / image.width, h / image.height);
        const dw = Math.round(image.width * scale);
        const dh = Math.round(image.height * scale);
        dc.drawImage(logoPath, x + Math.round((w - dw) / 2), y + Math.round((h - dh) / 2), dw, dh);
        return;
    }
    text(host, dc, title, { x, y, width: w, height: h, size, weight: 700, font: FONTS.display, align: "center" });
}
