// ============================================================
// Reads the drawn High Score Board as the player sees it, on the fake host:
// title, message, podium and rows (rank, owner, Avatar, frame, crown,
// score), Exit Button, view buttons, Selection Marker, Button Hints, and
// leftover layers after close. Opens it from the main menu entry, turns
// its views with showView(). Never loaded by PinballY.
// ============================================================

import { HIGH_SCORE_BOARD_Z_INDEX, HIGH_SCORE_BOARD_CROWN_Z_INDEX } from "../../common/high_scores/high_score_board_painter.js";
import { shownFrame, isFrameImage } from "../avatar_frames/avatar_frame_reader.js";
import { buttonHintsOn, exitButtonTooltipOn, textsInsideLayer } from "../support/button_hints_reader.js";
import { shownLayers } from "../support/shown_layers.js";
import * as selectionMarker from "../support/selection_marker_reader.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import assert from "node:assert/strict";

// Past the fade in.
export const BOARD_OPEN_MS = 300;

export const press = (fake, buttonCommand) => fake.fire("commandbuttondown", { command: buttonCommand, repeat: false });

export const isBoardOpen = fake => shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.backdrop).length > 0;

// Its layers, shown or not: none once it closed. The crowns' layers are
// kept, drawn ahead.
export const boardLayerCount = fake => fake.drawingLayers()
    .filter(layer => Object.values(HIGH_SCORE_BOARD_Z_INDEX).includes(layer.zIndex)).length;

// The main menu's titles as PinballY shows it, with its native entries,
// and where the High Score Board's entry is among them (-1: absent). Found
// by its command: PinballY's own "High Scores" entry has the same title.
export function mainMenuTitles(fake) {
    fake.openMainMenu();
    const { items } = fake.currentMenu();
    fake.closeMenu();
    const boardCmd = fake.commandId("highScoreBoard");
    return { titles: items.map(item => item.title), boardEntry: items.findIndex(item => boardCmd !== undefined && item.cmd === boardCmd) };
}

// Opens the main menu, selects the High Score Board's entry and lets the fade end.
export function openBoard(fake, lang) {
    fake.openMainMenu();
    fake.selectMenuItem(lang.highScores.board.menuEntry);
    fake.advanceTime(BOARD_OPEN_MS);
}

const firstText = (fake, zIndex) => {
    const [layer] = shownLayers(fake, zIndex);
    return layer ? layer.texts()[0] : null;
};

export const title = fake => firstText(fake, HIGH_SCORE_BOARD_Z_INDEX.title);

const titleText = (fake, index) => {
    const [layer] = shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.title);
    return layer ? layer.texts()[index] || null : null;
};

// The title of the view on show ("ROM scores"), under the table's title.
export const viewName = fake => titleText(fake, 1);

// What the view on show shows, under its title.
export const viewHelp = fake => titleText(fake, 2);

// The message shown in place of the board ("No score yet"), or null.
export const message = fake => firstText(fake, HIGH_SCORE_BOARD_Z_INDEX.message);

// A place's layer: { rank, name, avatar (the image drawn, null without
// one), initials, score, isTableRecord }. A podium step reads rank, the
// "Record" mark on the Table Record, name, score, initials; a row reads
// rank, name, initials, score.
function placeOf(layer, TEXT, isStep) {
    const texts = layer.texts();
    const isTableRecord = texts.includes(TEXT.record);
    const [rank, name, ...rest] = texts.filter(text => text !== TEXT.record);
    const [initials, score] = isStep ? [rest[1], rest[0]] : rest;
    const [avatar = null] = layer.images().filter(image => !isFrameImage(image));
    return { rank, name, avatar, initials, score, isTableRecord };
}

// The podium's step layers by where they stand: { left, middle, right },
// null when left empty. The panel is centred on the window.
function stepLayers(fake) {
    const steps = { left: null, middle: null, right: null };
    for (const layer of shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.podium)) {
        const { x } = layer.position();
        steps[Math.abs(x) < 1e-6 ? "middle" : (x < 0 ? "left" : "right")] = layer;
    }
    return steps;
}

const mapSteps = (steps, read) => Object.fromEntries(Object.entries(steps).map(([where, layer]) => [where, layer && read(layer)]));

// The podium's steps by where they stand: { left, middle, right }, each a
// place or null when left empty.
export const podium = (fake, lang) => mapSteps(stepLayers(fake), layer => placeOf(layer, lang.highScores.board, true));

// The rows under the podium, top down (positions grow upwards).
const rowLayers = fake => shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.rows).sort((a, b) => b.position().y - a.position().y);

export const rows = (fake, lang) => rowLayers(fake).map(layer => placeOf(layer, lang.highScores.board, false));

// The places of the Household Board in rank order, the podium's then the
// rows in view: { rank, name, avatar, score, date (of the Play) }.
export function viewPlaces(fake, lang) {
    const { left, middle, right } = podium(fake, lang);
    return [middle, left, right, ...rows(fake, lang)].filter(Boolean)
        .map(({ rank, name, avatar, initials, score }) => ({ rank, name, avatar, score, date: initials }));
}

// The Avatar Frame a place's layer draws: { tier, size (of the image),
// isAroundAvatar (a quarter of the Avatar's box beyond it on every side),
// isInside (within the layer) }, null for none.
function frameOf(layer) {
    const frame = shownFrame(layer);
    if (!frame) return null;
    const avatarImage = layer.strokes().find(stroke => "image" in stroke && !isFrameImage(stroke.image));
    // The Avatar's image is drawn 3 px inside its box.
    const box = avatarImage && { x: avatarImage.rect.x - 3, y: avatarImage.rect.y - 3, size: avatarImage.rect.width + 6 };
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const { rect } = frame;
    const isAroundAvatar = Boolean(box) && near(rect.x, box.x - box.size / 4) && near(rect.y, box.y - box.size / 4)
        && near(rect.width, box.size * 1.5) && near(rect.height, box.size * 1.5);
    const canvas = layer.canvasSize();
    const isInside = rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= canvas.width + 1e-6 && rect.y + rect.height <= canvas.height + 1e-6;
    return { tier: frame.tier, size: frame.size, isAroundAvatar, isInside };
}

// The frame around each Avatar: { podium: { left, middle, right }, rows
// (top down) }, a step left empty null.
export const frames = fake => ({ podium: mapSteps(stepLayers(fake), frameOf), rows: rowLayers(fake).map(frameOf) });

// The discreet note over a known board ("Reading…", "could not be refreshed"), or null.
export const note = fake => firstText(fake, HIGH_SCORE_BOARD_Z_INDEX.note);

const fileOf = path => path.split("\\").pop();
const crownLayers = fake => fake.drawingLayers().filter(layer => layer.zIndex === HIGH_SCORE_BOARD_CROWN_Z_INDEX);

// The crown over each podium step: { left, middle, right }, each null or
// { image (its file name), clearsFrame (between the step's top and the
// Avatar's top, or where its worn Avatar Frame reaches above it, a
// quarter of the Avatar's box, resting at most 12 board pixels above) }.
// Positions grow upwards, in window heights. A crown is found over a step only when centred on it; any other
// shown crown is counted as stray.
export function crowns(fake) {
    const steps = stepLayers(fake);
    const shown = shownLayers(fake, HIGH_SCORE_BOARD_CROWN_Z_INDEX);
    const near = (a, b) => Math.abs(a - b) < 1e-6;
    const crownOver = (step) => {
        if (!step) return null;
        const crown = shown.find(layer => near(layer.position().x, step.position().x));
        if (!crown) return null;
        const [image] = crown.images();
        const stepSpan = step.scale().ySpan;
        const stepTop = step.position().y + stepSpan / 2;
        const avatarImage = step.strokes().find(stroke => "image" in stroke && !isFrameImage(stroke.image));
        // The Avatar's image is drawn 3 px inside its box.
        const boxTop = avatarImage.rect.y - 3;
        const boxSize = avatarImage.rect.width + 6;
        const isFramed = step.strokes().some(stroke => "image" in stroke && isFrameImage(stroke.image));
        const perBoardPixel = stepSpan / step.canvasSize().height;
        const frameTop = stepTop - (boxTop - (isFramed ? boxSize / 4 : 0)) * perBoardPixel;
        const crownSpan = crown.scale().ySpan;
        const crownBottom = crown.position().y - crownSpan / 2;
        const crownTop = crown.position().y + crownSpan / 2;
        const rests = crownBottom >= frameTop - 1e-6 && crownBottom <= frameTop + 12 * perBoardPixel;
        return { image: fileOf(image), clearsFrame: rests && crownTop <= stepTop + 1e-6 };
    };
    const found = mapSteps(steps, crownOver);
    const placed = Object.values(found).filter(Boolean).length;
    return shown.length === placed ? found : { ...found, stray: shown.length - placed };
}

// A crown as crowns() reads one in its place.
export const crowned = image => ({ image, clearsFrame: true });

// Whether every crown's layer waits hidden, shrunk to a point.
export const crownsWaitHidden = fake => crownLayers(fake).length > 0 && crownLayers(fake)
    .every(layer => layer.alpha === 0 && layer.scale().xSpan <= 0.001 && layer.scale().ySpan <= 0.001);

// How many times each crown image was drawn, by file name.
export function crownDrawCounts(fake) {
    const counts = {};
    for (const drawing of fake.drawings()) {
        if (drawing.zIndex !== HIGH_SCORE_BOARD_CROWN_Z_INDEX) continue;
        for (const image of drawing.images) counts[fileOf(image)] = (counts[fileOf(image)] || 0) + 1;
    }
    return counts;
}

// The panel's slices as drawn: { top, middle, bottom }, each the rect its
// image is drawn on, by its file name's end.
export function panelSlices(fake) {
    const [panel] = shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.panel);
    const slices = {};
    for (const stroke of panel.strokes()) {
        if (!("image" in stroke)) continue;
        const part = ["top", "middle", "bottom"].find(name => stroke.image.endsWith(`panel_${name}.png`));
        if (part) slices[part] = stroke.rect;
    }
    return slices;
}

const viewButtonLayers = fake => shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.viewButtons).sort((a, b) => a.position().x - b.position().x);

// The view buttons' names, left to right.
export const viewButtons = fake => viewButtonLayers(fake).map(layer => layer.texts()[0]);

// The view buttons' labels as drawn: { sizes (each one's font size), inside
// (whether every label stays within its button) }.
export function viewButtonLabels(fake) {
    const layers = viewButtonLayers(fake);
    const strokes = layers.map(layer => layer.strokes().find(stroke => "text" in stroke));
    return { sizes: strokes.map(stroke => stroke.size), inside: layers.every(layer => textsInsideLayer(layer)) };
}

// The name on the view buttons drawn as the view on show's: gold, over a gold edge.
export function currentViewButton(fake) {
    const current = viewButtonLayers(fake).filter(layer => layer.strokes().some(stroke => "text" in stroke && stroke.color === STEAMBALL_COLORS.gold));
    assert.ok(current.length <= 1, "one view on show at most");
    return current.length > 0 ? current[0].texts()[0] : null;
}

// How far the message's text stands from midway between the title's
// bottom and the view buttons' top, in panel heights.
export function messageOffset(fake) {
    const span = layer => layer.scale().ySpan;
    const [box] = shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.message);
    const [titleLayer] = shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.title);
    const [button] = viewButtonLayers(fake);
    const { rect } = box.strokes().find(stroke => "text" in stroke);
    // Positions grow upwards; the canvas's y downwards.
    const textY = box.position().y + span(box) / 2 - (rect.y + rect.height / 2) / box.canvasSize().height * span(box);
    const midway = (titleLayer.position().y - span(titleLayer) / 2 + button.position().y + span(button) / 2) / 2;
    return Math.abs(textY - midway) / panelHeight(fake);
}

// The panel's height on the window, in window heights.
export const panelHeight = fake => shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.panel)[0].scale().ySpan;

// What the Selection Marker surrounds: "exitButton", { view: the button's
// name }, or { row: the row's rank }.
export function marked(fake, lang) {
    const zIndex = HIGH_SCORE_BOARD_Z_INDEX.marker;
    if (selectionMarker.layerUnderMarker(fake, zIndex, shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.exitButton))) return "exitButton";
    const button = selectionMarker.layerUnderMarker(fake, zIndex, viewButtonLayers(fake));
    if (button) return { view: button.texts()[0] };
    const row = selectionMarker.layerUnderMarker(fake, zIndex, rowLayers(fake));
    return row ? { row: placeOf(row, lang.highScores.board, false).rank } : null;
}

// Moves the marker with Next to the button of that view ("household"),
// then presses Select; returns the press.
export function showView(fake, lang, view) {
    const name = lang.highScores.board.views[view];
    for (let guard = 0; guard < 20 && !isMarkedView(fake, lang, name); guard++) press(fake, "Next");
    assert.ok(isMarkedView(fake, lang, name), `the board offers "${name}"`);
    return press(fake, "Select");
}

function isMarkedView(fake, lang, name) {
    const shown = marked(fake, lang);
    return shown !== null && shown.view === name;
}

// The footer's groups of key caps and words, null when none shows.
export const buttonHints = fake => buttonHintsOn(fake, HIGH_SCORE_BOARD_Z_INDEX.buttonHints);

// The Exit Button's tooltip ("Back" or "Close"), null while hidden.
export const exitButtonTooltip = fake => exitButtonTooltipOn(fake, HIGH_SCORE_BOARD_Z_INDEX.tooltip);

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

// Where the footer, the podium's steps and the rows in view show in a
// window of that size, and whether the footer's words are inside it.
export function footerLayout(fake, size) {
    const [footer] = shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.buttonHints);
    const canvas = footer.canvasSize();
    const textsInside = footer.strokes().filter(stroke => "text" in stroke).every(({ rect }) =>
        rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= canvas.width + 2 && rect.y + rect.height <= canvas.height);
    return {
        footer: windowRect(footer, size),
        steps: shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.podium).map(layer => windowRect(layer, size)),
        rows: shownLayers(fake, HIGH_SCORE_BOARD_Z_INDEX.rows).map(layer => windowRect(layer, size)),
        textsInside,
    };
}
