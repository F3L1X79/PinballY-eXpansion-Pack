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
