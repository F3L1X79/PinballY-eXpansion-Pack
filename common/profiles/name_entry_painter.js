// ============================================================
// Name Entry painter: layout and drawing of Name Entry, a panel centred on
// the playfield, in reference pixels (window height = REFERENCE_HEIGHT).
// Reads no text: the screen passes the words already translated.
// Only drawing: no layer, no event, no side effect.
// ============================================================

import { STEAMBALL_COLORS as COLORS, STEAMBALL_FONTS as FONTS } from "../drawing/steamball_palette.js";
import { text, oneLine, fillGradient, buttonHintsFooterRectOf, EXIT_AND_HINTS_METRICS as EXIT_AND_HINTS } from "../drawing/steamball_drawing.js";

// Above the Profile picker's layers, which stay open under it.
export const NAME_ENTRY_Z_INDEX = Object.freeze({ backdrop: 6512, texts: 6513, name: 6514, ring: 6515, buttonHints: 6516, marker: 6517 });

export const REFERENCE_HEIGHT = 1920;

const LOOK = Object.freeze({
    // The panel's width: a share of the window's, at most maxWidth.
    widthShare: 0.9, maxWidth: 900, pad: 32,
    titleH: 72, titleSize: 30, titleGap: 16,
    // Room for a line that wraps once in the narrowest window.
    lineSize: 24, lineH: 72, lineGap: 8,
    nameGap: 32, nameH: 104, nameSize: 48,
    ringGap: 44, cell: 96, cellGap: 16, characterSize: 40, ringBottomGap: 44,
    // The strip never shows fewer characters, however narrow the window.
    minCellsShown: 3,
});

const CELL_STEP = LOOK.cell + LOOK.cellGap;

// The panel and its pieces in a window referenceWidth wide, lineCount
// explanation lines under the title: an odd cellsShown, so the current
// character sits in the middle of the strip.
export function layoutNameEntry(referenceWidth, lineCount) {
    const w = Math.min(Math.round(referenceWidth * LOOK.widthShare), LOOK.maxWidth);
    const linesH = lineCount * (LOOK.lineH + LOOK.lineGap);
    const h = LOOK.pad + LOOK.titleH + LOOK.titleGap + linesH + LOOK.nameGap + LOOK.nameH + LOOK.ringGap + LOOK.cell + LOOK.ringBottomGap
        + EXIT_AND_HINTS.footerH;
    const panel = { x: Math.round((referenceWidth - w) / 2), y: Math.round((REFERENCE_HEIGHT - h) / 2), w, h };
    const x = panel.x + LOOK.pad;
    const innerW = w - 2 * LOOK.pad;
    const title = { x, y: panel.y + LOOK.pad, w: innerW, h: LOOK.titleH };
    const lines = { x, y: title.y + title.h + LOOK.titleGap, w: innerW, h: linesH };
    const name = { x, y: lines.y + lines.h + LOOK.nameGap, w: innerW, h: LOOK.nameH };
    const fitting = Math.floor((innerW + LOOK.cellGap) / CELL_STEP);
    const cellsShown = Math.max(LOOK.minCellsShown, fitting % 2 === 1 ? fitting : fitting - 1);
    const ringMiddle = { x: panel.x + Math.round((w - LOOK.cell) / 2), y: name.y + name.h + LOOK.ringGap, w: LOOK.cell, h: LOOK.cell };
    return { panel, title, lines, name, ringMiddle, cellsShown, buttonHints: buttonHintsFooterRectOf(panel) };
}

// Where the strip's cell at offset from its middle sits.
export const cellRectOf = (geometry, offset) => ({ ...geometry.ringMiddle, x: geometry.ringMiddle.x + offset * CELL_STEP });

export function drawTitle(host, dc, title, w, h) {
    oneLine(host, dc, title, { x: 0, y: 0, width: w, height: h, size: LOOK.titleSize, weight: 700, color: COLORS.gold, font: FONTS.display, align: "center" });
}

// The explanation lines, each in its own room.
export function drawLines(host, dc, lines, w) {
    lines.forEach((line, index) => {
        text(host, dc, line, { x: 0, y: index * (LOOK.lineH + LOOK.lineGap), width: w, height: LOOK.lineH, size: LOOK.lineSize, color: COLORS.description, align: "center" });
    });
}

// The name being entered, nothing but its box while empty.
export function drawName(host, dc, name, w, h) {
    dc.fillRect(0, 0, w, h, COLORS.tile);
    dc.frameRect(0, 0, w, h, 1, COLORS.border);
    if (name !== "") oneLine(host, dc, name, { x: 0, y: 0, width: w, height: h, size: LOOK.nameSize, weight: 700, font: FONTS.display, align: "center" });
}

// One character of the ring; isGreyed: choosing it does nothing for now.
export function drawCharacter(host, dc, character, isGreyed, w, h) {
    fillGradient(dc, 0, 0, w, h, COLORS.rowUnlocked, COLORS.tile);
    dc.frameRect(0, 0, w, h, 1, COLORS.border);
    oneLine(host, dc, character, { x: 0, y: 0, width: w, height: h, size: LOOK.characterSize, weight: 700, color: isGreyed ? COLORS.dim : COLORS.title, font: FONTS.display, align: "center" });
}
