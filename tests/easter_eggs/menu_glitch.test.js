// ============================================================
// The Menu Glitch through main.js: drawn at the main menu's opening, normal
// for 0.4 s then torn for 3 s, every button ignored, the table silent then
// climbing back, the menu given back whole, its Achievement Notified silently.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { isDrawnMenuShown, highlightedEntry, press } from "../drawn_menu/drawn_menu_reader.js";
import {
    startMenuGlitchScenario, glitchLayers, shownGlitchLayers, shownGlitchTexts, allGlitchTexts, glitchSounds, volumes, profileFile,
    LEAD_IN_MS, SOUND_STARTS_MS, EFFECT_MS, CLIMB_MS,
} from "./menu_glitch_scenario.js";

// Below every chance of the effect but its strips' flicker: entries scrambled, bands shown.
const STEADY_RANDOM = () => 0.3;
const A_FRAME_MS = 40;
const STEPPED_VOLUMES = [1, 3, 6, 11, 17, 25, 34, 44, 56, 69, 84, 100];

test("the Menu Glitch tears the main menu for 3 s, then gives it back and counts silently", async () => {
    const { fake, lang, store } = await startMenuGlitchScenario({ random: STEADY_RANDOM });
    const title = lang.achievements.ghostInTheMachineTitle();
    const volumesBefore = volumes(fake).length;
    const newVolumes = () => volumes(fake).slice(volumesBefore);
    const commandsBefore = fake.executedCommands().length;

    fake.openMainMenu();
    const startMs = fake.now().getTime();
    const untilElapsed = ms => fake.advanceTime(ms - (fake.now().getTime() - startMs));
    assert.equal(fake.currentMenu(), null, "drawn: the native menu was cancelled");
    assert.deepEqual(newVolumes(), [0], "silent inside menuopen, before the menu shows");
    assert.equal(JSON.parse(fake.readFile(profileFile("Alice"))).surprises.easterEggs.menuGlitch, true, "recorded before it plays");
    assert.ok(glitchLayers(fake).length > 9, "every copy is drawn inside menuopen");
    assert.ok(allGlitchTexts(fake).includes("ECILA"), "the Profile's name backwards");
    assert.deepEqual(shownGlitchLayers(fake), [], "nothing of it shows yet");
    assert.deepEqual(layersBreakingTheRule(fake, glitchLayers(fake)), [], "the menu's own layers are still fading in");

    untilElapsed(SOUND_STARTS_MS - 1);
    assert.equal(glitchSounds(fake).length, 0);
    untilElapsed(SOUND_STARTS_MS);
    assert.equal(glitchSounds(fake).length, 1, "the sound starts 380 ms before the glitch");

    untilElapsed(LEAD_IN_MS - 1);
    assert.ok(isDrawnMenuShown(fake), "the menu looks normal for 0.4 s");
    assert.deepEqual(shownGlitchLayers(fake), []);
    assert.ok(fake.fire("commandbuttondown", { command: "Next", repeat: false }).defaultPrevented, "buttons ignored from the start");

    untilElapsed(LEAD_IN_MS + A_FRAME_MS);
    assert.ok(!isDrawnMenuShown(fake), "the strips replace it");
    assert.ok(shownGlitchLayers(fake).length > 0, "torn");
    assert.deepEqual(layersBreakingTheRule(fake), []);

    untilElapsed(LEAD_IN_MS + EFFECT_MS / 2);
    assert.ok(shownGlitchTexts(fake).some(text => /[█▒░▓#%&@$?!/\\<>]/.test(text)), "corrupted entries");
    assert.ok(shownGlitchLayers(fake).length > 3);
    for (const button of ["Next", "Select", "Launch", "Exit"]) {
        assert.ok(fake.fire("commandbuttondown", { command: button, repeat: false }).defaultPrevented, button);
    }
    assert.equal(fake.executedCommands().length, commandsBefore, "nothing chosen, nothing closed");
    assert.deepEqual(layersBreakingTheRule(fake), []);
    assert.deepEqual(newVolumes(), [0], "silent all along");

    untilElapsed(LEAD_IN_MS + EFFECT_MS + A_FRAME_MS);
    assert.deepEqual(glitchLayers(fake), [], "nothing left");
    assert.ok(isDrawnMenuShown(fake), "the menu is back whole");
    assert.deepEqual(layersBreakingTheRule(fake), []);
    await settle();
    assert.equal(store.getNotifiedOf("Alice").includes("ghostInTheMachine"), true, "counts for the Player Level");
    assert.ok(!toastDrawings(fake).some(drawing => drawing.texts.includes(title)), "no toast");

    const firstEntry = highlightedEntry(fake);
    press(fake, "Next");
    assert.notEqual(highlightedEntry(fake), firstEntry, "buttons work again during the climb");

    fake.advanceTime(CLIMB_MS);
    assert.deepEqual(newVolumes(), [0, ...STEPPED_VOLUMES], "back in 12 steps along the curve");
    assert.ok(!toastDrawings(fake).some(drawing => drawing.texts.includes(title)), "still no toast");
    assertNoErrorLogged(fake);
});
