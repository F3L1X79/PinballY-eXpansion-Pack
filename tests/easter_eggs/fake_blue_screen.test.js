// ============================================================
// The Fake Blue Screen through main.js: back on the wheel after a table
// that ran, the table silent first, then 200 ms later the blue screen with
// its sound, for 10 s, every button ignored, then a
// hard cut with the table's sound back; its Achievement Notified silently.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startBlueScreenScenario, playTable, screenLayers, isScreenShown, shownTexts, textLayer, blueScreenSounds, volumeWrites, profileFile,
    SILENCE_LEAD_MS, SCREEN_MS, BLUE, GREY,
} from "./fake_blue_screen_scenario.js";

test("back from a table, the Fake Blue Screen shows for 10 s, then cuts to the wheel and counts silently", async () => {
    const { fake, lang, store, table } = await startBlueScreenScenario();
    const title = lang.achievements.kernelPanicTitle();
    assert.equal(title, "Kernel Panic", "the title stays in English");

    await playTable(fake, table);
    assert.equal(JSON.parse(fake.readFile(profileFile("guest"))).surprises.easterEggs.fakeBlueScreen, true, "recorded before it plays");
    assert.deepEqual(volumeWrites(fake, table), [0], "the table silent first");
    assert.equal(isScreenShown(fake), false, "nothing shows yet");
    assert.ok(press(fake, "Next").defaultPrevented, "the buttons are already ignored");
    assert.deepEqual(layersBreakingTheRule(fake), []);

    fake.advanceTime(SILENCE_LEAD_MS - 1);
    assert.equal(isScreenShown(fake), false);
    assert.deepEqual(blueScreenSounds(fake), []);
    fake.advanceTime(1);
    assert.ok(isScreenShown(fake), "the screen 200 ms later");
    assert.equal(blueScreenSounds(fake).length, 1, "with its sound");
    const texts = shownTexts(fake);
    assert.ok(texts.includes("Windows"), "the title unchanged");
    assert.ok(texts.includes("Error: 0E : 016F : BFF9B3D4"), "the error code unchanged");
    assert.ok(texts.includes(lang.fakeBlueScreen.restarting), "the restarting line");
    assert.ok(texts.some(text => text.includes("CAPS LOCK+TAB+BACKSPACE+SCROLL LOCK")), "the absurd key combination");
    assert.ok(texts.every(text => text.length <= 60), "lines cut at 60 characters");
    const strokes = textLayer(fake).strokes();
    assert.equal(strokes[0].fill, BLUE, "the background painted inside the draw");
    assert.deepEqual(strokes[0].rect, { x: 0, y: 0, width: 1080, height: 1920 }, "on the whole window");
    assert.ok(strokes.some(stroke => stroke.fill === GREY), "the grey block behind the title");
    assert.equal(strokes.find(stroke => stroke.text === "Windows").color, BLUE, "the title in blue");
    assert.ok(strokes.filter(stroke => "text" in stroke && stroke.text !== "Windows").every(stroke => stroke.color === 0xFFFFFFFF && stroke.weight === 400), "white text");
    assert.deepEqual(layersBreakingTheRule(fake), []);

    for (const button of ["Exit", "Select", "Launch", "Next"]) assert.ok(press(fake, button).defaultPrevented, `${button} is ignored`);
    fake.enterAttractMode();
    assert.equal(fake.getFullUIMode().mode, "wheel", "attract mode cannot start");
    fake.advanceTime(SCREEN_MS - 1);
    assert.ok(isScreenShown(fake), "for 10 s");
    assert.deepEqual(volumeWrites(fake, table), [0], "silent all along");

    fake.advanceTime(1);
    assert.deepEqual(volumeWrites(fake, table), [0, 80], "the table's sound back at the cut");
    assert.deepEqual(screenLayers(fake), [], "a hard cut: every layer gone");
    await settle();
    assert.equal(store.getNotifiedOf("guest").includes("kernelPanic"), true, "counts for the Player Level");
    assert.ok(!toastDrawings(fake).some(drawing => drawing.texts.includes(title)), "no toast");
    assert.notEqual(press(fake, "Next").defaultPrevented, true, "the buttons are the wheel's again");
    assertNoErrorLogged(fake);
});
