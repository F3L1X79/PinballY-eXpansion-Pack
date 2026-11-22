// ============================================================
// Reads the drawn Welcome Screen as the player sees it, on the fake host:
// greeting, Daily Streak and Lost Records lines, Collection Mastery and
// Period cards, bottom row, highlighted choice, Button Hints, startup veil;
// opens it from the main menu and picks a choice like a player. Never
// loaded by PinballY.
// ============================================================

import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { WELCOME_SCREEN_Z_INDEX } from "../../common/welcome_screen/welcome_screen_painter.js";
import { shownPip } from "../levels/level_pip_reader.js";
import * as selectionMarker from "../support/selection_marker_reader.js";
import { shownLayers } from "../support/shown_layers.js";
import { buttonHintsOn } from "../support/button_hints_reader.js";

// Past the screen's turn and its fade, with time to spare.
export const WELCOME_SCREEN_OPEN_MS = 1000;
// Past the fade alone: enough for a screen drawn at its turn.
export const WELCOME_SCREEN_FADE_IN_MS = 300;

export const press = (fake, buttonCommand) => fake.fire("commandbuttondown", { command: buttonCommand, repeat: false });

// Picks the native main menu's Welcome Screen entry, titled entryTitle, and
// lets the screen open.
export async function openFromMainMenu(fake, entryTitle) {
    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    fake.selectMenuItem(entryTitle);
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
}

export const isWelcomeScreenOpen = fake => shownLayers(fake, WELCOME_SCREEN_Z_INDEX.backdrop).length > 0;

// The startup veil dimming the wheel: { shown: false } without one, else
// { shown: true, zIndex, color }.
export { readVeil as startupVeil } from "../support/opening_reader.js";

// Its layers, shown or not: none once it closed.
export const welcomeScreenLayerCount = fake => fake.drawingLayers()
    .filter(layer => Object.values(WELCOME_SCREEN_Z_INDEX).includes(layer.zIndex)).length;

// The greeting, its runs joined, without the Avatar's level pip; null
// when the screen is closed.
export function greeting(fake) {
    const header = shownLayers(fake, WELCOME_SCREEN_Z_INDEX.header);
    if (header.length === 0) return null;
    return header.flatMap(layer => {
        const texts = layer.texts();
        const pipAt = texts.indexOf(shownPip(layer));
        return pipAt < 0 ? texts : texts.filter((_, index) => index !== pipAt);
    }).join("");
}

// Whether the header shows the active Profile's Avatar.
export const headerImages = fake => shownLayers(fake, WELCOME_SCREEN_Z_INDEX.header).flatMap(layer => layer.images());

// The level pip's number on the Avatar, null when there is none.
export const headerPip = fake => shownLayers(fake, WELCOME_SCREEN_Z_INDEX.header).map(shownPip).find(pip => pip !== null) ?? null;

// The Collection Mastery card: { goal (its head), current (the count on
// its right, null at the last tier), tier (the number in its square) };
// null when the screen is closed.
export function collectionCard(fake) {
    const [layer] = shownLayers(fake, WELCOME_SCREEN_Z_INDEX.collection);
    if (!layer) return null;
    const texts = layer.texts();
    const tier = Number(texts[texts.length - 1]);
    return { goal: texts[0], current: texts.length > 2 ? texts[1] : null, tier };
}

// The Daily Streak line under the greeting, its square's count first, as
// in "3 days in a row…"; null when there is none or the screen is closed.
export function dailyStreakLine(fake) {
    const texts = shownLayers(fake, WELCOME_SCREEN_Z_INDEX.dailyStreak).flatMap(layer => layer.texts());
    return texts.length > 0 ? texts.join(" ") : null;
}

// The Lost Records line between the greeting and the cards, its texts
// joined; null when there is none or the screen is closed.
export function lostRecordsLine(fake) {
    const texts = shownLayers(fake, WELCOME_SCREEN_Z_INDEX.lostRecords).flatMap(layer => layer.texts());
    return texts.length > 0 ? texts.join(" ") : null;
}

// The images drawn on the Lost Records line: the taker's Avatar, if any.
export const lostRecordsImages = fake => shownLayers(fake, WELCOME_SCREEN_Z_INDEX.lostRecords).flatMap(layer => layer.images());

// Where each shown layer sits and how large it is, by z-index then top to
// bottom, to tell whether two screens are laid out alike.
export const welcomeScreenLayout = fake => Object.values(WELCOME_SCREEN_Z_INDEX)
    .flatMap(zIndex => shownLayers(fake, zIndex))
    .map(layer => ({ zIndex: layer.zIndex, position: layer.position(), scale: layer.scale(), canvasSize: layer.canvasSize() }))
    .sort((a, b) => a.zIndex - b.zIndex || b.position.y - a.position.y);

// The bottom row's labels, from left to right, without the mystery box
// icon's "?".
export const bottomRowLabels = fake => shownLayers(fake, WELCOME_SCREEN_Z_INDEX.rows)
    .flatMap(layer => layer.texts())
    .filter(text => text !== "?");

// Top to bottom: a layer's position is measured upward.
const topToBottom = layers => [...layers].sort((a, b) => b.position().y - a.position().y);

// Each Period Table card, top to bottom: { period, name, mastery (the
// Mastery card's head), line (the grey line, its square's Streak count
// first, as in "3 days in a row…"; null when there is none) }.
export const periodCards = fake => topToBottom(shownLayers(fake, WELCOME_SCREEN_Z_INDEX.cards)).map(layer => {
    const [period, name, mastery, ...rest] = layer.texts();
    // After the level's number in its square.
    const lineTexts = rest.slice(1);
    return { period, name, mastery, line: lineTexts.length > 0 ? lineTexts.join(" ") : null };
});

// Each card's texts as drawn, top to bottom: a "?" card's are its
// period, the Challenge's title, its progress and its line.
export const cardTexts = fake => topToBottom(shownLayers(fake, WELCOME_SCREEN_Z_INDEX.cards)).map(layer => layer.texts());

// Each card's fill colours, top to bottom: a "?" card's progress bar among them.
export const cardFills = fake => topToBottom(shownLayers(fake, WELCOME_SCREEN_Z_INDEX.cards)).map(layer => layer.fills());

// Each card's logo layer height, in reference pixels, top to bottom.
export const periodCardLogoHeights = fake => topToBottom(shownLayers(fake, WELCOME_SCREEN_Z_INDEX.logos))
    .map(layer => layer.canvasSize().height);

// Each card's period colour, top to bottom.
export const periodColors = fake => topToBottom(shownLayers(fake, WELCOME_SCREEN_Z_INDEX.cards))
    .map(layer => layer.strokes().find(stroke => "text" in stroke).color);

// Each card's logo, top to bottom: its wheel image's path, or the title
// drawn in its place.
export const periodCardLogos = fake => topToBottom(shownLayers(fake, WELCOME_SCREEN_Z_INDEX.logos))
    .map(layer => layer.images()[0] || layer.texts().join(""));

// A point of a layer's canvas, in window pixels: PinballY scales the
// canvas to ySpan of the window's height, keeping its aspect, centred on
// its position (-0.5 to 0.5 across, upward).
function toWindow(layer, window, x, y) {
    const canvas = layer.canvasSize();
    const factor = layer.scale().ySpan * window.height / canvas.height;
    const center = { x: (layer.position().x + 0.5) * window.width, y: (0.5 - layer.position().y) * window.height };
    return { x: center.x + (x - canvas.width / 2) * factor, y: center.y + (y - canvas.height / 2) * factor };
}

// The text drawn under that window point, on the screen's other layers,
// with its layer; null when there is none.
function textAt(fake, window, point) {
    const zIndexes = [WELCOME_SCREEN_Z_INDEX.header, WELCOME_SCREEN_Z_INDEX.cards, WELCOME_SCREEN_Z_INDEX.rows];
    for (const zIndex of zIndexes) {
        for (const layer of shownLayers(fake, zIndex)) {
            for (const { text, rect } of layer.strokes().filter(stroke => "text" in stroke)) {
                const from = toWindow(layer, window, rect.x, rect.y);
                const to = toWindow(layer, window, rect.x + rect.width, rect.y + rect.height);
                if (point.x >= from.x && point.x <= to.x && point.y >= from.y && point.y <= to.y) return { text, layer };
            }
        }
    }
    return null;
}

// The footer's groups of key caps and words, null when it does not show.
export const buttonHints = fake => buttonHintsOn(fake, WELCOME_SCREEN_Z_INDEX.buttonHints);

// Where a layer shows in a window of that size: PinballY centres it on its
// position and scales it to ySpan of the window's height, its canvas's
// aspect kept.
function windowRect(layer, { width, height }) {
    const canvas = layer.canvasSize();
    const h = layer.scale().ySpan * height;
    const w = h * canvas.width / canvas.height;
    const cx = (layer.position().x + 0.5) * width;
    const cy = (0.5 - layer.position().y) * height;
    return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 };
}

// In a window of that size: the footer's rect, every other shown layer's
// but the backdrop's, the marker's and the tooltips' (each { zIndex,
// left, top, right, bottom }), and whether every footer text sits inside
// the footer.
export function footerLayout(fake, size) {
    const [footer] = shownLayers(fake, WELCOME_SCREEN_Z_INDEX.buttonHints);
    const canvas = footer.canvasSize();
    const textsInside = footer.strokes().filter(stroke => "text" in stroke).every(({ rect }) =>
        rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= canvas.width + 2 && rect.y + rect.height <= canvas.height);
    const besides = ["backdrop", "buttonHints", "marker", "tooltips"];
    const pieces = Object.entries(WELCOME_SCREEN_Z_INDEX).filter(([name]) => !besides.includes(name))
        .flatMap(([, zIndex]) => shownLayers(fake, zIndex))
        .map(layer => ({ zIndex: layer.zIndex, ...windowRect(layer, size) }));
    return { footer: windowRect(footer, size), pieces, textsInside };
}

export const markerLayer = fake => selectionMarker.markerLayer(fake, WELCOME_SCREEN_Z_INDEX.marker);

// The tooltip shown beside the selected choice, null when it has none.
function shownTooltip(fake) {
    const lit = shownLayers(fake, WELCOME_SCREEN_Z_INDEX.tooltips);
    assert.ok(lit.length <= 1, "one tooltip at most");
    return lit.length > 0 ? lit[0].texts()[0] || null : null;
}

// The window point at the centre of the choice the marker surrounds.
function markedPoint(fake) {
    const layer = markerLayer(fake);
    const [backdrop] = shownLayers(fake, WELCOME_SCREEN_Z_INDEX.backdrop);
    const window = backdrop.canvasSize();
    const canvas = layer.canvasSize();
    return { window, point: toWindow(layer, window, canvas.width / 2, canvas.height / 2) };
}

// The text under the marker's centre, with its layer.
function underMarker(fake) {
    const { window, point } = markedPoint(fake);
    return textAt(fake, window, point);
}

// The header's image under the marker's centre (the Avatar), null when there is none.
export function markedImage(fake) {
    const { window, point } = markedPoint(fake);
    for (const layer of shownLayers(fake, WELCOME_SCREEN_Z_INDEX.header)) {
        for (const { image, rect } of layer.strokes().filter(stroke => "image" in stroke)) {
            const from = toWindow(layer, window, rect.x, rect.y);
            const to = toWindow(layer, window, rect.x + rect.width, rect.y + rect.height);
            if (point.x >= from.x && point.x <= to.x && point.y >= from.y && point.y <= to.y) return image;
        }
    }
    return null;
}

// The highlighted choice: { label, tooltip }, label being the text the
// marker surrounds (null for the Avatar and the cross, which show a tooltip).
export function highlighted(fake) {
    const tooltip = shownTooltip(fake);
    if (tooltip) return { label: null, tooltip };
    const found = underMarker(fake);
    return { label: found ? found.text : null, tooltip: null };
}

// The period of the card the marker surrounds whole, null for any other choice.
export function highlightedCard(fake) {
    if (shownTooltip(fake)) return null;
    const card = selectionMarker.layerUnderMarker(fake, WELCOME_SCREEN_Z_INDEX.marker, shownLayers(fake, WELCOME_SCREEN_Z_INDEX.cards));
    return card ? card.texts()[0] : null;
}

// The highlighted card's period, else the label or tooltip of the highlighted choice.
const highlightedName = fake => {
    const { label, tooltip } = highlighted(fake);
    return highlightedCard(fake) || label || tooltip;
};

// The names of every choice, in the order Next walks them from the
// highlighted one, which comes back highlighted.
export function readChoices(fake) {
    const names = [highlightedName(fake)];
    for (let guard = 0; guard < 20; guard++) {
        press(fake, "Next");
        const name = highlightedName(fake);
        if (name === names[0]) return names;
        names.push(name);
    }
    throw new Error("The highlight never came back to where it was.");
}

// Moves the highlight with Next to the choice with this label, card
// period or tooltip, then presses Select.
export function choose(fake, name) {
    for (let guard = 0; guard < 20 && highlightedName(fake) !== name; guard++) press(fake, "Next");
    assert.equal(highlightedName(fake), name, `the Welcome Screen offers "${name}"`);
    return press(fake, "Select");
}
