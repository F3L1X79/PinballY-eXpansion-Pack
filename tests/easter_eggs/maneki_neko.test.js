// ============================================================
// The Maneki-neko through main.js: at its wheel move it pops out of an edge
// with its horn, the table's sound on and the wheel usable, and goes back;
// its Achievement's toast comes once it has gone, and it never comes twice.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import {
    startManekiScenario, moveWheelTimes, catLayers, shownCat, horns, profileFile, RIGHT_IMAGE, VISIBLE_MS, WHOLE_MS, TOAST_LIFE_MS,
} from "./maneki_neko_scenario.js";

const NEAR = 0.002;
// On the fake host's 1920 x 1080 window, the side is 268.8 px.
const SIDE_SPAN = 268.8 / 1080;
const OUT_X = 0.43;
// 0.52 of the way through a move, in frames of 16 ms: 37.8 px still hidden on
// the way out, 37.8 px already hidden at 0.52 of the way back.
const PART_WAY_X = 0.44968;

test("at its wheel move the cat pops out of the right edge with its horn, and goes back", async () => {
    // 0.5: the 13th move, the right edge, the middle of the room left on it.
    const { fake, lang, store } = await startManekiScenario();
    const hasToast = () => toastDrawings(fake).some(drawing => drawing.texts.includes(lang.achievements.nekomancerTitle()));

    moveWheelTimes(fake, 12);
    assert.deepEqual(catLayers(fake), [], "not before its move");
    moveWheelTimes(fake, 1);
    assert.equal(horns(fake).length, 1, "the horn starts with the way out");
    assert.equal(JSON.parse(fake.readFile(profileFile("guest"))).surprises.easterEggs.manekiNeko, true, "recorded before it plays");
    const startMs = fake.now().getTime();
    const untilElapsed = ms => fake.advanceTime(ms - (fake.now().getTime() - startMs));

    untilElapsed(96);
    const cat = shownCat(fake);
    assert.deepEqual(cat.images(), [RIGHT_IMAGE]);
    assert.ok(Math.abs(cat.position().x - PART_WAY_X) < NEAR, `eased out: ${cat.position().x}`);
    assert.deepEqual(layersBreakingTheRule(fake), []);

    untilElapsed(VISIBLE_MS);
    assert.ok(Math.abs(cat.position().x - OUT_X) < NEAR, `its cut against the edge: ${cat.position().x}`);
    assert.ok(Math.abs(cat.position().y) < NEAR, "in the middle of the room left on the edge");
    assert.ok(Math.abs(cat.scale().ySpan - SIDE_SPAN) < NEAR, "14 % of the window's width");
    assert.notEqual(press(fake, "Next").defaultPrevented, true, "the wheel stays usable");
    assert.deepEqual(fake.gameUpdates(), [], "the table's sound stays on");
    assert.equal(hasToast(), false, "no toast while it is out");

    untilElapsed(2304);
    assert.ok(Math.abs(cat.position().x - PART_WAY_X) < NEAR, `eased back: ${cat.position().x}`);

    untilElapsed(WHOLE_MS);
    assert.deepEqual(catLayers(fake), [], "gone");
    await settle();
    assert.equal(hasToast(), true, "its toast once it has gone");
    assert.equal(store.getNotifiedOf("guest").includes("nekomancer"), true);

    fake.advanceTime(TOAST_LIFE_MS);
    moveWheelTimes(fake, 40);
    assert.deepEqual(catLayers(fake), [], "once per start");
    assert.equal(horns(fake).length, 1);
    assertNoErrorLogged(fake);
});
