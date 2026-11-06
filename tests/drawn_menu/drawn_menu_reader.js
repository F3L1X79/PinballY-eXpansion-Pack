// ============================================================
// Reads the Drawn Menu as the player sees it, on the fake host: message,
// rows, footer, highlighted entry; plus helpers to open a menu, press
// buttons and choose an entry by title. Never loaded by PinballY.
// ============================================================

import { DRAWN_MENU_Z_INDEX, DRAWN_MENU_LOOK, DRAWN_MENU_MARKS } from "../../common/drawn_menu/drawn_menu_painter.js";
import { shownLayers } from "../support/shown_layers.js";

// Past the fade in, and past the glide from one entry to the next.
export const OPEN_OVER_MS = 300;
export const GLIDE_OVER_MS = 400;

const { colors: COLORS } = DRAWN_MENU_LOOK;
const MARK_NAMES = new Map(Object.entries(DRAWN_MENU_MARKS).map(([name, glyph]) => [glyph, name]));

const textsLayer = fake => shownLayers(fake, DRAWN_MENU_Z_INDEX.texts).find(layer => layer.texts().length > 0) || null;

// A dialog's title or message: drawn across the list's whole width, where
// an entry leaves room for its mark, and not in the headings' colour.
const isDialogText = stroke => stroke.rect.x < 0.5 && stroke.color !== COLORS.heading;

export const isDrawnMenuShown = fake => textsLayer(fake) !== null;

// Any of the Drawn Menu's layers shown, the backdrop or cover included.
export const isAnythingDrawn = fake => fake.drawingLayers()
    .some(layer => Object.values(DRAWN_MENU_Z_INDEX).includes(layer.zIndex) && layer.alpha > 0);

// A dialog's gold title and its message above the list (null when none;
// their wrapped lines joined as drawn, without the spaces between them),
// the message's parts drawn bolder than it, trimmed, and the rows from top to
// bottom: { kind: "entry", title, mark } (mark: "check", "radio",
// "submenu" or null; a disabled entry with its reason too),
// { kind: "heading", title } or { kind: "separator" };
// and the footer under the list ({ label, name }, null when none).
export function readDrawnMenu(fake) {
    const layer = textsLayer(fake);
    if (!layer) throw new Error("No Drawn Menu is shown.");
    let title = null;
    let message = null;
    let messageTop = null;
    const messageBold = [];
    let footer = null;
    const rows = [];
    let inSeparator = false;
    for (const stroke of layer.strokes()) {
        if (footer !== null) {
            if ("text" in stroke) footer = { ...footer, [stroke.color === COLORS.gold ? "name" : "label"]: stroke.text.trim() };
            continue;
        }
        if ("text" in stroke && stroke.color === COLORS.footerLabel && rows.length > 0) {
            // The rule above the footer is not a row.
            if (rows.at(-1).kind === "separator") rows.pop();
            footer = { label: stroke.text.trim(), name: null };
            continue;
        }
        if ("fill" in stroke) {
            // The gold line under a dialog's message is not a row.
            if ((title !== null || message !== null) && rows.length === 0) continue;
            if (!inSeparator) rows.push({ kind: "separator" });
            inSeparator = true;
            continue;
        }
        inSeparator = false;
        if (!("text" in stroke)) continue;
        if (rows.length === 0 && isDialogText(stroke) && stroke.color === COLORS.dialogTitle && message === null) {
            title = title === null ? stroke.text : `${title}${stroke.text}`;
        }
        else if (rows.length === 0 && isDialogText(stroke)) {
            // A message's dash list is a second block, a blank line below its first lines.
            const joint = messageTop === null || stroke.rect.y === messageTop ? "" : "\n\n";
            message = message === null ? stroke.text : `${message}${joint}${stroke.text}`;
            messageTop = stroke.rect.y;
            if (stroke.weight > DRAWN_MENU_LOOK.message.weight) messageBold.push(stroke.text.trim());
        }
        else if (stroke.color === COLORS.heading) rows.push({ kind: "heading", title: stroke.text });
        else if (stroke.color === COLORS.gold) rows.at(-1).mark = MARK_NAMES.get(stroke.text);
        else if (stroke.color === COLORS.reason) rows.at(-1).reason = stroke.text;
        // A disabled entry's mark, after its label, in its dimmed colour.
        else if (stroke.color === COLORS.disabledEntry && MARK_NAMES.has(stroke.text) && rows.at(-1).reason === null) {
            rows.at(-1).mark = MARK_NAMES.get(stroke.text);
        }
        else if (stroke.color === COLORS.disabledEntry) rows.push({ kind: "entry", title: stroke.text, mark: null, reason: null });
        else rows.push({ kind: "entry", title: stroke.text, mark: null });
    }
    return { title, message, messageBold, rows, footer };
}

// A dialog's title and message as drawn on the texts' canvas, each
// { color, size, weight, top, bottom } (size in points, null when not
// drawn), and the middle of the gold line under them.
export function dialogTextBoxes(fake) {
    const layer = textsLayer(fake);
    if (!layer) throw new Error("No Drawn Menu is shown.");
    const strokes = layer.strokes();
    const lineIndex = strokes.findIndex(stroke => "fill" in stroke);
    const above = strokes.slice(0, lineIndex).filter(stroke => "text" in stroke && isDialogText(stroke));
    const boxOf = stroke => stroke && ({
        color: stroke.color, size: stroke.size, weight: stroke.weight, top: stroke.rect.y, bottom: stroke.rect.y + stroke.rect.height,
    });
    return {
        title: boxOf(above.find(stroke => stroke.color === COLORS.dialogTitle)),
        message: boxOf(above.find(stroke => stroke.color !== COLORS.dialogTitle)),
        lineY: strokes[lineIndex].rect.y,
    };
}

// A dialog message's blocks as drawn, top to bottom: { text, align, top, bottom }.
export function dialogMessageBlocks(fake) {
    const layer = textsLayer(fake);
    if (!layer) throw new Error("No Drawn Menu is shown.");
    const strokes = layer.strokes();
    const lineIndex = strokes.findIndex(stroke => "fill" in stroke);
    const blocks = [];
    for (const stroke of strokes.slice(0, lineIndex)) {
        if (!("text" in stroke) || !isDialogText(stroke) || stroke.color === COLORS.dialogTitle) continue;
        const last = blocks.at(-1);
        if (last && last.top === stroke.rect.y) last.text += stroke.text;
        else blocks.push({ text: stroke.text, align: stroke.align, top: stroke.rect.y, bottom: stroke.rect.y + stroke.rect.height });
    }
    return blocks;
}

// A message as readDrawnMenu gives it, to compare with its full text.
export const squeezed = text => text.replace(/\s+/g, "");

// The entries' titles and the separators ("---"), the headings in brackets.
export const drawnMenuLines = fake => readDrawnMenu(fake).rows.map(row => {
    if (row.kind === "separator") return "---";
    return row.kind === "heading" ? `[${row.title}]` : row.title;
});

// The titles of the entries drawn with this mark ("check", "radio", "submenu").
export const markedEntries = (fake, mark) => readDrawnMenu(fake).rows.filter(row => row.mark === mark).map(row => row.title);

// The headings and entries as drawn on the texts' canvas, from top to
// bottom, a disabled entry's reason after it (kind "reason"):
// { kind, title, top, bottom, size, color, weight } (size in points).
export function drawnRowBoxes(fake) {
    const layer = textsLayer(fake);
    if (!layer) throw new Error("No Drawn Menu is shown.");
    const kinds = new Map([[COLORS.heading, "heading"], [COLORS.entry, "entry"], [COLORS.disabledEntry, "entry"], [COLORS.reason, "reason"]]);
    return layer.strokes()
        .filter(stroke => "text" in stroke && kinds.has(stroke.color) && (stroke.color === COLORS.heading || !isDialogText(stroke)))
        .map(stroke => ({
            kind: kinds.get(stroke.color), title: stroke.text, top: stroke.rect.y, bottom: stroke.rect.y + stroke.rect.height,
            size: stroke.size, color: stroke.color, weight: stroke.weight,
        }));
}

// The title of the highlighted entry, written in gold over the selection.
export function highlightedEntry(fake) {
    const layer = shownLayers(fake, DRAWN_MENU_Z_INDEX.selectedText).find(candidate => candidate.texts().length > 0);
    if (!layer) throw new Error("No entry is highlighted.");
    return layer.texts()[0];
}

// Presses the button, then lets the glide end; returns the event.
export function press(fake, buttonCommand) {
    const ev = fake.fire("commandbuttondown", { command: buttonCommand, repeat: false });
    fake.advanceTime(GLIDE_OVER_MS);
    return ev;
}

export function openMainMenu(fake) {
    fake.openMainMenu();
    fake.advanceTime(OPEN_OVER_MS);
}

export function openExitMenu(fake) {
    fake.openExitMenu();
    fake.advanceTime(OPEN_OVER_MS);
}

export function openOperatorMenu(fake) {
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
}

// Past the first of its two native openings closing.
export function openPauseMenu(fake) {
    fake.openPauseMenu();
    fake.advanceTime(OPEN_OVER_MS);
}

// Any menu, as PinballY opens it with these native items and options.
export function openMenu(fake, id, items, options = {}) {
    fake.openMenu(id, items, options);
    fake.advanceTime(OPEN_OVER_MS);
}

// Moves down to the entry with this title, then presses Select.
export function chooseEntry(fake, title, button = "Select") {
    for (let guard = 0; highlightedEntry(fake) !== title; guard++) {
        if (guard > 100) throw new Error(`No entry titled "${title}" in the Drawn Menu.`);
        press(fake, "Next");
    }
    return press(fake, button);
}
