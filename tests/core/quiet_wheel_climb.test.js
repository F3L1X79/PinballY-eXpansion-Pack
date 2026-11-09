// ============================================================
// Quiet wheel's climb: a release that brings the table back in equal time
// steps along a curve, keeping its pending file until the last step, and
// what ends it early.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { createQuietWheel } from "../../common/core/quiet_wheel.js";

const CONFIG_ID = "Medieval Madness (Williams 1997)";
const PENDING_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\quiet_wheel_pending.json";
const CLIMB = { durationMs: 1000, steps: 4, exponent: 2 };
const STEP_MS = 250;

function startWheel(audioVolume) {
    const fake = createFakePinballYHost({ tables: [{ id: 1, configId: CONFIG_ID, title: "Medieval Madness", audioVolume }] });
    fake.installGlobals();
    return { fake, wheel: createQuietWheel(fake) };
}

const volumesWritten = fake => fake.gameUpdates().map(update => update.changes.audioVolume);

function startClimbFromSilence(audioVolume = 100) {
    const started = startWheel(audioVolume);
    started.wheel.hold("Glitch", { ceiling: 0 });
    started.wheel.release("Glitch", { climb: CLIMB });
    return started;
}

test("a release climbs back along its curve, one update per equal time step", () => {
    const { fake } = startClimbFromSilence();
    assert.deepEqual(volumesWritten(fake), [0], "nothing yet at the release");
    fake.advanceTime(STEP_MS - 1);
    assert.deepEqual(volumesWritten(fake), [0]);
    fake.advanceTime(1);
    assert.deepEqual(volumesWritten(fake), [0, 6]);
    fake.advanceTime(STEP_MS);
    assert.deepEqual(volumesWritten(fake), [0, 6, 25]);
    fake.advanceTime(STEP_MS * 2);
    assert.deepEqual(volumesWritten(fake), [0, 6, 25, 56, 100]);
    fake.advanceTime(STEP_MS * 4);
    assert.deepEqual(volumesWritten(fake), [0, 6, 25, 56, 100], "nothing after the last step");
    assert.equal(fake.runningIntervalCount(), 0);
    assertNoErrorLogged(fake);
});

test("the climb starts from the hold's ceiling", () => {
    const { fake, wheel } = startWheel(100);
    wheel.hold("Glitch");
    wheel.release("Glitch", { climb: CLIMB });
    fake.advanceTime(STEP_MS * 4);
    assert.deepEqual(volumesWritten(fake), [50, 53, 63, 78, 100]);
    assertNoErrorLogged(fake);
});

test("the pending file stays until the last step", () => {
    const { fake } = startClimbFromSilence();
    fake.advanceTime(STEP_MS * 3);
    assert.deepEqual(JSON.parse(fake.readFile(PENDING_FILE)), { configId: CONFIG_ID, title: "Medieval Madness", original: 100, quiet: 0 });
    fake.advanceTime(STEP_MS);
    assert.equal(fake.readFile(PENDING_FILE), undefined);
    assertNoErrorLogged(fake);
});

test("a crash during the climb restores the table at the next start", () => {
    const { fake } = startClimbFromSilence();
    fake.advanceTime(STEP_MS * 2);
    createQuietWheel(fake).restoreLeftover();
    assert.equal(fake.getGameInfo(CONFIG_ID).audioVolume, 100);
    assert.equal(fake.readFile(PENDING_FILE), undefined);
    assertNoErrorLogged(fake);
});

test("a hold during the climb ends it at once, with the original written before the new drop", () => {
    const { fake, wheel } = startClimbFromSilence();
    fake.advanceTime(STEP_MS);
    wheel.hold("Welcome Screen");
    assert.deepEqual(volumesWritten(fake), [0, 6, 100, 50]);
    assert.equal(JSON.parse(fake.readFile(PENDING_FILE)).original, 100, "the true original, not a step of the climb");
    fake.advanceTime(STEP_MS * 4);
    assert.deepEqual(volumesWritten(fake), [0, 6, 100, 50], "no step left running");
    assertNoErrorLogged(fake);
});

for (const type of ["launchoverlayshow", "attractmodestart"]) {
    test(`${type} ends the climb at once, with the original written`, () => {
        const { fake } = startClimbFromSilence();
        fake.advanceTime(STEP_MS);
        fake.fire(type, {});
        assert.deepEqual(volumesWritten(fake), [0, 6, 100]);
        assert.equal(fake.readFile(PENDING_FILE), undefined);
        fake.advanceTime(STEP_MS * 4);
        assert.deepEqual(volumesWritten(fake), [0, 6, 100], "no step left running");
        assertNoErrorLogged(fake);
    });
}

test("a menu opening leaves the climb running", () => {
    const { fake } = startClimbFromSilence();
    fake.advanceTime(STEP_MS);
    fake.fire("menuopen", {});
    assert.deepEqual(volumesWritten(fake), [0, 6]);
    fake.advanceTime(STEP_MS * 3);
    assert.deepEqual(volumesWritten(fake), [0, 6, 25, 56, 100]);
    assertNoErrorLogged(fake);
});

test("a table the hold left alone does not climb", () => {
    const { fake, wheel } = startWheel(40);
    wheel.hold("Glitch");
    wheel.release("Glitch", { climb: CLIMB });
    assert.equal(fake.runningIntervalCount(), 0);
    fake.advanceTime(STEP_MS * 4);
    assert.deepEqual(volumesWritten(fake), []);
    assertNoErrorLogged(fake);
});

test("the climb waits for the last hold to end", () => {
    const { fake, wheel } = startWheel(100);
    wheel.hold("Glitch", { ceiling: 0 });
    wheel.hold("Welcome Screen");
    wheel.release("Glitch", { climb: CLIMB });
    fake.advanceTime(STEP_MS * 4);
    assert.deepEqual(volumesWritten(fake), [0]);
    wheel.release("Welcome Screen", { climb: CLIMB });
    fake.advanceTime(STEP_MS * 4);
    assert.deepEqual(volumesWritten(fake), [0, 6, 25, 56, 100]);
    assertNoErrorLogged(fake);
});
