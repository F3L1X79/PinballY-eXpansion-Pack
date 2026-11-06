// ============================================================
// Reads the Loader on the fake PinballY host's playfield or backglass layers: the layer
// showing the comet image, whether it shows, its z-index, scale and
// position; and its caption, the words drawn by the other layers with their
// colour and black outline. Never loaded by PinballY.
// ============================================================

import assert from "node:assert/strict";
import { LOADER_IMAGE } from "../../common/drawing/loader_image.js";

const OUTLINE_COLOR = 0xFF000000;

const isLoaderLayer = layer => {
    const image = layer.loadedImage();
    return image !== null && image.endsWith(`\\${LOADER_IMAGE.folder}\\${LOADER_IMAGE.file}`);
};

// The Loader layers, shown or not.
export const loaderLayerCount = fake => fake.drawingLayers().filter(isLoaderLayer).length;

// { shown: false } without a Loader on screen, else { shown: true, zIndex,
// scale, position }.
export const readLoader = fake => readLoaderAmong(fake.drawingLayers());

// The same, on the backglass window's layers, and whether any other layer
// shows there (a caption, say).
export function readBackglassLoader(fake) {
    const layers = fake.backglassDrawingLayers();
    const loader = readLoaderAmong(layers);
    return { ...loader, otherLayers: layers.filter(layer => !isLoaderLayer(layer)).length };
}

function readLoaderAmong(layers) {
    const shown = layers.filter(layer => isLoaderLayer(layer) && layer.alpha > 0);
    assert.ok(shown.length <= 1, "a single Loader at a time");
    if (shown.length === 0) return { shown: false };
    const [layer] = shown;
    return { shown: true, zIndex: layer.zIndex, scale: layer.scale(), position: layer.position() };
}

// null without a caption on screen, else { text, color, outline, lines,
// zIndex, scale, position }; outline: the eight directions the black copies
// are offset by, as "dx,dy" signs. The caption shares the comet's z-index.
export function readLoaderCaption(fake) {
    const loader = readLoader(fake);
    if (!loader.shown) return null;
    const layers = fake.drawingLayers().filter(layer => layer.zIndex === loader.zIndex && layer.alpha > 0 && layer.strokes().some(stroke => "text" in stroke));
    assert.ok(layers.length <= 1, "a single caption at a time");
    if (layers.length === 0) return null;
    const [layer] = layers;
    const texts = layer.strokes().filter(stroke => "text" in stroke);
    const word = texts[texts.length - 1];
    const copies = texts.slice(0, -1);
    assert.ok(copies.every(copy => copy.text === word.text && copy.color === OUTLINE_COLOR), "the copies are the same words in black");
    const outline = copies
        .map(copy => `${Math.sign(copy.rect.x - word.rect.x)},${Math.sign(copy.rect.y - word.rect.y)}`)
        .sort();
    return {
        text: word.text,
        color: word.color,
        outline,
        lines: word.text.split("\n").length,
        zIndex: layer.zIndex,
        scale: layer.scale(),
        position: layer.position(),
    };
}

// The eight directions round the words, as readLoaderCaption() lists them.
export const EIGHT_DIRECTIONS = ["-1,-1", "-1,0", "-1,1", "0,-1", "0,1", "1,-1", "1,0", "1,1"];

const LIGHT_GOLD = 0xFFFFD678;

// The words on one line, in light gold outlined in black all round.
export function assertGoldCaption(caption, words) {
    assert.ok(caption, "the words show");
    assert.equal(caption.text, words);
    assert.equal(caption.color, LIGHT_GOLD, "in light gold");
    assert.deepEqual(caption.outline, EIGHT_DIRECTIONS, "outlined in black in eight directions");
    assert.equal(caption.lines, 1, "on one line");
}

// The caption just beneath the comet, the two centred across.
export function assertCaptionBeneathComet(loader, caption) {
    assert.equal(caption.position.x, 0, "centred across");
    assert.equal(loader.position.x, 0);
    const cometBottom = loader.position.y - loader.scale.ySpan / 2;
    const captionTop = caption.position.y + caption.scale.ySpan / 2;
    assert.ok(captionTop <= cometBottom && cometBottom - captionTop < 0.03, "just beneath the comet");
}
