// ============================================================
// Reads the drawn Profile Stats as the player sees them, on the fake host:
// card texts, Player Level, Collection Mastery, foot buttons, a section by
// title, highlighted choice, Button Hints; also the Avatar Frame list opened
// from the Frame button. Opens them and picks choices like a player.
// Never loaded by PinballY.
// ============================================================

import assert from "node:assert/strict";
import { PROFILE_STATS_Z_INDEX } from "../../common/stats/profile_stats_painter.js";
import { AVATAR_FRAME_LIST_Z_INDEX } from "../../common/avatar_frames/avatar_frame_list_painter.js";
import * as selectionMarker from "../support/selection_marker_reader.js";
import { shownLayers } from "../support/shown_layers.js";
import { untilFadedIn } from "../support/opening_reader.js";
import { buttonHintsOn, windowRect, textsInsideLayer } from "../support/button_hints_reader.js";

// Past the fade in.
export const PROFILE_STATS_OPEN_MS = 300;

export const press = (fake, buttonCommand) => fake.fire("commandbuttondown", { command: buttonCommand, repeat: false });
// The press PinballY fires again on each auto-repeat of a held button.
export const hold = (fake, buttonCommand) => fake.fire("commandbuttondown", { command: buttonCommand, repeat: true });

export const isProfileStatsOpen = fake => shownLayers(fake, PROFILE_STATS_Z_INDEX.backdrop).length > 0;

// Its layers, shown or not: none once it closed.
export const profileStatsLayerCount = fake => fake.drawingLayers()
    .filter(layer => Object.values(PROFILE_STATS_Z_INDEX).includes(layer.zIndex)).length;

// Lets the clock run until the Profile Stats have faded in, their veil gone.
export const untilProfileStatsFadedIn = fake => untilFadedIn(fake, PROFILE_STATS_Z_INDEX.backdrop);

// Opens the main menu and selects the Profile Stats entry, which start
// getting ready: the clock does not run.
export function startOpeningProfileStats(fake, lang) {
    fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
    fake.selectMenuItem(lang.profileStats.menuEntry);
}

// Opens the main menu, selects the Profile Stats entry and lets them get
// ready and fade in.
export function openProfileStats(fake, lang) {
    startOpeningProfileStats(fake, lang);
    untilProfileStatsFadedIn(fake);
}

// The card's texts, top to bottom: the Profile's name first.
export const cardTexts = fake => shownLayers(fake, PROFILE_STATS_Z_INDEX.card).flatMap(layer => layer.texts());

// The texts drawn after title on the card, up to the next of titles (or
// the card's end).
function cardBlock(fake, title, titles) {
    const texts = cardTexts(fake);
    const start = texts.indexOf(title);
    if (start < 0) return null;
    const end = texts.findIndex((candidate, index) => index > start && titles.includes(candidate));
    return texts.slice(start + 1, end < 0 ? texts.length : end);
}

// The Player Level block: { level (the big digits), current (the points
// line) }; null when not shown. TEXT: lang.profileStats.
export function playerLevel(fake, TEXT) {
    const block = cardBlock(fake, TEXT.playerLevel.title, [TEXT.collectionTitle]);
    return block && { level: block[0], current: block[1] };
}

// The Collection Mastery block: { goal, current (null at the last tier),
// tier (the number in its square) }; null when not shown.
export function collectionMastery(fake, TEXT) {
    const block = cardBlock(fake, TEXT.collectionTitle, []);
    if (!block) return null;
    return { goal: block[0], current: block.length > 2 ? block[1] : null, tier: Number(block[block.length - 1]) };
}

export const cardImages = fake => shownLayers(fake, PROFILE_STATS_Z_INDEX.card).flatMap(layer => layer.images());

// Top to bottom: a layer's position is measured upward.
const topToBottom = layers => [...layers].sort((a, b) => b.position().y - a.position().y);

const buttonLayers = fake => topToBottom(shownLayers(fake, PROFILE_STATS_Z_INDEX.buttons));

// Each button at the card's foot, top to bottom: { label, count }.
export const buttons = fake => buttonLayers(fake).map(layer => {
    const [label, count = null] = layer.texts();
    return { label, count };
});

// Another Profile's Profile Stats, to look at only: no button at the card's foot.
export const isReadOnly = fake => isProfileStatsOpen(fake) && buttons(fake).length === 0;

// A section of the right column by its title: { [label]: texts drawn
// after it, up to the next label }; null when it is not shown. labels: the
// stat labels, from lang.profileStats.stats.
export function section(fake, title, labels) {
    const layer = shownLayers(fake, PROFILE_STATS_Z_INDEX.sections).find(candidate => candidate.texts()[0] === title);
    if (!layer) return null;
    const known = new Set(Object.values(labels));
    const stats = {};
    let current = null;
    for (const text of layer.texts().slice(1)) {
        if (known.has(text)) stats[current = text] = [];
        else if (current !== null) stats[current].push(text);
    }
    return stats;
}

// Opens the active Profile's Profile Stats from the main menu, reads the
// section of that title (as section() does) and closes them with Exit.
export function readOwnSection(fake, lang, title) {
    openProfileStats(fake, lang);
    const stats = section(fake, title, lang.profileStats.stats);
    press(fake, "Exit");
    return stats;
}

// The images drawn in a section of the right column, by its title.
export function sectionImages(fake, title) {
    const layer = shownLayers(fake, PROFILE_STATS_Z_INDEX.sections).find(candidate => candidate.texts()[0] === title);
    return layer ? layer.images() : [];
}

// The Selection Marker's layers, shown or not.
export const markerLayerCount = fake => selectionMarker.markerLayerCount(fake, PROFILE_STATS_Z_INDEX.marker);

export const markerLayer = fake => selectionMarker.markerLayer(fake, PROFILE_STATS_Z_INDEX.marker);

export const isMarkerOnExitButton = fake =>
    selectionMarker.layerUnderMarker(fake, PROFILE_STATS_Z_INDEX.marker, shownLayers(fake, PROFILE_STATS_Z_INDEX.exitButton)) !== undefined;

// The footer's groups of key caps and words, null when it does not show.
export const buttonHints = fake => buttonHintsOn(fake, PROFILE_STATS_Z_INDEX.buttonHints);

// In a window of that size: the footer's rect and those of every other
// piece of the screen (the card, the buttons, the sections and the Exit
// Button), each { left, top, right, bottom }, and whether every footer
// text sits inside the footer.
export function footerLayout(fake, size) {
    const [footer] = shownLayers(fake, PROFILE_STATS_Z_INDEX.buttonHints);
    const { card, buttons: buttonsZ, sections, exitButton } = PROFILE_STATS_Z_INDEX;
    const pieces = [card, buttonsZ, sections, exitButton].flatMap(zIndex => shownLayers(fake, zIndex));
    return {
        footer: windowRect(footer, size),
        pieces: pieces.map(layer => windowRect(layer, size)),
        textsInside: textsInsideLayer(footer),
    };
}

// The tooltip shown beside the selected choice, null when it has none.
function shownTooltip(fake) {
    const lit = shownLayers(fake, PROFILE_STATS_Z_INDEX.tooltips);
    assert.ok(lit.length <= 1, "one tooltip at most");
    return lit.length > 0 ? lit[0].texts()[0] || null : null;
}

// The highlighted choice: the Exit Button's tooltip, or the label of the button
// the marker surrounds.
export function highlighted(fake) {
    // Exactly one marker, even on the Exit Button.
    markerLayer(fake);
    const tooltip = shownTooltip(fake);
    if (tooltip) return tooltip;
    const button = selectionMarker.layerUnderMarker(fake, PROFILE_STATS_Z_INDEX.marker, buttonLayers(fake));
    return button ? button.texts()[0] : null;
}

// Every choice, in the order Next walks them from the highlighted one,
// which comes back highlighted.
export function readChoices(fake) {
    const names = [highlighted(fake)];
    for (let guard = 0; guard < 20; guard++) {
        press(fake, "Next");
        const name = highlighted(fake);
        if (name === names[0]) return names;
        names.push(name);
    }
    throw new Error("The highlight never came back to where it was.");
}

// Moves the highlight with Next to this button's label or tooltip, then
// presses Select.
export function choose(fake, name) {
    for (let guard = 0; guard < 20 && highlighted(fake) !== name; guard++) press(fake, "Next");
    assert.equal(highlighted(fake), name, `the Profile Stats offer "${name}"`);
    return press(fake, "Select");
}

// ---------- The Avatar Frame list ----------

export const isFrameListOpen = fake => shownLayers(fake, AVATAR_FRAME_LIST_Z_INDEX.backdrop).length > 0;

// Lets the clock run until the Avatar Frame list has faded in, the veil
// of its opening gone (at once when it was drawn ahead).
export const untilFrameListShown = fake => untilFadedIn(fake, AVATAR_FRAME_LIST_Z_INDEX.backdrop);

const rowLayers = fake => topToBottom(shownLayers(fake, AVATAR_FRAME_LIST_Z_INDEX.rows));
const fileNameOf = path => path.slice(path.lastIndexOf("\\") + 1);

// Each row top to bottom: { name, status (the worn mark or the unlock
// condition, null without either), frame (the file name of the frame
// image drawn around the Avatar, null for none), avatar (the Avatar's
// path) }.
export const frameRows = fake => rowLayers(fake).map(layer => {
    const [name, status = null] = layer.texts();
    const [avatar = null, frame = null] = layer.images();
    return { name, status, frame: frame && fileNameOf(frame), avatar };
});

// The Avatar Frame list's Selection Marker layers, shown or not.
export const frameListMarkerLayerCount = fake => selectionMarker.markerLayerCount(fake, AVATAR_FRAME_LIST_Z_INDEX.marker);

// The name of the row the Selection Marker surrounds.
export function highlightedRow(fake) {
    const row = selectionMarker.layerUnderMarker(fake, AVATAR_FRAME_LIST_Z_INDEX.marker, rowLayers(fake));
    return row ? row.texts()[0] : null;
}

// Moves the highlight with Next to the row of that name, then presses Select.
export function pickRow(fake, name) {
    for (let guard = 0; guard < 40 && highlightedRow(fake) !== name; guard++) press(fake, "Next");
    assert.equal(highlightedRow(fake), name, `the Avatar Frame list offers "${name}"`);
    return press(fake, "Select");
}
