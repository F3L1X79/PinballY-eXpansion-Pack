// ============================================================
// Backglass Clock's time, through main.js on the fake PinballY globals:
// drawn with the wheel Clock's drop shadow, and still centred with its
// underline inside the frame.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
const WHEEL_CLOCK_Z = 4500;
const SOFT_WHITE = 0xFFDCDCDC;
const SHADOW_COLOR = 0xC0000000;
const SHADOW_OFFSET = 2;
// Segoe UI's empty space above the digits, as a share of its line height.
const CAP_TOP = 776 / 2724;

const textStrokes = layer => layer.strokes().filter(stroke => "text" in stroke);

test("during a game the Backglass Clock's time has the wheel clock's drop shadow, centred with its underline", async () => {
    const fake = createFakePinballYHost({
        now: new Date(2026, 9, 30, 21, 47, 30), tables: [TABLE], monitorCount: 2,
        savedMediaWindowRects: { BackglassClock: { left: 2600, top: 40, right: 3000, bottom: 340 } },
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock" || key === "clock";
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    fake.playGame(TABLE);
    fake.gameStarted(TABLE);

    const [layer] = fake.mediaWindows()[0].layers();
    const [shadow, time] = textStrokes(layer);
    assert.equal(textStrokes(layer).length, 2, "the time and its shadow, nothing else");
    assert.equal(shadow.text, lang.clock.time(21, 47));
    assert.equal(time.text, lang.clock.time(21, 47));
    assert.equal(time.color, SOFT_WHITE, "the time over its shadow");
    assert.equal(shadow.color, SHADOW_COLOR);
    assert.equal(shadow.rect.x - time.rect.x, SHADOW_OFFSET);
    assert.equal(shadow.rect.y - time.rect.y, SHADOW_OFFSET);

    const [wheelShadow, wheelTime] = textStrokes(fake.drawingLayers().find(wheel => wheel.zIndex === WHEEL_CLOCK_Z));
    assert.equal(shadow.color, wheelShadow.color, "the wheel Clock's shadow");
    assert.equal(shadow.rect.x - time.rect.x, wheelShadow.rect.x - wheelTime.rect.x);
    assert.equal(shadow.rect.y - time.rect.y, wheelShadow.rect.y - wheelTime.rect.y);
    assert.equal(time.color, wheelTime.color);
    assert.equal(time.weight, wheelTime.weight);

    const canvas = layer.canvasSize();
    const [, box, underline] = layer.strokes().filter(stroke => "fill" in stroke).map(stroke => stroke.rect);
    assert.equal(time.align, "center");
    assert.equal(time.rect.x + time.rect.width / 2, canvas.width / 2, "the time centred in the box");
    assert.ok(Math.abs(underline.x + underline.width / 2 - canvas.width / 2) <= 1, "its underline centred too");
    assert.ok(underline.x > box.x && underline.x + underline.width < box.x + box.width, "the underline between the frame's sides");
    const above = time.rect.y + CAP_TOP * time.rect.height - box.y;
    const below = box.y + box.height - underline.y - underline.height;
    assert.ok(above > 0 && below > 0, "the digits and the underline between the frame's top and bottom");
    assert.ok(Math.abs(above - below) <= 1, "the digits and the underline centred together, top to bottom");

    assertNoErrorLogged(fake);
});
