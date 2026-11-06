// ============================================================
// Placed layers tests: over the fake PinballY host, a layer is created
// hidden and reduced to a point, still measuring the window when drawn
// without a size; a placed layer shows in reference pixels; hide then show
// brings a placed or a window-sized layer back; remove takes it away.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { createHiddenLayer, hideLayer, createPlacedLayers } from "../../common/drawing/placed_layers.js";

const Z_INDEX = 6000;
const REFERENCE_HEIGHT = 1920;
// On the fake host's 1920 x 1080 window.
const REFERENCE_WIDTH = REFERENCE_HEIGHT * 1920 / 1080;
const RECT = { x: 100, y: 480, w: 400, h: 960 };

const near = (a, b) => Math.abs(a - b) < 1e-9;

function openSet() {
    const fake = createFakePinballYHost();
    const placed = createPlacedLayers(fake, { referenceHeight: REFERENCE_HEIGHT });
    placed.measure({ width: 1920, height: 1080 });
    return { fake, placed };
}

test("a layer created hidden has alpha 0 and is a point, and hiding it again keeps it so", () => {
    const fake = createFakePinballYHost();
    const layer = createHiddenLayer(fake, Z_INDEX);
    assert.equal(layer.alpha, 0);
    assert.ok(isPoint(layer));
    layer.alpha = 1;
    layer.setScale({ xSpan: 1, ySpan: 1 });
    hideLayer(layer);
    assert.deepEqual(layersBreakingTheRule(fake), []);
});

test("a layer reduced to a point still measures the window when drawn without a size", () => {
    const fake = createFakePinballYHost({ layoutSize: { width: 1080, height: 1920 } });
    const layer = createHiddenLayer(fake, Z_INDEX);
    let size = null;
    layer.draw(dc => { size = dc.getSize(); });
    assert.deepEqual(size, { width: 1080, height: 1920 });
});

test("a layer of the set is created hidden, a point, placed or not", () => {
    const { fake, placed } = openSet();
    placed.create(Z_INDEX);
    const piece = placed.create(Z_INDEX);
    placed.place(piece, RECT);
    assert.equal(fake.drawingLayers().length, 2);
    for (const layer of fake.drawingLayers()) {
        assert.equal(layer.alpha, 0);
        assert.ok(isPoint(layer));
    }
});

test("a placed layer shows on its rect in reference pixels, and comes back there after hide then show", () => {
    const { placed } = openSet();
    const layer = placed.create(Z_INDEX);
    placed.place(layer, RECT);
    placed.show(layer);
    // Half the window's height, its centre at 300 px from the left (of
    // 3413.33) and at 960 px from the top: the window's middle height.
    const expected = { ySpan: 0.5, x: 300 / REFERENCE_WIDTH - 0.5, y: 0 };
    const assertPlaced = () => {
        assert.deepEqual(layer.scale(), { ySpan: expected.ySpan });
        assert.ok(near(layer.position().x, expected.x) && near(layer.position().y, expected.y), JSON.stringify(layer.position()));
    };
    assertPlaced();
    placed.hide(layer);
    assert.equal(layer.alpha, 0);
    assert.ok(isPoint(layer));
    placed.show(layer);
    assertPlaced();
});

test("a layer placed elsewhere while hidden shows on its new rect", () => {
    const { placed } = openSet();
    const layer = placed.create(Z_INDEX);
    placed.place(layer, RECT);
    placed.place(layer, { ...RECT, h: 480 });
    assert.ok(isPoint(layer), "still a point while hidden");
    placed.show(layer);
    assert.deepEqual(layer.scale(), { ySpan: 0.25 });
    placed.place(layer, RECT);
    assert.deepEqual(layer.scale(), { ySpan: 0.5 }, "resized while shown");
});

test("a window-sized layer comes back at the window's size after hide then show", () => {
    const { placed } = openSet();
    const backdrop = placed.create(Z_INDEX);
    placed.show(backdrop);
    assert.deepEqual(backdrop.scale(), { xSpan: 1, ySpan: 1 });
    placed.hide(backdrop);
    assert.ok(isPoint(backdrop));
    placed.show(backdrop);
    assert.deepEqual(backdrop.scale(), { xSpan: 1, ySpan: 1 });
});

test("the set measures the reference width from the window's size", () => {
    const { placed } = openSet();
    assert.ok(near(placed.referenceWidth, REFERENCE_WIDTH));
});

test("show and hide set no alpha but hide's 0, and add no clear", () => {
    const { placed } = openSet();
    const layer = placed.create(Z_INDEX);
    layer.clear(0xff102030);
    placed.place(layer, RECT);
    placed.show(layer);
    assert.equal(layer.alpha, 0, "the screen sets the opacity");
    layer.alpha = 0.5;
    placed.place(layer, { ...RECT, x: 0 });
    assert.equal(layer.alpha, 0.5);
    assert.equal(layer.clearColor(), 0xff102030, "never cleared");
});

test("a set without a reference height places in the window's own pixels, measured again on a new window", () => {
    const fake = createFakePinballYHost();
    const placed = createPlacedLayers(fake);
    placed.measure({ width: 1920, height: 1080 });
    const layer = placed.create(Z_INDEX);
    placed.place(layer, { x: 860, y: 270, w: 200, h: 540 });
    placed.show(layer);
    assert.deepEqual(layer.scale(), { ySpan: 0.5 });
    assert.ok(near(layer.position().x, 0) && near(layer.position().y, 0), JSON.stringify(layer.position()));
    placed.hide(layer);
    placed.measure({ width: 1080, height: 1920 });
    assert.equal(placed.referenceWidth, 1080);
    placed.place(layer, { x: 440, y: 690, w: 200, h: 540 });
    placed.show(layer);
    assert.deepEqual(layer.scale(), { ySpan: 540 / 1920 });
    assert.ok(near(layer.position().x, 0) && near(layer.position().y, 0), JSON.stringify(layer.position()));
});

test("isShown tells a shown layer from a hidden one", () => {
    const { placed } = openSet();
    const layer = placed.create(Z_INDEX);
    assert.equal(placed.isShown(layer), false);
    placed.show(layer);
    assert.equal(placed.isShown(layer), true);
    placed.hide(layer);
    assert.equal(placed.isShown(layer), false);
});

test("remove takes the layer away", () => {
    const { fake, placed } = openSet();
    const layer = placed.create(Z_INDEX);
    placed.remove(layer);
    assert.equal(fake.drawingLayers().length, 0);
});
