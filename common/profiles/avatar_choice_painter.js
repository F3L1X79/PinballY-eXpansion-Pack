// ============================================================
// Avatar Choice painter: layout and drawing of Avatar Choice, a panel
// centred on the playfield, in reference pixels (window height = REFERENCE_HEIGHT).
// Reads no text: the screen passes the words already translated.
// Only drawing: no layer, no event, no side effect.
// ============================================================

import { STEAMBALL_COLORS as COLORS, STEAMBALL_FONTS as FONTS } from "../drawing/steamball_palette.js";
import {
    text, oneLine, drawAvatar, glow, fillGradient, buttonHintsFooterRectOf, DIMMED_WHEEL, EXIT_AND_HINTS_METRICS as EXIT_AND_HINTS,
} from "../drawing/steamball_drawing.js";

// Above Name Entry's layers, which close as it opens, and the Profile
// picker's, which stay open under it; the Exit confirmation over the grid.
// Not a Drawn Menu: those are drawn under the Profile picker (6200 to 6205).
export const AVATAR_CHOICE_Z_INDEX = Object.freeze({
    backdrop: 6530, texts: 6531, portraits: 6532, exitButton: 6533, buttonHints: 6534, marker: 6535, tooltip: 6536,
    confirmationPanel: 6537, confirmationChoices: 6538, confirmationMarker: 6539,
});

export const REFERENCE_HEIGHT = 1920;

// Wide: one row per sheet of portraits (women, men, children). Tall: each
// sheet on two rows, in the same order, so the portraits stay large enough.
const GRID = Object.freeze({ wide: { columns: 8, rows: 3 }, tall: { columns: 4, rows: 6 } });

const LOOK = Object.freeze({
    // The panel's width: a share of the window's, at most maxWidth.
    widthShare: 0.9, maxWidth: 1400, pad: 32,
    // The title's line, the Exit Button at its right end.
    titleH: 72, titleSize: 30,
    nameGap: 4, nameH: 56, nameSize: 30,
    // The hint that the Avatar can be replaced from Windows: room to wrap once in the narrowest window.
    hintGap: 4, hintH: 64, hintSize: 22,
    gridGap: 24, maxCell: 150, cellGap: 10, gridBottomGap: 24,
});

// The panel and its pieces in a window referenceWidth wide: the grid's
// shape by the window's, its cells as large as the panel's width allows,
// maxCell at most.
export function layoutAvatarChoice(referenceWidth) {
    const { columns, rows } = referenceWidth < REFERENCE_HEIGHT ? GRID.tall : GRID.wide;
    const w = Math.min(Math.round(referenceWidth * LOOK.widthShare), LOOK.maxWidth);
    const innerW = w - 2 * LOOK.pad;
    const cell = Math.min(LOOK.maxCell, Math.floor((innerW - (columns - 1) * LOOK.cellGap) / columns));
    const gridW = columns * cell + (columns - 1) * LOOK.cellGap;
    const gridH = rows * cell + (rows - 1) * LOOK.cellGap;
    const h = LOOK.pad + LOOK.titleH + LOOK.nameGap + LOOK.nameH + LOOK.hintGap + LOOK.hintH + LOOK.gridGap + gridH + LOOK.gridBottomGap
        + EXIT_AND_HINTS.footerH;
    const panel = { x: Math.round((referenceWidth - w) / 2), y: Math.round((REFERENCE_HEIGHT - h) / 2), w, h };
    const x = panel.x + LOOK.pad;
    const title = { x, y: panel.y + LOOK.pad, w: innerW, h: LOOK.titleH };
    const side = EXIT_AND_HINTS.exitButton;
    const exitButton = { x: x + innerW - side, y: title.y + Math.round((title.h - side) / 2), w: side, h: side };
    const name = { x, y: title.y + title.h + LOOK.nameGap, w: innerW, h: LOOK.nameH };
    const hint = { x, y: name.y + name.h + LOOK.hintGap, w: innerW, h: LOOK.hintH };
    const grid = { x: panel.x + Math.round((w - gridW) / 2), y: hint.y + hint.h + LOOK.gridGap, cell, columns };
    return { panel, title, exitButton, name, hint, grid, buttonHints: buttonHintsFooterRectOf(panel) };
}

// Where the portrait at index sits, row by row.
export function portraitRectOf(geometry, index) {
    const { x, y, cell, columns } = geometry.grid;
    const step = cell + LOOK.cellGap;
    return { x: x + (index % columns) * step, y: y + Math.floor(index / columns) * step, w: cell, h: cell };
}

export function drawTitle(host, dc, title, w, h) {
    oneLine(host, dc, title, { x: 0, y: 0, width: w, height: h, size: LOOK.titleSize, weight: 700, color: COLORS.gold, font: FONTS.display, align: "center" });
}

// The Profile's name, whose Avatar is chosen.
export function drawName(host, dc, name, w, h) {
    oneLine(host, dc, name, { x: 0, y: 0, width: w, height: h, size: LOOK.nameSize, weight: 700, font: FONTS.display, align: "center" });
}

export function drawHint(host, dc, hint, w, h) {
    text(host, dc, hint, { x: 0, y: 0, width: w, height: h, size: LOOK.hintSize, color: COLORS.description, align: "center" });
}

export function drawPortrait(dc, path, side) {
    drawAvatar(dc, path, 0, 0, side);
}

const CONFIRMATION = Object.freeze({
    maxWidth: 760, pad: 36, questionH: 72, questionSize: 30, questionMinSize: 20,
    choiceMaxWidth: 600, choiceH: 72, choiceGap: 20, choiceSize: 26, choiceMinSize: 18,
});

// The Exit confirmation: a cover over the whole panel, the small box in its
// middle (within the panel's own padding), its question and its two
// choices, top to bottom.
export function layoutConfirmation(geometry) {
    const { panel } = geometry;
    const { pad, choiceH, choiceGap } = CONFIRMATION;
    const w = Math.min(CONFIRMATION.maxWidth, panel.w - 2 * LOOK.pad);
    const h = 2 * pad + CONFIRMATION.questionH + 2 * (choiceGap + choiceH);
    const box = { x: panel.x + Math.round((panel.w - w) / 2), y: panel.y + Math.round((panel.h - h) / 2), w, h };
    const question = { x: box.x + pad, y: box.y + pad, w: w - 2 * pad, h: CONFIRMATION.questionH };
    const choiceW = Math.min(CONFIRMATION.choiceMaxWidth, w - 2 * pad);
    const choices = [0, 1].map(index => ({
        x: box.x + Math.round((w - choiceW) / 2), y: question.y + question.h + choiceGap + index * (choiceH + choiceGap),
        w: choiceW, h: choiceH,
    }));
    return { cover: panel, box, question, choices };
}

// On the cover's canvas: the grid dimmed, then the box and its question.
export function drawConfirmationPanel(host, dc, layout, question) {
    const { cover, box } = layout;
    dc.fillRect(0, 0, cover.w, cover.h, DIMMED_WHEEL);
    const x = box.x - cover.x;
    const y = box.y - cover.y;
    glow(dc, x, y, box.w, box.h, COLORS.gold, 6, 0x30);
    fillGradient(dc, x, y, box.w, box.h, COLORS.panelTop, COLORS.panel);
    dc.frameRect(x, y, box.w, box.h, 1, COLORS.border);
    const rect = layout.question;
    oneLine(host, dc, question, {
        x: rect.x - cover.x, y: rect.y - cover.y, width: rect.w, height: rect.h,
        size: CONFIRMATION.questionSize, minSize: CONFIRMATION.questionMinSize, weight: 700, color: COLORS.gold, font: FONTS.display, align: "center",
    });
}

// A choice on its own canvas: a tile as the Exit Button's, its label centred.
export function drawConfirmationChoice(host, dc, label, w, h) {
    fillGradient(dc, 0, 0, w, h, COLORS.rowUnlocked, COLORS.tile);
    dc.frameRect(0, 0, w, h, 2, COLORS.border);
    oneLine(host, dc, label, {
        x: 0, y: 0, width: w, height: h, size: CONFIRMATION.choiceSize, minSize: CONFIRMATION.choiceMinSize, weight: 600, align: "center",
    });
}
