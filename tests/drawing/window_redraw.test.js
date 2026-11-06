// ============================================================
// Window redraw tests: over the fake PinballY host, the backdrop measures the
// window and lays the screen out; a new window size draws the screen again in
// place, in order, kept state restored, logged once; nothing while the size
// stays; a redraw that throws gives the screen up, its new backdrop not left
// behind (its logged error is the screens' scenarios to check).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createPlacedLayers } from "../../common/drawing/placed_layers.js";
import { createWindowRedraw } from "../../common/drawing/window_redraw.js";

const SCRIPT_NAME = "TestScreen";
const Z_INDEX = 6000;
const REFERENCE_HEIGHT = 1920;
const OTHER = { width: 1080, height: 1920 };
// Past the window watch's period (about 100 ms).
const WATCH_OVER_MS = 120;
const PANEL = { x: 100, y: 100, w: 800, h: 600 };

const redrawLines = fake => fake.logLines().filter(line => line.includes(`[${SCRIPT_NAME}]`) && line.includes("redrawn for the window's new size"));
const layersAt = fake => fake.drawingLayers().filter(layer => layer.zIndex === Z_INDEX);

// A screen made only of its backdrop, which records what the redraw asks of it.
function openScreen({ failingStep = null } = {}) {
    const fake = createFakePinballYHost();
    // The scripts' init is over: the view reports the window's size.
    fake.advanceTime(1);
    const placed = createPlacedLayers(fake, { referenceHeight: REFERENCE_HEIGHT });
    const redraw = createWindowRedraw(fake, SCRIPT_NAME, {
        placed, zIndex: Z_INDEX, referenceHeight: REFERENCE_HEIGHT, layout: referenceWidth => ({ referenceWidth, panel: PANEL }),
    });
    const calls = [];
    let backdrop = redraw.drawOpeningBackdrop();
    const screen = {
        keep: () => {
            calls.push("keep");
            if (failingStep === "keep") throw new Error("keep failed");
            return () => calls.push("restore");
        },
        removeLayers: () => {
            calls.push("removeLayers");
            placed.remove(backdrop.layer);
        },
        useBackdrop: next => {
            calls.push("useBackdrop");
            backdrop = next;
        },
        pieceSteps: () => [() => {
            calls.push("piece");
            if (failingStep === "piece") throw new Error("piece failed");
        }],
        onFailed: () => {
            calls.push("onFailed");
            redraw.stop();
            placed.remove(backdrop.layer);
        },
    };
    redraw.start(screen);
    return { fake, redraw, calls, backdrop: () => backdrop };
}

test("the backdrop measures the window and lays the screen out for it", () => {
    const { fake, backdrop } = openScreen();
    const { layer, referenceWidth, geometry } = backdrop();
    assert.equal(referenceWidth, REFERENCE_HEIGHT * 1920 / 1080);
    assert.deepEqual(geometry, { referenceWidth, panel: PANEL });
    assert.deepEqual(layer.canvasSize(), { width: 1920, height: 1080 });
    assert.equal(layersAt(fake).length, 1);
});

test("a new window size draws the screen again in place, what it keeps restored, logged once", () => {
    const { fake, calls, backdrop } = openScreen();
    fake.setLayoutSize(OTHER);
    fake.advanceTime(WATCH_OVER_MS);
    assert.deepEqual(calls, ["keep", "removeLayers", "useBackdrop", "piece", "restore"]);
    assert.deepEqual(backdrop().layer.canvasSize(), OTHER);
    assert.equal(backdrop().referenceWidth, REFERENCE_HEIGHT * 1080 / 1920);
    assert.equal(layersAt(fake).length, 1, "the old backdrop is gone");
    assert.equal(redrawLines(fake).length, 1, redrawLines(fake).join("\n"));
    assert.match(redrawLines(fake)[0], /view 1920x1080 to 1080x1920, layers 1920x1080 to 1080x1920/);

    fake.advanceTime(1000);
    assert.equal(calls.length, 5, "nothing redrawn while the size stays the same");
});

test("once stopped, a new window size redraws nothing", () => {
    const { fake, redraw, calls } = openScreen();
    redraw.stop();
    fake.setLayoutSize(OTHER);
    fake.advanceTime(WATCH_OVER_MS);
    assert.deepEqual(calls, []);
    assert.deepEqual(redrawLines(fake), []);
});

test("a piece that fails to draw gives the screen up", () => {
    const { fake, calls } = openScreen({ failingStep: "piece" });
    fake.setLayoutSize(OTHER);
    fake.advanceTime(WATCH_OVER_MS);
    assert.deepEqual(calls, ["keep", "removeLayers", "useBackdrop", "piece", "onFailed"]);
    assert.equal(layersAt(fake).length, 0);
    assert.deepEqual(redrawLines(fake), []);

    fake.advanceTime(1000);
    assert.equal(calls.length, 5, "the watch stopped with the screen");
});

test("a failure before the screen takes the new backdrop leaves that backdrop behind nowhere", () => {
    const { fake, calls } = openScreen({ failingStep: "keep" });
    fake.setLayoutSize(OTHER);
    fake.advanceTime(WATCH_OVER_MS);
    assert.deepEqual(calls, ["keep", "onFailed"]);
    assert.equal(layersAt(fake).length, 0, "neither the old backdrop nor the new one is left");
});
