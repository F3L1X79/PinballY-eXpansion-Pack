// ============================================================
// Loader: the small gold comet turning in the middle of the playfield while
// the player waits, or on the top third over the High Score Board, with an
// optional caption beneath it saying what the wait is for.
// show() and hide() are safe to call again. Takes no button.
// - The APNG plays by itself; hide() removes the layers, so an idle Loader costs nothing.
// ============================================================

import { LOADER_IMAGE } from "./loader_image.js";
import { oneLine } from "./steamball_drawing.js";
import { STEAMBALL_COLORS as COLORS, STEAMBALL_FONTS as FONTS } from "./steamball_palette.js";

// 7 % of the window's height, by height only: PinballY keeps the image's
// proportions without the window being measured, which is not laid out
// yet at startup.
export const LOADER_HEIGHT = 0.07;
const LOADER_SCALE = Object.freeze({ ySpan: LOADER_HEIGHT });
// Where the comet turns, chosen at creation: the centre of the playfield
// screen, or the centre of its top third (PinballY's y axis points up, in
// window heights); another height can be given. With a caption, the comet
// and its caption are centred together on that height.
export const LOADER_PLACEMENT = Object.freeze({ CENTRED: 0, TOP_THIRD: 1 / 6 });
// The window the Loader draws on, chosen at creation.
export const LOADER_SCREEN = Object.freeze({ PLAYFIELD: "playfield", BACKGLASS: "backglass" });

// The caption's canvas, drawn at twice a 1080-pixel-high window's pixels so
// that its one-pixel outline shows half as thick, and scaled by height
// only, so the layer never covers the whole window. Gabriola draws small
// for its size and has a tall line, hence a size above body text that
// still looks a little under it, and a canvas kept just above its line's
// height, its empty top already a gap under the comet.
const CANVAS_SCALE = 2;
const CAPTION_LOOK = Object.freeze({ width: 1200, height: 100, size: 48, weight: 400, outline: 1 });
const CAPTION_HEIGHT = CAPTION_LOOK.height / (1080 * CANVAS_SCALE);
const CAPTION_SCALE = Object.freeze({ ySpan: CAPTION_HEIGHT });
const OUTLINE_COLOR = 0xFF000000;
const OUTLINE_DIRECTIONS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

// The words on one line, in light gold calligraphy, repeated first in black
// round them: PinballY's styled text has no stroke.
function drawCaption(host, dc, words) {
    const { width, height, size, weight, outline } = CAPTION_LOOK;
    const line = (dx, dy, color) => oneLine(host, dc, words, {
        x: outline + dx, y: dy, width: width - 2 * outline, height, size, weight, color, font: FONTS.script, align: "center",
    });
    for (const [dx, dy] of OUTLINE_DIRECTIONS) line(dx * outline, dy * outline, OUTLINE_COLOR);
    line(0, 0, COLORS.lightGold);
}

// caption: the words shown beneath the comet, already translated; show()
// can be given others, such as the launch's next step. A Loader created
// without one keeps its comet alone, centred, whatever show() is given.
export function createLoader(host, { zIndex, placement = LOADER_PLACEMENT.CENTRED, caption = null, screen = LOADER_SCREEN.PLAYFIELD }) {
    const imagePath = `${host.getProjectFolder()}\\${LOADER_IMAGE.folder}\\${LOADER_IMAGE.file}`;
    const [createLayer, removeLayer] = screen === LOADER_SCREEN.BACKGLASS
        ? [host.createBackglassDrawingLayer, host.removeBackglassDrawingLayer]
        : [host.createDrawingLayer, host.removeDrawingLayer];
    const cometY = caption === null ? placement : placement + CAPTION_HEIGHT / 2;
    const captionY = placement - LOADER_HEIGHT / 2;
    let layer = null;
    let captionLayer = null;
    let shownWords = null;

    // The caption shares the comet's z-index: the two never overlap, so
    // whatever lies just under the comet (a veil) stays under both.
    function showCaption(words) {
        if (words === shownWords) return;
        if (!captionLayer) {
            captionLayer = createLayer(zIndex);
            captionLayer.setScale(CAPTION_SCALE);
            captionLayer.setPos(0, captionY);
        }
        captionLayer.draw(dc => drawCaption(host, dc, words), CAPTION_LOOK.width, CAPTION_LOOK.height);
        shownWords = words;
    }

    return {
        show(words = caption) {
            if (!layer) {
                layer = createLayer(zIndex);
                layer.loadImage(imagePath);
                layer.setScale(LOADER_SCALE);
                layer.setPos(0, cometY);
            }
            if (caption !== null) showCaption(words);
        },
        hide() {
            if (!layer) return;
            removeLayer(layer);
            layer = null;
            if (!captionLayer) return;
            removeLayer(captionLayer);
            captionLayer = null;
            shownWords = null;
        },
        isShown: () => Boolean(layer),
    };
}
