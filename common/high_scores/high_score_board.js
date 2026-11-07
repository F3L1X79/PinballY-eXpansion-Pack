// ============================================================
// High Score Board: the drawn screen opened from the main menu or the
// HighScores button, on the selected table's views (Table Board, Household
// Board; podium with crowns, then rows) from the High Score store; Select
// turns the view. Opens on the Table Board's last known board while it is
// read fresh. Opens directly, not through the wheel dialog module.
// - Its buttons and attract mode go through the Drawn Screen controls; the flippers scroll the rows.
// - The read's Loader, notes and messages are the Table Board's only.
// - Crowns are drawn ahead once: PinballY reads an image file again on every draw.
// - isOpen() and onClosed() let the wheel dialogs wait for it.
// ============================================================

import lang from "../core/i18n.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { safeHandler } from "../core/safe_handler.js";
import { openDrawnScreen } from "../stats/drawn_screen.js";
import { createHiddenLayer, hideLayer } from "../drawing/placed_layers.js";
import { createLoader, LOADER_PLACEMENT } from "../drawing/loader.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import { drawExitButton } from "../drawing/steamball_drawing.js";
import { exitButtonLookOf, exitButtonWordOf, buttonHintGroupsOf, FLIPPER_HINT } from "../drawing/button_hints.js";
import { SCRIPT_NAME } from "./high_score_store.js";
import { readDefaultScoreImages, pickDefaultScoreImages } from "./default_score_images.js";
import {
    HIGH_SCORE_BOARD_Z_INDEX as Z_INDEX, HIGH_SCORE_BOARD_CROWN_Z_INDEX, HIGH_SCORE_BOARD_LOADER_Z_INDEX, CROWN_IMAGES, CROWN_CANVAS, REFERENCE_HEIGHT, PODIUM_PLACES, AVATAR_FRAME_WIDTH, CANVAS_ZOOM,
    layoutHighScoreBoard, placedRect, drawBackdrop, drawPanel, drawGlass, drawCrown, drawTitle, drawNote, drawMessage, drawStep, drawRow, drawExitTooltip, drawButtonHints,
} from "./high_score_board_painter.js";

const TRANSPARENT = 0x00000000;
// The views Select turns through, by their names' keys in lang.highScores.board.views.
const VIEWS = Object.freeze(["table", "household"]);
const isTableBoard = opened => VIEWS[opened.view] === "table";

// highScores: the High Score store; profileRewards: the worn Avatar
// Frames; drawingAhead: the shared drawing ahead
// (common/core/drawing_ahead.js); refresh(configId): reads the table's board into the store,
// resolving to "read", "unsupported", "failed" or "notLearned" (a table
// without a ROM whose board source is not learned yet); drawnScreenControls:
// the shared Drawn Screen controls (common/core/drawn_screen_controls.js).
export function createHighScoreBoard(host, { highScores, profileRewards, drawingAhead, drawnScreenControls, refresh }) {
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);
    const controls = drawnScreenControls.register(SCRIPT_NAME);
    const projectFolder = host.getProjectFolder();
    // On the top third, so that the comet never hides the scores.
    const loader = createLoader(host, { zIndex: HIGH_SCORE_BOARD_LOADER_Z_INDEX, placement: LOADER_PLACEMENT.TOP_THIRD });

    // The 1st, 2nd and 3rd places' crowns, each on its own layer, drawn once;
    // hidden through the open screen's placed layers, else through hideLayer().
    const crowns = CROWN_IMAGES.map((_, index) => ({ index, layer: createHiddenLayer(host, HIGH_SCORE_BOARD_CROWN_Z_INDEX), isDrawn: false }));

    function drawCrownLayer(crown) {
        crown.layer.clear(TRANSPARENT);
        crown.layer.draw(dc => drawCrown(dc, projectFolder, crown.index), CROWN_CANVAS, CROWN_CANVAS);
        crown.isDrawn = true;
    }

    // One crown per step of the drawing ahead.
    drawingAhead.add(() => {
        const crown = crowns.find(candidate => !candidate.isDrawn);
        if (!crown) return false;
        drawCrownLayer(crown);
        return true;
    });
    // The screen on show: its drawn screen, return, opacity, the layers
    // of its content (all but the backdrop), its layout, its rows' layers,
    // the first row in view and its place among the Drawn Screen controls'
    // openings (controlled); null when closed.
    let shown = null;

    // Each line once: the Default Score images are read again on every opening.
    const loggedImageLines = new Set();
    function logImageLine(line) {
        if (loggedImageLines.has(line)) return;
        loggedImageLines.add(line);
        log(line);
    }

    // The owner's Avatar; null, logged, when its image is missing.
    function avatarOf(owner) {
        if (host.files.isImageReadable(owner.avatarPath)) return owner.avatarPath;
        log(`${owner.avatarPath} is missing or unreadable; ${owner.name}'s places show without an Avatar.`);
        return null;
    }

    // defaultImageOf(initials): a Default Score's image.
    function placeShown({ rank, initials, score, owner }, defaultImageOf) {
        const TEXT = lang.highScores.board;
        return {
            rank,
            name: owner ? displayNameOf(owner) : TEXT.defaultScore,
            isDefaultScore: owner === null,
            avatarPath: owner ? avatarOf(owner) : defaultImageOf(initials),
            framePath: owner ? profileRewards.wornImageOf(owner.name, AVATAR_FRAME_WIDTH) : null,
            detail: initials || TEXT.noInitials,
            score: lang.profileStats.number(score),
            isTableRecord: rank === 1,
        };
    }

    // A place of the Household Board, from the High Score store: the date
    // of the Play where the Table Board shows the initials.
    function householdPlaceShown({ rank, score, date, owner }) {
        const [year, month, day] = date.slice(0, 10).split("-");
        return {
            rank,
            name: displayNameOf(owner),
            isDefaultScore: false,
            avatarPath: avatarOf(owner),
            framePath: profileRewards.wornImageOf(owner.name, AVATAR_FRAME_WIDTH),
            detail: lang.highScores.board.date(day, month, year),
            score: lang.profileStats.number(score),
            isTableRecord: false,
        };
    }

    // The Household Board: never a note, the read of the table's board is not its own.
    function householdScreenFor(game) {
        const known = game ? highScores.householdBoardOf(game.configId) : [];
        const places = known.map(householdPlaceShown);
        return { title: game ? game.title : "", places, message: places.length === 0 ? lang.highScores.board.noHouseholdScore : null, note: null };
    }

    // What the Table Board shows of the table: its title, its last known
    // places, and the message or note for where the read stands (status:
    // "reading", "read", "unsupported", "failed", "notLearned"); defaultImages: the
    // Default Score images' paths.
    function tableScreenFor(game, status, defaultImages) {
        const TEXT = lang.highScores.board;
        const known = game ? highScores.boardOf(game.configId) : [];
        const screen = { title: game ? game.title : "", places: [], message: null, note: null };
        if (status === "notLearned") screen.message = TEXT.notLearned;
        else if (status === "unsupported" || (known === null && status === "failed")) screen.message = TEXT.notSupported;
        else if (known === null) screen.message = TEXT.reading;
        else if (known.length === 0) {
            screen.message = status === "reading" ? TEXT.reading : TEXT.noScore;
            if (status === "failed") screen.note = TEXT.notRefreshed;
        } else {
            const defaultImageOf = pickDefaultScoreImages(known.filter(place => place.owner === null).map(place => place.initials), defaultImages);
            screen.places = known.map(place => placeShown(place, defaultImageOf));
            if (status === "reading") screen.note = TEXT.reading;
            if (status === "failed") screen.note = TEXT.notRefreshed;
        }
        return screen;
    }

    const screenOf = opened => (isTableBoard(opened)
        ? tableScreenFor(opened.game, opened.tableStatus, opened.defaultImages)
        : householdScreenFor(opened.game));

    // Shows every content layer at the screen's opacity, the rows out of
    // view hidden, and puts each row in its scrolled place.
    function showContent(opened) {
        const { drawn, geometry, rowLayers, firstRow } = opened;
        const showAt = (layer, opacity) => {
            drawn.show(layer);
            layer.alpha = opacity;
        };
        for (const layer of [...opened.content, ...opened.crownLayers]) {
            if (!rowLayers.includes(layer)) showAt(layer, opened.opacity);
        }
        opened.marker.setOpacity(opened.opacity);
        rowLayers.forEach((layer, index) => {
            drawn.place(layer, placedRect(geometry, geometry.rows[index], firstRow * geometry.rowPitch));
            const inView = index >= firstRow && index < firstRow + geometry.rowsInView;
            if (inView) showAt(layer, opened.opacity);
            else drawn.hide(layer);
        });
    }

    // Draws the panel and everything on it for the view on show into
    // opened.content, at the screen's current opacity, in place of what it
    // showed; the backdrop stays. The first row in view stays where it
    // was, as far as the new rows allow.
    function drawContent(opened) {
        const TEXT = lang.highScores.board;
        const { drawn } = opened;
        for (const layer of opened.content) drawn.remove(layer);
        const screen = screenOf(opened);
        const nextView = VIEWS[(opened.view + 1) % VIEWS.length];
        const geometry = layoutHighScoreBoard(drawn.referenceWidth, screen.places.length);
        const content = [];
        const piece = (zIndex, rect, draw) => drawn.drawPiece(zIndex, placedRect(geometry, rect), draw, content, rect);
        // Drawn finer, on a canvas CANVAS_ZOOM times the rect.
        const finePiece = (zIndex, rect, draw) => drawn.drawPiece(zIndex, placedRect(geometry, rect), draw, content, { w: rect.w * CANVAS_ZOOM, h: rect.h * CANVAS_ZOOM });
        const { panel } = geometry;
        piece(Z_INDEX.panel, panel, dc => drawPanel(dc, projectFolder, panel.w, panel.h));
        piece(Z_INDEX.title, geometry.title, dc => drawTitle(host, dc, screen.title, TEXT.views[VIEWS[opened.view]], geometry.title.w));
        if (screen.note !== null) piece(Z_INDEX.note, geometry.note, dc => drawNote(host, dc, screen.note, geometry.note.w, geometry.note.h));
        if (screen.message !== null) {
            piece(Z_INDEX.message, geometry.message, dc => drawMessage(host, dc, screen.message, geometry.message.w, geometry.message.h));
        }
        screen.places.slice(0, PODIUM_PLACES).forEach((place, index) => {
            const rect = geometry.steps[index];
            piece(Z_INDEX.podium, rect, dc => drawStep(host, dc, place, index, TEXT.record, rect.w));
        });
        for (const crown of crowns) drawn.hide(crown.layer);
        // Drawn now when the board opens before the drawing ahead reached them.
        const crownLayers = crowns.slice(0, Math.min(PODIUM_PLACES, screen.places.length)).map((crown, index) => {
            if (!crown.isDrawn) drawCrownLayer(crown);
            const { framed, bare } = geometry.crowns[index];
            drawn.place(crown.layer, placedRect(geometry, screen.places[index].framePath ? framed : bare));
            return crown.layer;
        });
        const rowLayers = screen.places.slice(PODIUM_PLACES).map((place, index) => {
            const rect = geometry.rows[index];
            return piece(Z_INDEX.rows, rect, dc => drawRow(host, dc, place, rect.w));
        });
        piece(Z_INDEX.glass, panel, dc => drawGlass(dc, projectFolder, panel.w, panel.h));
        const { exitLook } = opened;
        const flippers = geometry.rows.length > geometry.rowsInView ? FLIPPER_HINT.SCROLL : null;
        const hints = buttonHintGroupsOf({ flippers, select: TEXT.views[nextView], exitLook });
        finePiece(Z_INDEX.buttonHints, geometry.buttonHints, dc => drawButtonHints(host, dc, hints, geometry.buttonHints.w, geometry.buttonHints.h));
        // At its default size: the board's Exit Button, CANVAS_ZOOM times.
        finePiece(Z_INDEX.exitButton, geometry.exitButton, dc => drawExitButton(dc, exitLook));
        finePiece(Z_INDEX.tooltip, geometry.exitTooltip, dc => drawExitTooltip(host, dc, exitButtonWordOf(exitLook)));
        // The panel's height follows the board: the Exit Button may have moved.
        opened.marker.moveTo(placedRect(geometry, geometry.exitButton));
        opened.content = content;
        opened.geometry = geometry;
        opened.rowLayers = rowLayers;
        opened.crownLayers = crownLayers;
        opened.firstRow = Math.min(opened.firstRow, lastFirstRow(opened));
        showContent(opened);
    }

    // The first row in view once scrolled to the last place.
    const lastFirstRow = ({ geometry }) => Math.max(0, geometry.rows.length - geometry.rowsInView);

    // direction: 1 for Next, -1 for Prev; one row at a time, stopping at
    // either end. Does nothing when every row is in view.
    function scroll(direction) {
        const firstRow = Math.max(0, Math.min(lastFirstRow(shown), shown.firstRow + direction));
        if (firstRow === shown.firstRow) return;
        shown.firstRow = firstRow;
        showContent(shown);
    }

    // onBack: what Exit returns to (a screen or a menu), called once the
    // screen is closed; none when Exit leaves the bare wheel.
    // Opens at once on the last known board and redraws in place when the
    // fresh read ends; a read ending after close only updated the store.
    function open(onBack = null) {
        if (shown) return;
        const openedAt = host.now().getTime();
        const game = host.getCurrentTable();
        const drawn = openDrawnScreen(host, SCRIPT_NAME, {
            referenceHeight: REFERENCE_HEIGHT,
            backdropZIndex: Z_INDEX.backdrop,
            drawBackdrop,
        });
        const marker = createSelectionMarker(host, { zIndex: Z_INDEX.marker, referenceWidth: drawn.referenceWidth, referenceHeight: REFERENCE_HEIGHT });
        const opened = {
            drawn, onBack, exitLook: exitButtonLookOf(onBack !== null), marker, game,
            view: 0, tableStatus: game ? "reading" : "read", defaultImages: readDefaultScoreImages(host, logImageLine),
            opacity: 0, content: [], geometry: null, rowLayers: [], crownLayers: [], firstRow: 0,
            controlled: controls.open({ onMove: scroll, onChoose: turnView, onExit: back, close: remove }),
        };
        shown = opened;
        // Opens at once on the last known board: ready from the start.
        opened.controlled.ready();
        drawContent(opened);
        // The Loader waits for the end of the fade in: at full opacity over a
        // board still fading, it would stand out alone. close() stops the fade.
        drawn.fadeIn(opacity => {
            opened.opacity = opacity;
            for (const layer of drawn.layers) layer.alpha = opacity;
            showContent(opened);
            showLoaderIfReading(opened);
        });
        log(`High Score Board opened, drawn in ${host.now().getTime() - openedAt} ms.`);
        if (!game) return;
        refresh(game.configId).then(safeHandler(SCRIPT_NAME, (status) => {
            // A read whose recording threw resolves to nothing, logged: shown as failed.
            opened.tableStatus = status || "failed";
            if (shown !== opened) return;
            loader.hide();
            // Another view stays as drawn: the Table Board is drawn afresh when it comes back.
            if (isTableBoard(opened)) drawContent(opened);
        }));
    }

    // The Loader turns over the Table Board only, once faded in, while its board is read.
    function showLoaderIfReading(opened) {
        if (opened.opacity >= 1 && opened.tableStatus === "reading" && isTableBoard(opened)) loader.show();
        else loader.hide();
    }

    // Select and Launch: the next view, drawn in place, scrolled to its top.
    function turnView() {
        shown.view = (shown.view + 1) % VIEWS.length;
        shown.firstRow = 0;
        drawContent(shown);
        showLoaderIfReading(shown);
    }

    // Run by the Drawn Screen controls on every close, attract mode
    // included, which then tell the closed listeners.
    function remove() {
        shown.drawn.close(shown.content);
        shown.marker.remove();
        loader.hide();
        for (const crown of crowns) hideLayer(crown.layer);
        shown = null;
    }

    function back() {
        const { onBack, controlled } = shown;
        controlled.close();
        if (onBack) onBack();
    }

    return {
        open,
        isOpen: controls.isOpen,
        onClosed: controls.onClosed,
    };
}
