// ============================================================
// Drawn Menu painter: the layout of a Drawn Menu in the window and the
// drawing of its live parts (texts, selected entry, backdrop, images).
// Only drawing: no layer, no event.
// - A line estimated to fit is drawn unmeasured, but for a label followed by stars; each style's line height is measured once.
// - A heading estimated too wide wraps whole, its row taller by its measured extra lines.
// ============================================================

import { STEAMBALL_COLORS as COLORS, STEAMBALL_FONTS as FONTS } from "../drawing/steamball_palette.js";
import { oneLine, text, UNBOUNDED } from "../drawing/steamball_drawing.js";
import { withAlpha } from "../mastery/table_mastery.js";
import { fillStar } from "../drawing/pixel_shapes.js";
import {
    DRAWN_MENU_PANEL_WIDTH, DRAWN_MENU_FACE_INSET, DRAWN_MENU_LIST_WIDTH, DRAWN_MENU_ENTRY_HEIGHT,
    DRAWN_MENU_SELECTION_MARGIN, DRAWN_MENU_IMAGES,
} from "./drawn_menu_images.js";

// Above the Welcome Screen, the Profile Stats and the Avatar Frame List,
// under the toasts and the Profile picker (6500), the Confetti Shower and
// the Fireworks. Exported for the tests' reader.
export const DRAWN_MENU_Z_INDEX = Object.freeze({ backdrop: 6200, panel: 6201, texts: 6202, selection: 6203, selectedText: 6204, glass: 6205 });

export const ROW_KIND = Object.freeze({ ENTRY: "entry", HEADING: "heading", SEPARATOR: "separator" });

// Sizes in pixels at the 1920 px reference height, at which the painted
// images show 1:1; the font sizes too, as in the prototype, turned into
// points for StyledText by pointsOf().
export const DRAWN_MENU_LOOK = Object.freeze({
    referenceHeight: 1920,
    // Of the window: the panel's width at most, and its height before the list scrolls.
    maxWidthShare: 0.75,
    maxHeightShare: 0.9,
    // Of the window's height from its top: where a short panel's middle
    // stands, higher than the centre; a tall one stops at the margin
    // maxHeightShare leaves above it.
    middleShare: 1 / 3,
    // From the face's gold frame to the first and after the last row.
    listTop: 54,
    listBottom: 50,
    // The shortest panel the glass's top and bottom fit in.
    minPanelHeight: Math.max(
        DRAWN_MENU_IMAGES.panel.top.height + DRAWN_MENU_IMAGES.panel.bottom.height,
        DRAWN_MENU_IMAGES.glass.top.height + DRAWN_MENU_IMAGES.glass.bottom.height),
    rowHeights: Object.freeze({ entry: DRAWN_MENU_ENTRY_HEIGHT, heading: 50, separator: 30 }),
    entry: Object.freeze({ size: 36, minSize: 28, weight: 600 }),
    heading: Object.freeze({ size: 24, weight: 600 }),
    // A dialog's title, at the entries' size and weight, then its message
    // at their weight; gap: from the message to the separator's box.
    dialogTitle: Object.freeze({ size: 36, weight: 600 }),
    message: Object.freeze({ size: 33, weight: 600, gap: 14 }),
    // Under the list, after a separator's height holding its rule: a row
    // as tall as an entry, at the entries' size, then listTop down to the
    // face's gold frame, so its text sits as far from the frame as the
    // first entry's.
    footer: Object.freeze({ height: DRAWN_MENU_ENTRY_HEIGHT, size: 36, minSize: 20, weight: 600 }),
    mark: Object.freeze({ size: 30, weight: 600, right: 36, width: 40 }),
    // A disabled entry's reason, under its label: its row taller by height,
    // the label's box shorter by lift and the reason's taller by it, so the
    // two read as one line and its note.
    reason: Object.freeze({ size: 26, minSize: 20, weight: 600, height: 32, lift: 10 }),
    // An entry's note, after its label on the same line.
    note: Object.freeze({ size: 26, weight: 600 }),
    // A note drawn as five stars (a Rating), half stars included: before,
    // the space from the label to the first star.
    stars: Object.freeze({ count: 5, radius: 11, gap: 5, before: 14 }),
    separatorWidth: 320,
    // The rows fading at an edge the list scrolls past.
    edgeAlpha: 0x60,
    colors: Object.freeze({
        entry: COLORS.title,
        heading: COLORS.dim,
        dialogTitle: COLORS.gold,
        message: COLORS.title,
        footerLabel: COLORS.description,
        gold: COLORS.gold,
        // A disabled entry: its label dimmed, dull gold under the selection,
        // and its reason; apart from the headings' and the footer's colours,
        // which the tests' reader tells the rows by. Provisional, to be
        // checked on the cabinet.
        disabledEntry: 0xFF808A98,
        disabledSelected: 0xFF9C8651,
        reason: 0xFF96A0AD,
        // An entry's note, highlighted or not: a grey of its own, which the
        // tests' reader tells from the reason's. Provisional, to be checked
        // on the cabinet.
        note: 0xFF8C96A3,
        // A Rating's stars, highlighted or not, as the Rating Plate's.
        starFilled: COLORS.gold,
        starEmpty: COLORS.track,
        backdrop: 0xB0080A0E,
        // Hides a native menu kept open under the Drawn Menu.
        cover: 0xFF000000,
    }),
});

// The glyph of each entry's mark, written in gold.
export const DRAWN_MENU_MARKS = Object.freeze({ check: "\u2713", radio: "\u25CF", submenu: "\u203A" });

const LOOK = DRAWN_MENU_LOOK;

// StyledText takes its size in points and PinballY turns it into pixels
// (size * 96 / 72): a size given in pixels would show a third bigger.
export const pointsOf = px => px * 72 / 96;

// Window pixels per reference pixel in a window ({ width, height }): its
// height's scale, zoomed out when the panel would take too much of its width.
export function menuScaleOf({ width, height }) {
    const windowScale = height / LOOK.referenceHeight;
    return windowScale * Math.min(1, LOOK.maxWidthShare * (width / windowScale) / DRAWN_MENU_PANEL_WIDTH);
}

// A dialog message's dash list (its lines from the first one starting with
// "- "), drawn left-aligned under its first lines, centred, and a blank line:
// { head, list }, list null without one (styled runs never have one).
function splitMessage(message) {
    const lines = typeof message === "string" ? message.split("\n") : [];
    const first = lines.findIndex(messageLine => messageLine.startsWith("- "));
    if (first <= 0) return { head: message, list: null };
    return { head: lines.slice(0, first).join("\n").trimEnd(), list: lines.slice(first).join("\n") };
}

// The menu's layout in the window ({ width, height }), in window pixels
// unless named "Ref" (reference pixels): k turns the one into the other.
// wrappedHeightAt(str, widthPx, { font, sizePx, weight }) measures a text
// wrapped in that width: a dialog's title and message, and the headings
// too wide for one line. around: a native menu's box, which the panel is
// centred on and grows to cover, its list centred in it.
export function computeGeometry({ width, height }, model, wrappedHeightAt, { around = null } = {}) {
    const k = menuScaleOf({ width, height });
    const zoom = k / (height / LOOK.referenceHeight);
    const listWidth = DRAWN_MENU_LIST_WIDTH * k;
    // A wrapped heading's row: a one-line heading's, taller by its other
    // lines, so that one estimated too wide that fits keeps today's height.
    const rowHeightRefOf = row => {
        if (row.kind === ROW_KIND.ENTRY && row.disabled) return LOOK.rowHeights.entry + LOOK.reason.height;
        if (row.kind !== ROW_KIND.HEADING || !headingWraps(row, listWidth, k)) return LOOK.rowHeights[row.kind];
        const style = headingStyleAt(k);
        const extraLinesHeight = wrappedHeightAt(headingTextOf(row), listWidth, style) - wrappedHeightAt("Ag", UNBOUNDED, style);
        return LOOK.rowHeights.heading + Math.max(0, extraLinesHeight) / k;
    };
    const rowHeightsRef = model.rows.map(rowHeightRefOf);
    let rowTopRef = 0;
    const rowTopsRef = rowHeightsRef.map(rowHeightRef => {
        const top = rowTopRef;
        rowTopRef += rowHeightRef;
        return top;
    });
    const rowsHeightRef = rowTopRef;
    const titleStyle = { font: FONTS.body, sizePx: LOOK.dialogTitle.size * k, weight: LOOK.dialogTitle.weight };
    const titleHeightRef = model.title === null ? 0 : wrappedHeightAt(model.title, listWidth, titleStyle) / k;
    const messageStyle = { font: FONTS.body, sizePx: LOOK.message.size * k, weight: LOOK.message.weight };
    const { head, list } = splitMessage(model.message);
    const headHeightRef = head === null ? 0 : wrappedHeightAt(head, listWidth, messageStyle) / k;
    // The list's top: under the first lines and a blank line.
    const messageListOffsetRef = list === null ? 0 : headHeightRef + wrappedHeightAt("Ag", UNBOUNDED, messageStyle) / k;
    const messageHeightRef = messageListOffsetRef + (list === null ? headHeightRef : wrappedHeightAt(list, listWidth, messageStyle) / k);
    // Under a title (never without a message), as much space above the
    // message as below it, down to the separator's line in the middle of its box.
    const messageTopRef = model.title === null ? 0 : titleHeightRef + LOOK.message.gap + LOOK.rowHeights.separator / 2;
    const headerBlockRef = model.message === null ? 0 : messageTopRef + messageHeightRef + LOOK.message.gap + LOOK.rowHeights.separator;
    const footerBlockRef = model.footer ? LOOK.rowHeights.separator + model.footer.length * LOOK.footer.height : 0;
    const listBottomRef = model.footer ? LOOK.listTop : LOOK.listBottom;
    const fixedRef = 2 * DRAWN_MENU_FACE_INSET + LOOK.listTop + listBottomRef + headerBlockRef + footerBlockRef;
    const maxPanelRef = LOOK.maxHeightShare * LOOK.referenceHeight / zoom;
    const areaHeightRef = Math.max(LOOK.rowHeights.entry, Math.min(rowsHeightRef, maxPanelRef - fixedRef));
    const panelHeightRef = Math.max(LOOK.minPanelHeight, fixedRef + areaHeightRef, around ? around.height / k : 0);
    const contentTopRef = DRAWN_MENU_FACE_INSET + LOOK.listTop + (panelHeightRef - fixedRef - areaHeightRef) / 2;
    const panelTop = around
        ? around.y + around.height / 2 - panelHeightRef * k / 2
        : Math.max(height * (1 - LOOK.maxHeightShare) / 2, height * LOOK.middleShare - panelHeightRef * k / 2);
    return {
        width,
        height,
        k,
        panel: { x: (width - DRAWN_MENU_PANEL_WIDTH * k) / 2, y: panelTop, width: DRAWN_MENU_PANEL_WIDTH * k, height: panelHeightRef * k },
        listX: (width - listWidth) / 2,
        listWidth,
        // The texts' layer: from the title or message down to the footer.
        contentTop: panelTop + contentTopRef * k,
        contentHeight: (headerBlockRef + areaHeightRef + footerBlockRef) * k,
        titleHeight: titleHeightRef * k,
        messageTop: messageTopRef * k,
        messageHeight: messageHeightRef * k,
        messageListOffset: messageListOffsetRef * k,
        // From the content's top to the separator's box under the message.
        headerHeight: (messageTopRef + messageHeightRef) * k,
        // From the content's top to the list's.
        areaOffset: headerBlockRef * k,
        areaHeight: areaHeightRef * k,
        rowTops: rowTopsRef.map(top => top * k),
        rowHeights: rowHeightsRef.map(rowHeight => rowHeight * k),
        rowsHeight: rowsHeightRef * k,
    };
}

// Each character's width in ems, rounded up for Segoe UI, so that a line
// estimated to fit surely does. Past the Latin letters (CJK, emoji...),
// a character counts as so wide that its line is always measured; the
// gold marks are known.
const NARROW_CHARS = " .,;:'!|iIlfjrt()[]-";
const WIDE_CHARS = "MWmw@%";
const LAST_LATIN_CODE = 0x24F;
const MARK_GLYPHS = Object.values(DRAWN_MENU_MARKS);
const EM_WIDTHS = Object.freeze({ narrow: 0.4, lower: 0.62, upper: 0.78, wide: 1, unknown: 100 });
const emWidthOf = char => {
    if (MARK_GLYPHS.includes(char)) return EM_WIDTHS.wide;
    if (char.codePointAt(0) > LAST_LATIN_CODE) return EM_WIDTHS.unknown;
    if (NARROW_CHARS.includes(char)) return EM_WIDTHS.narrow;
    if (WIDE_CHARS.includes(char)) return EM_WIDTHS.wide;
    return char === char.toLowerCase() ? EM_WIDTHS.lower : EM_WIDTHS.upper;
};
// In pixels, at this font size.
const estimatedWidthPx = (str, size) => [...str].reduce((width, char) => width + emWidthOf(char), 0) * size;

const headingTextOf = row => row.title.toLocaleUpperCase();
const headingStyleAt = k => ({ font: FONTS.display, sizePx: LOOK.heading.size * k, weight: LOOK.heading.weight });
// Estimated too wide for one line: wrapped, and measured.
const headingWraps = (row, width, k) => estimatedWidthPx(headingTextOf(row), headingStyleAt(k).sizePx) > width;

// One line's height for each style, measured once for the session: a
// single line's height does not depend on its text.
const lineHeights = new Map();
function lineHeightOf(host, textStyle) {
    const key = `${textStyle.font}|${textStyle.size}|${textStyle.weight}`;
    if (!lineHeights.has(key)) {
        const styled = host.createStyledText({ textAlign: "left", textStyle });
        styled.add("Ag");
        lineHeights.set(key, styled.measure(UNBOUNDED).height);
    }
    return lineHeights.get(key);
}

// One line in the box, centred; size and minSize in pixels. Measuring is
// most of a line's cost: a line estimated to fit is drawn centred by
// DirectWrite without it, and
// only one that may overflow is measured, going through oneLine(), which
// shrinks then cuts it when it is too wide.
function line(host, dc, str, { x, y, width, height, size, minSize, weight, color, font = FONTS.body }) {
    if (estimatedWidthPx(str, size) > width) {
        oneLine(host, dc, str, { x, y, width, height, size: pointsOf(size), minSize: pointsOf(minSize), weight, color, font, align: "center" });
        return;
    }
    const textStyle = { font, size: pointsOf(size), weight, color };
    const lineHeight = lineHeightOf(host, textStyle);
    const styled = host.createStyledText({ textAlign: "center", textStyle });
    styled.add(str);
    styled.draw(dc, { x, y: y + (height - lineHeight) / 2, width, height: lineHeight });
}

// The gold line fading at both ends, centred in the box, as short fills.
function drawSeparator(dc, x, y, width, height, k, alpha) {
    const lineWidth = LOOK.separatorWidth * k;
    const left = x + (width - lineWidth) / 2;
    const top = Math.round(y + height / 2);
    const steps = 32;
    for (let step = 0; step < steps; step++) {
        const middle = (step + 0.5) / steps;
        const strength = 1 - Math.abs(middle - 0.5) * 2;
        dc.fillRect(Math.round(left + step * lineWidth / steps), top, Math.ceil(lineWidth / steps), 1,
            withAlpha(LOOK.colors.gold, Math.round(0xBF * strength * alpha / 0xFF)));
    }
}

// The footer's lines under a separator, one footer row each.
function drawFooter(host, dc, lines, { x, y, width, k }) {
    const separatorHeight = LOOK.rowHeights.separator * k;
    drawSeparator(dc, x, y, width, separatorHeight, k, 0xFF);
    const height = LOOK.footer.height * k;
    lines.forEach((footerLine, index) => drawFooterLine(host, dc, footerLine, { x, y: y + separatorHeight + index * height, width, k }));
}

// A footer line's label in its muted colour and the name in gold, on one
// centred line: shrunk when estimated too wide, then the name cut with an
// ellipsis (two colours on one line, which oneLine() cannot draw).
function drawFooterLine(host, dc, { label, name }, { x, y, width, k }) {
    const labelPart = `${label} `;
    const fullSize = LOOK.footer.size * k;
    const estimated = estimatedWidthPx(labelPart + name, fullSize);
    const size = Math.max(LOOK.footer.minSize * k, estimated > width ? fullSize * width / estimated : fullSize);
    let shownName = name;
    if (estimatedWidthPx(labelPart + name, size) > width) {
        // The ellipsis counted as one em: past the Latin letters, the
        // estimate takes any character for too wide.
        while (shownName.length > 1 && estimatedWidthPx(labelPart + shownName, size) + size > width) shownName = shownName.slice(0, -1);
        shownName = `${shownName.trimEnd()}\u2026`;
    }
    const textStyle = { font: FONTS.body, size: pointsOf(size), weight: LOOK.footer.weight, color: LOOK.colors.footerLabel };
    const lineHeight = lineHeightOf(host, textStyle);
    const styled = host.createStyledText({ textAlign: "center", textStyle });
    styled.add(Object.assign({}, textStyle, { text: labelPart }));
    styled.add(Object.assign({}, textStyle, { color: LOOK.colors.gold, text: shownName }));
    const height = LOOK.footer.height * k;
    styled.draw(dc, { x, y: y + (height - lineHeight) / 2, width, height: lineHeight });
}

// A heading in capitals, on one line or wrapped whole in its row, which
// computeGeometry() made as tall as its lines.
function drawHeading(host, dc, row, { x, y, width, height, k, color }) {
    const { font, sizePx, weight } = headingStyleAt(k);
    const str = headingTextOf(row);
    if (headingWraps(row, width, k)) {
        text(host, dc, str, { x, y, width, height, size: pointsOf(sizePx), weight, color, font, align: "center" });
        return;
    }
    line(host, dc, str, { x, y, width, height, size: sizePx, minSize: sizePx, weight, color, font });
}

const markGlyphOf = row => DRAWN_MENU_MARKS[row.mark] || null;

// An entry's label then its note, smaller and grey, on one centred line:
// both shrunk alike, down to the label's minSize, when estimated too wide
// (two sizes on one line, which oneLine() cannot draw).
function drawNotedLabel(host, dc, row, { x, y, width, height, k, color }) {
    const notePart = ` ${row.note}`;
    const labelSize = LOOK.entry.size * k;
    const noteSize = LOOK.note.size * k;
    const estimated = estimatedWidthPx(row.title, labelSize) + estimatedWidthPx(notePart, noteSize);
    const shrink = Math.max(LOOK.entry.minSize / LOOK.entry.size, Math.min(1, width / estimated));
    const textStyle = { font: FONTS.body, size: pointsOf(labelSize * shrink), weight: LOOK.entry.weight, color };
    const lineHeight = lineHeightOf(host, textStyle);
    const styled = host.createStyledText({ textAlign: "center", textStyle });
    styled.add(Object.assign({}, textStyle, { text: row.title }));
    styled.add(Object.assign({}, textStyle, { size: pointsOf(noteSize * shrink), weight: LOOK.note.weight, color: LOOK.colors.note, text: notePart }));
    styled.draw(dc, { x, y: y + (height - lineHeight) / 2, width, height: lineHeight });
}

// An entry's label then five stars, gold up to its Rating (to the half
// star), on one centred line: both shrunk alike, down to the label's
// minSize, when estimated too wide. The label is measured, the stars
// being drawn where it ends.
function drawStarredLabel(host, dc, row, { x, y, width, height, k, color, shade }) {
    const { count, radius, gap, before } = LOOK.stars;
    const labelSize = LOOK.entry.size * k;
    const starsWidthAt = scale => (before + count * 2 * radius + (count - 1) * gap) * k * scale;
    const estimated = estimatedWidthPx(row.title, labelSize) + starsWidthAt(1);
    const shrink = Math.max(LOOK.entry.minSize / LOOK.entry.size, Math.min(1, width / estimated));
    const textStyle = { font: FONTS.body, size: pointsOf(labelSize * shrink), weight: LOOK.entry.weight, color };
    const styled = host.createStyledText({ textAlign: "left", textStyle });
    styled.add(row.title);
    const measured = styled.measure(UNBOUNDED);
    const labelWidth = Math.min(measured.width, width - starsWidthAt(shrink));
    const left = x + (width - labelWidth - starsWidthAt(shrink)) / 2;
    // A little wider than measured, so the label never wraps on rounding.
    styled.draw(dc, { x: left, y: y + (height - measured.height) / 2, width: labelWidth + 4, height: measured.height });
    const starRadius = Math.round(radius * k * shrink);
    const step = (2 * radius + gap) * k * shrink;
    const firstX = left + labelWidth + before * k * shrink + radius * k * shrink;
    const centerY = Math.round(y + height / 2);
    const rating = Math.min(count, Math.round(row.stars * 2) / 2);
    for (let star = 0; star < count; star++) {
        const centerX = Math.round(firstX + star * step);
        const colorUpTo = reached => shade(rating >= star + reached ? LOOK.colors.starFilled : LOOK.colors.starEmpty);
        fillStar(dc, centerX, centerY, starRadius, colorUpTo(0.5), { maxX: centerX });
        fillStar(dc, centerX, centerY, starRadius, colorUpTo(1), { minX: centerX });
    }
}

// An entry's title and mark, in its colour, in the box, and its note after
// the title (as stars for a Rating); a disabled one's reason under them, in
// smaller type, the title and mark in the top part.
function drawEntry(host, dc, row, { x, y, width, height: rowHeight, k, color, markColor, reasonColor, shade = same => same }) {
    const markRoom = (LOOK.mark.right + LOOK.mark.width) * k;
    const labelHeight = row.disabled ? (LOOK.rowHeights.entry - LOOK.reason.lift) * k : rowHeight;
    const labelBox = { x: x + markRoom, y, width: width - 2 * markRoom, height: labelHeight };
    if (typeof row.stars === "number") drawStarredLabel(host, dc, row, { ...labelBox, k, color, shade });
    else if (row.note) drawNotedLabel(host, dc, row, { ...labelBox, k, color });
    else line(host, dc, row.title, { ...labelBox, size: LOOK.entry.size * k, minSize: LOOK.entry.minSize * k, weight: LOOK.entry.weight, color });
    const mark = markGlyphOf(row);
    if (mark) {
        line(host, dc, mark, {
            x: x + width - markRoom, y, width: LOOK.mark.width * k, height: labelHeight,
            size: LOOK.mark.size * k, minSize: LOOK.mark.size * k, weight: LOOK.mark.weight, color: markColor,
        });
    }
    if (!row.disabled) return;
    line(host, dc, row.reason, {
        x: x + markRoom, y: y + labelHeight, width: width - 2 * markRoom, height: rowHeight - labelHeight,
        size: LOOK.reason.size * k, minSize: LOOK.reason.minSize * k, weight: LOOK.reason.weight, color: reasonColor,
    });
}

// The texts' layer, on a canvas of the content's size: a dialog's title
// and message, then the rows shown at this scroll (whole rows only), those
// at an edge the list scrolls past faded, then the footer.
export function drawTexts(host, dc, geometry, model, scroll) {
    const { k, listWidth, areaOffset, areaHeight } = geometry;
    if (model.title !== null) {
        text(host, dc, model.title, {
            x: 0, y: 0, width: listWidth, height: geometry.titleHeight,
            size: pointsOf(LOOK.dialogTitle.size * k), weight: LOOK.dialogTitle.weight, color: LOOK.colors.dialogTitle, align: "center",
        });
    }
    if (model.message !== null) {
        const { head, list } = splitMessage(model.message);
        const style = { x: 0, width: listWidth, size: pointsOf(LOOK.message.size * k), weight: LOOK.message.weight, color: LOOK.colors.message };
        if (list === null) {
            text(host, dc, head, { ...style, y: geometry.messageTop, height: geometry.messageHeight, align: "center" });
        } else {
            text(host, dc, head, { ...style, y: geometry.messageTop, align: "center" });
            text(host, dc, list, { ...style, y: geometry.messageTop + geometry.messageListOffset, align: "left" });
        }
        drawSeparator(dc, 0, geometry.headerHeight + LOOK.message.gap * k, listWidth, LOOK.rowHeights.separator * k, k, 0xFF);
    }
    const canScrollUp = scroll > 0.5;
    const canScrollDown = scroll + areaHeight < geometry.rowsHeight - 0.5;
    const edge = LOOK.rowHeights.entry * k;
    model.rows.forEach((row, index) => {
        const top = geometry.rowTops[index] - scroll;
        const height = geometry.rowHeights[index];
        if (top < -0.5 || top + height > areaHeight + 0.5) return;
        const faded = (canScrollUp && top < edge) || (canScrollDown && top + height > areaHeight - edge);
        const alpha = faded ? LOOK.edgeAlpha : 0xFF;
        const shade = color => (faded ? withAlpha(color, alpha) : color);
        const box = { x: 0, y: areaOffset + top, width: listWidth, height };
        if (row.kind === ROW_KIND.SEPARATOR) {
            drawSeparator(dc, box.x, box.y, box.width, box.height, k, alpha);
        } else if (row.kind === ROW_KIND.HEADING) {
            drawHeading(host, dc, row, { ...box, k, color: shade(LOOK.colors.heading) });
        } else if (row.disabled) {
            const color = shade(LOOK.colors.disabledEntry);
            drawEntry(host, dc, row, { ...box, k, color, markColor: color, reasonColor: shade(LOOK.colors.reason), shade });
        } else {
            drawEntry(host, dc, row, { ...box, k, color: shade(LOOK.colors.entry), markColor: shade(LOOK.colors.gold), shade });
        }
    });
    if (model.footer) drawFooter(host, dc, model.footer, { x: 0, y: areaOffset + areaHeight, width: listWidth, k });
}

// The selected entry in gold, on a canvas of its row's size (height); a
// disabled one in dull gold over its reason.
export function drawSelectedText(host, dc, geometry, row, height) {
    const box = { x: 0, y: 0, width: geometry.listWidth, height, k: geometry.k };
    if (row.disabled) {
        const color = LOOK.colors.disabledSelected;
        drawEntry(host, dc, row, { ...box, color, markColor: color, reasonColor: LOOK.colors.reason });
        return;
    }
    drawEntry(host, dc, row, { ...box, color: LOOK.colors.gold, markColor: LOOK.colors.gold });
}

// The translucent backdrop, or the opaque cover.
// cover: null, the backdrop alone; WHOLE_WINDOW, opaque all over; or a
// { x, y, width, height } box made opaque on the backdrop, hiding a native menu.
export function drawBackdrop(dc, cover = null) {
    const { width, height } = dc.getSize();
    if (cover === WHOLE_WINDOW) {
        dc.fillRect(0, 0, width, height, LOOK.colors.cover);
        return;
    }
    dc.fillRect(0, 0, width, height, LOOK.colors.backdrop);
    if (cover) dc.fillRect(cover.x, cover.y, cover.width, cover.height, LOOK.colors.cover);
}

// The box hiding PinballY's menu of these native items: nativeMenuBox()
// with a margin all round.
export function nativeMenuCover(size, items, options) {
    const box = nativeMenuBox(size, items, options);
    const margin = NATIVE_MENU.coverMargin * size.height / LOOK.referenceHeight;
    return { x: box.x - margin, y: box.y - margin, width: box.width + 2 * margin, height: box.height + 2 * margin };
}

export const WHOLE_WINDOW = "whole window";

// PinballY's own menu layout (ShowMenu, AdjustSpritePosition and
// CreateGPFont in its source; docs/pinbally/pinbally-help.md, 4.2), in its
// 1920 reference pixels of the window's height.
const NATIVE_MENU = Object.freeze({
    width: 810, border: 4, spacer: 12, linePadding: 8, maxPagedHeight: 1440, minPerPage: 4,
    // Its font's line spacing over its em size, unknown to scripts: above
    // the usual 1.15 to 1.33, for the cover to err on the large side.
    lineSpacing: 1.35,
    defaultFontPoints: 42,
    // Around the box, for a font with a larger line spacing still.
    coverMargin: 8,
});

// The point size of PinballY's MenuFont setting ("<size> <weight> <family>",
// "*" for its default).
export function menuFontPointsOf(setting) {
    const points = parseFloat(String(setting || "").trim().split(/\s+/)[0]);
    return Number.isFinite(points) && points > 0 ? points : NATIVE_MENU.defaultFontPoints;
}

// Where PinballY draws its menu of these native items, in window pixels:
// centred across, a quarter of the height down unless that leaves less
// than a sixteenth above it; Page Up and Page Down count only when paging.
export function nativeMenuBox({ width, height }, items, { menuFontPoints, pagingCommands = [] }) {
    const [pageUp, pageDown] = pagingCommands;
    const lineHeight = Math.ceil(menuFontPoints * 96 / 72 * NATIVE_MENU.lineSpacing) + NATIVE_MENU.linePadding;
    let menuHeight = 2 * NATIVE_MENU.border;
    let inPaged = false;
    let hasPaged = false;
    let pagedCount = 0;
    for (const item of items) {
        menuHeight += item.cmd === -1 && !item.title ? NATIVE_MENU.spacer : lineHeight;
        if (item.cmd === pageUp) inPaged = hasPaged = true;
        else if (item.cmd === pageDown) inPaged = false;
        else if (inPaged) pagedCount++;
    }
    if (hasPaged) {
        const unpaged = menuHeight - 2 * lineHeight;
        if (pagedCount > NATIVE_MENU.minPerPage && unpaged > NATIVE_MENU.maxPagedHeight) {
            for (let perPage = pagedCount; perPage > NATIVE_MENU.minPerPage && menuHeight > NATIVE_MENU.maxPagedHeight; perPage--) menuHeight -= lineHeight;
        } else {
            menuHeight = unpaged;
        }
    }
    const unit = height / LOOK.referenceHeight;
    const boxHeight = menuHeight * unit;
    const offset = Math.min(0.25, 0.5 - menuHeight / LOOK.referenceHeight / 2 - 1 / 16);
    const boxWidth = NATIVE_MENU.width * unit;
    return { x: (width - boxWidth) / 2, y: height * (0.5 - offset) - boxHeight / 2, width: boxWidth, height: boxHeight };
}

// The selection's outline image with its glow margin, in window pixels,
// stretched for a row taller than an entry (a disabled entry's reason):
// the glow margin grows with it, so the whole image grows as the row does
// for the frame inside it to cover the row.
export function selectionSize(geometry, rowHeight) {
    const { selection } = DRAWN_MENU_IMAGES;
    const height = selection.height * geometry.k * rowHeight / (LOOK.rowHeights.entry * geometry.k);
    return { width: selection.width * geometry.k, height, margin: DRAWN_MENU_SELECTION_MARGIN * geometry.k };
}
