// ============================================================
// Rocket engine tests on the fake host: how a game reports its end to its
// caller, with the final score after the crash, or as given up when it
// stops before one. The Easter Egg's own scenarios cover the game itself, and
// its errors' logging, which goes through globals this bare fake host lacks.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { createDrawnScreenControls } from "../../common/core/drawn_screen_controls.js";
import { createQuietWheel } from "../../common/core/quiet_wheel.js";
import { createRocketEngine } from "../../common/rocket/rocket_engine.js";
import { FAILING_DRAW_MESSAGE } from "../support/failing_draws.js";
import { ROCKET_IMAGES } from "../easter_eggs/rocket_scenario.js";

const TEXTS = { dodge: "DODGE!", score: "Score" };

function setUp() {
    const fake = createFakePinballYHost({});
    for (const path of ROCKET_IMAGES) fake.addFile(path);
    const engine = createRocketEngine(fake, { controls: createDrawnScreenControls(fake), quietWheel: () => createQuietWheel(fake), musicFile: () => "" });
    return { fake, engine };
}

// Until the game reports its end, at most maxMs.
async function untilEnd(fake, ends, maxMs = 120000) {
    await settle();
    for (let elapsed = 0; ends.length === 0 && elapsed < maxMs; elapsed += 16) {
        fake.advanceTime(16);
        await settle();
    }
}

test("a game that crashes reports its final score, once", async () => {
    const { fake, engine } = setUp();
    const ends = [];
    engine.start({ texts: TEXTS, onEnd: result => ends.push(result) });
    await untilEnd(fake, ends);
    assert.equal(ends.length, 1);
    assert.equal(typeof ends[0].score, "number");
    assert.ok(ends[0].score >= 0);
    assert.equal(ends[0].givenUp, undefined);
    assert.equal(engine.isRunning(), false);
    fake.advanceTime(5000);
    assert.equal(ends.length, 1, "reported once");
});

const press = (fake, command, repeat = false) => fake.fire("commandbuttondown", { command, repeat });

test("Exit gives a game up during its intro and its play only when the caller asks for it", async () => {
    const { fake, engine } = setUp();
    const ends = [];
    engine.start({ texts: TEXTS, onEnd: result => ends.push(result) });
    await settle();
    fake.advanceTime(100);
    press(fake, "Exit");
    fake.advanceTime(500);
    assert.deepEqual(ends, [], "the Easter Egg's Exit does nothing");
    await untilEnd(fake, ends);

    for (const waitMs of [0, 100, 3000]) {
        const givenUp = [];
        engine.start({ texts: TEXTS, onEnd: result => givenUp.push(result), exitGivesUp: true });
        await settle();
        fake.advanceTime(waitMs);
        press(fake, "Exit");
        fake.advanceTime(500);
        await settle();
        assert.deepEqual(givenUp, [{ givenUp: true }], `given up after ${waitMs} ms`);
        assert.equal(engine.isRunning(), false);
    }
});

const shownTexts = fake => fake.drawingLayers().filter(layer => layer.alpha > 0).flatMap(layer => layer.texts());

test("the intro names the commands and stays for the time asked; the Easter Egg's names none", async () => {
    const { fake, engine } = setUp();
    const COMMAND = "Left / right flipper: change lane";
    engine.start({ texts: TEXTS, onEnd: () => {}, intro: { commands: [COMMAND], ms: 3500 } });
    await settle();
    fake.advanceTime(50 + 16);
    assert.ok(shownTexts(fake).includes(COMMAND), "the commands under the word");
    fake.advanceTime(3000);
    assert.ok(shownTexts(fake).includes(TEXTS.dodge), "still up past the Easter Egg's 1.9 s");
    assert.ok(shownTexts(fake).includes(COMMAND));
    fake.advanceTime(500);
    assert.equal(shownTexts(fake).includes(COMMAND), false, "gone with the word");
    assert.equal(shownTexts(fake).includes(TEXTS.dodge), false);
    press(fake, "Exit");
    await untilEnd(fake, []);

    const { fake: eggFake, engine: egg } = setUp();
    egg.start({ texts: TEXTS, onEnd: () => {} });
    await settle();
    eggFake.advanceTime(50 + 16);
    assert.ok(shownTexts(eggFake).includes(TEXTS.dodge));
    assert.deepEqual(shownTexts(eggFake).filter(text => text === COMMAND), []);
    eggFake.advanceTime(1900);
    assert.equal(shownTexts(eggFake).includes(TEXTS.dodge), false, "1.9 s for the Easter Egg");
});

test("a caller taking the crash over gets the score without the panel, the game kept up until it ends it", async () => {
    const { fake, engine } = setUp();
    const crashes = [];
    const ends = [];
    engine.start({ texts: TEXTS, onEnd: result => ends.push(result), onCrashed: (score, end) => crashes.push({ score, end }) });
    await settle();
    for (let elapsed = 0; crashes.length === 0 && elapsed < 120000; elapsed += 16) fake.advanceTime(16);
    assert.equal(crashes.length, 1);
    assert.equal(shownTexts(fake).includes(TEXTS.score), false, "no score panel");
    fake.advanceTime(10000);
    await settle();
    assert.deepEqual(ends, [], "kept up until the caller ends it");
    assert.equal(engine.isRunning(), true);
    assert.ok(fake.drawingLayers().some(layer => layer.zIndex === 7500 && layer.alpha > 0), "the backdrop still up");
    press(fake, "Exit");
    fake.advanceTime(500);
    assert.deepEqual(ends, [], "Exit gives nothing up after the crash");

    crashes[0].end();
    crashes[0].end();
    fake.advanceTime(500);
    await settle();
    assert.deepEqual(ends, [{ score: crashes[0].score }]);
    assert.equal(engine.isRunning(), false);
    assert.deepEqual(fake.drawingLayers().filter(layer => layer.zIndex >= 7500), [], "every layer gone");
});

test("a game stopped by a failure before its crash is reported as given up", async () => {
    const { fake, engine } = setUp();
    const ends = [];
    engine.start({ texts: TEXTS, onEnd: result => ends.push(result) });
    await settle();
    fake.advanceTime(100);
    const realStyledText = fake.createStyledText;
    // The score is drawn again when the first row passes the ship. Not
    // whileDrawsFail(): it swaps the global StyledText, which the bare fake host never reads.
    fake.createStyledText = () => { throw new Error(FAILING_DRAW_MESSAGE); };
    try {
        await untilEnd(fake, ends, 10000);
    } finally {
        fake.createStyledText = realStyledText;
    }
    assert.deepEqual(ends, [{ givenUp: true }]);
});
