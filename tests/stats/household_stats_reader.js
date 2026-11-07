// ============================================================
// Reads the drawn Household Stats as the player sees them, on the fake host:
// title, labels, columns and cells, highlighted column, Exit Button, Button
// Hints, columns in view while gliding; opens them and picks a column like a
// player. Never loaded by PinballY.
// ============================================================

import assert from "node:assert/strict";
import { HOUSEHOLD_STATS_Z_INDEX } from "../../common/stats/household_stats_painter.js";
import * as selectionMarker from "../support/selection_marker_reader.js";
import { shownLayers } from "../support/shown_layers.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { openProfileStats, choose, press, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "./profile_stats_reader.js";
import { shownFrame, isFrameImage } from "../avatar_frames/avatar_frame_reader.js";
import { untilFadedIn } from "../support/opening_reader.js";
import { buttonHintsOn, windowRect } from "../support/button_hints_reader.js";

export { press };

export const isHouseholdStatsOpen = fake => shownLayers(fake, HOUSEHOLD_STATS_Z_INDEX.backdrop).length > 0;

// Its layers, shown or not: none once it closed.
export const householdStatsLayerCount = fake => fake.drawingLayers()
    .filter(layer => Object.values(HOUSEHOLD_STATS_Z_INDEX).includes(layer.zIndex)).length;

// Lets the clock run until the Household Stats have faded in, their veil gone.
export const untilHouseholdStatsFadedIn = fake => untilFadedIn(fake, HOUSEHOLD_STATS_Z_INDEX.backdrop);

// Opens the Profile Stats from the main menu and picks "Household Stats",
// which start getting ready: the clock does not run. beforeChoosing() runs
// once the Profile Stats are shown. Returns the Select press.
export function startOpeningHouseholdStats(fake, lang, { beforeChoosing = () => {} } = {}) {
    openProfileStats(fake, lang);
    beforeChoosing();
    return choose(fake, lang.profileStats.buttons.household);
}

// Opens the Profile Stats from the main menu, picks "Household Stats" and lets
// them get ready and fade in; options as startOpeningHouseholdStats()'s.
export function openHouseholdStats(fake, lang, options = {}) {
    startOpeningHouseholdStats(fake, lang, options);
    untilHouseholdStatsFadedIn(fake);
}

// A write to each named Profile's files, changing nothing: throws their
// kept stats away. Run as beforeChoosing, the clock does not run before
// the opening, so the reading ahead leaves them to it.
export function throwAwayKeptStats(profileStore, profileNames) {
    for (const name of profileNames) profileStore.updateProfileData(() => {}, name);
}

export function title(fake) {
    const [layer] = shownLayers(fake, HOUSEHOLD_STATS_Z_INDEX.title);
    return layer ? layer.texts()[0] : null;
}

function labelLayer(fake) {
    const [layer] = shownLayers(fake, HOUSEHOLD_STATS_Z_INDEX.labels);
    return layer;
}

export const labels = fake => labelLayer(fake).texts();

// The footer's groups of key caps and words, null when it does not show.
export const buttonHints = fake => buttonHintsOn(fake, HOUSEHOLD_STATS_Z_INDEX.buttonHints);

// In a window of that size: the footer's rect, the columns' and the
// labels' (each { left, top, right, bottom }), and whether every footer
// text sits inside the footer.
export function footerLayout(fake, size) {
    const [footer] = shownLayers(fake, HOUSEHOLD_STATS_Z_INDEX.buttonHints);
    const canvas = footer.canvasSize();
    const textsInside = textStrokes(footer).every(({ rect }) =>
        rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= canvas.width + 2 && rect.y + rect.height <= canvas.height);
    return {
        footer: windowRect(footer, size),
        columns: columnLayers(fake).map(layer => windowRect(layer, size)),
        labels: windowRect(labelLayer(fake), size),
        textsInside,
    };
}

const columnLayers = fake => [...shownLayers(fake, HOUSEHOLD_STATS_Z_INDEX.columns)].sort((a, b) => a.position().x - b.position().x);

const textStrokes = layer => layer.strokes().filter(stroke => "text" in stroke);
const middleOf = rect => rect.y + rect.height / 2;

// Each column left to right: { name, avatar (the Avatar image drawn, null
// without one), frame (the Avatar Frame drawn around it, { tier, size,
// rect }, null without one), cells: { [label]: { texts, isGold } } }. The labels and
// the columns share their top, so a cell is on the line of the label
// nearest its middle.
export function columns(fake) {
    const labelStrokes = textStrokes(labelLayer(fake));
    const lineOf = stroke => labelStrokes.reduce((best, label) =>
        (Math.abs(middleOf(label.rect) - middleOf(stroke.rect)) < Math.abs(middleOf(best.rect) - middleOf(stroke.rect)) ? label : best)).text;
    return columnLayers(fake).map(layer => {
        const [nameStroke, ...cellStrokes] = textStrokes(layer);
        const cells = {};
        for (const stroke of cellStrokes) {
            const line = lineOf(stroke);
            if (!cells[line]) cells[line] = { texts: [], isGold: stroke.color === STEAMBALL_COLORS.gold };
            cells[line].texts.push(stroke.text);
        }
        const frame = shownFrame(layer);
        const [avatar = null] = layer.images().filter(image => !isFrameImage(image));
        return { name: nameStroke.text, avatar, frame, cells };
    });
}

// The middles of a column's Collection Mastery pair (its tier square's
// left to its value's right) and of its Player Level value, centred like
// every other value. A centred text's rect is 4 px wider than measured; a
// left-aligned one fills its room, so its width is its length at the
// fake's character width, read from the centred value.
export function collectionPairMiddles(fake, name, lang) {
    const layer = columnLayers(fake).find(candidate => textStrokes(candidate)[0].text === name);
    const { lines } = lang.profileStats.household;
    const labelStrokes = textStrokes(labelLayer(fake));
    const lineMiddle = label => middleOf(labelStrokes.find(stroke => stroke.text === label).rect);
    const onLine = label => textStrokes(layer).filter(stroke => Math.abs(middleOf(stroke.rect) - lineMiddle(label)) < 20);
    const [value, tier] = onLine(lines.collectionMastery);
    const [level] = onLine(lines.playerLevel);
    const levelW = level.rect.width - 4;
    const charW = levelW / level.text.length;
    return { pair: (tier.rect.x + value.rect.x + value.text.length * charW) / 2, level: level.rect.x + levelW / 2 };
}

export const columnNames = fake => columns(fake).map(column => column.name);

// Past five Profiles (fewer in a narrow window), only the columns in view
// show, so they are the columns above: their names left to right, the
// edges' while gliding included.
export const columnsInView = columnNames;

// The columns in view faded at the cut edges while gliding (every column
// during the opening fade).
export const fadedColumns = fake => columnLayers(fake).filter(layer => layer.alpha < 1).map(layer => textStrokes(layer)[0].text);

// Long enough for any glide to end.
export const GLIDE_OVER_MS = 400;

// One line across the columns, left to right: each cell's first text, or
// null when absent.
export const lineValues = (fake, label) => columns(fake).map(column => (column.cells[label] ? column.cells[label].texts[0] : null));

// The names of the columns whose value on that line is gold.
export const goldOn = (fake, label) => columns(fake).filter(column => column.cells[label] && column.cells[label].isGold).map(column => column.name);

// The Selection Marker's layers, shown or not.
export const markerLayerCount = fake => selectionMarker.markerLayerCount(fake, HOUSEHOLD_STATS_Z_INDEX.marker);

export const markerLayer = fake => selectionMarker.markerLayer(fake, HOUSEHOLD_STATS_Z_INDEX.marker);

export const isMarkerOnExitButton = fake =>
    selectionMarker.layerUnderMarker(fake, HOUSEHOLD_STATS_Z_INDEX.marker, shownLayers(fake, HOUSEHOLD_STATS_Z_INDEX.exitButton)) !== undefined;

// The Exit Button's tooltip, null when hidden.
function shownTooltip(fake) {
    const lit = shownLayers(fake, HOUSEHOLD_STATS_Z_INDEX.tooltip);
    assert.ok(lit.length <= 1, "one tooltip at most");
    return lit.length > 0 ? lit[0].texts()[0] || null : null;
}

// The name of the column the marker surrounds, or the Exit Button's tooltip when
// the marker is on the Exit Button.
export function highlightedColumn(fake) {
    // Exactly one marker, even on the Exit Button.
    markerLayer(fake);
    const tooltip = shownTooltip(fake);
    if (tooltip) return tooltip;
    const column = selectionMarker.layerUnderMarker(fake, HOUSEHOLD_STATS_Z_INDEX.marker, columnLayers(fake));
    return column ? textStrokes(column)[0].text : null;
}

// Moves the marker with Next to the column of that name, letting each glide
// end, then presses Select.
export function chooseColumn(fake, name) {
    for (let guard = 0; guard < 20 && highlightedColumn(fake) !== name; guard++) {
        press(fake, "Next");
        fake.advanceTime(GLIDE_OVER_MS);
    }
    assert.equal(highlightedColumn(fake), name, `the Household Stats show "${name}"`);
    return press(fake, "Select");
}

// Presses Exit until no stats screen is left: Exit on another Profile's
// read-only Profile Stats shows the Household Stats again, and Exit there
// the active Profile's Profile Stats, which Exit only then closes.
export function backToWheel(fake) {
    for (let guard = 0; guard < 5 && (isHouseholdStatsOpen(fake) || isProfileStatsOpen(fake)); guard++) {
        press(fake, "Exit");
        fake.advanceTime(PROFILE_STATS_OPEN_MS);
    }
    assert.ok(!isHouseholdStatsOpen(fake) && !isProfileStatsOpen(fake), "back on the wheel");
}
