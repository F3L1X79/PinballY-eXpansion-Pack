// ============================================================
// Quiet wheel's ceiling per hold: 0 silences the table, none means 50, and a
// stricter hold takes a table already lowered further down.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { createQuietWheel } from "../../common/core/quiet_wheel.js";

const CONFIG_ID = "Medieval Madness (Williams 1997)";
const PENDING_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\quiet_wheel_pending.json";
const HANDOVER_OVER_MS = 200;

function startWheel(audioVolume) {
    const fake = createFakePinballYHost({ tables: [{ id: 1, configId: CONFIG_ID, title: "Medieval Madness", audioVolume }] });
    fake.installGlobals();
    return { fake, wheel: createQuietWheel(fake) };
}

const volumesWritten = fake => fake.gameUpdates().map(update => update.changes.audioVolume);

test("a hold with a ceiling of 0 silences the table until its release", () => {
    const { fake, wheel } = startWheel(81);
    wheel.hold("Crow", { ceiling: 0 });
    assert.deepEqual(volumesWritten(fake), [0]);
    assert.deepEqual(JSON.parse(fake.readFile(PENDING_FILE)), { configId: CONFIG_ID, title: "Medieval Madness", original: 81, quiet: 0 });

    wheel.release("Crow", { atOnce: true });
    assert.deepEqual(volumesWritten(fake), [0, 81]);
    assert.equal(fake.readFile(PENDING_FILE), undefined);
    assertNoErrorLogged(fake);
});

test("a hold without a ceiling lowers the table to 50", () => {
    const { fake, wheel } = startWheel(81);
    wheel.hold("Welcome Screen");
    assert.deepEqual(volumesWritten(fake), [50]);
    assertNoErrorLogged(fake);
});

test("a table at or below the ceiling gets no update", () => {
    const { fake, wheel } = startWheel(0);
    wheel.hold("Crow", { ceiling: 0 });
    wheel.release("Crow", { atOnce: true });
    assert.deepEqual(volumesWritten(fake), []);
    assertNoErrorLogged(fake);
});

test("a silencing hold during the hand-over takes the lowered table on down, keeping the true original", () => {
    const { fake, wheel } = startWheel(81);
    wheel.hold("Welcome Screen");
    wheel.release("Welcome Screen");
    wheel.hold("Crow", { ceiling: 0 });
    assert.deepEqual(volumesWritten(fake), [50, 0]);
    assert.deepEqual(JSON.parse(fake.readFile(PENDING_FILE)), { configId: CONFIG_ID, title: "Medieval Madness", original: 81, quiet: 0 });

    fake.advanceTime(HANDOVER_OVER_MS);
    assert.deepEqual(volumesWritten(fake), [50, 0], "the hand-over was cancelled by the hold");
    wheel.release("Crow", { atOnce: true });
    assert.deepEqual(volumesWritten(fake), [50, 0, 81]);
    assertNoErrorLogged(fake);
});

test("a silencing hold reaches a table that the default ceiling had left alone", () => {
    const { fake, wheel } = startWheel(40);
    wheel.hold("Welcome Screen");
    assert.deepEqual(volumesWritten(fake), []);
    wheel.hold("Crow", { ceiling: 0 });
    assert.deepEqual(volumesWritten(fake), [0]);

    wheel.release("Welcome Screen", { atOnce: true });
    assert.deepEqual(volumesWritten(fake), [0], "another hold still silences it");
    wheel.release("Crow", { atOnce: true });
    assert.deepEqual(volumesWritten(fake), [0, 40]);
    assert.equal(fake.readFile(PENDING_FILE), undefined);
    assertNoErrorLogged(fake);
});

test("a looser hold never raises a table already lowered further", () => {
    const { fake, wheel } = startWheel(81);
    wheel.hold("Crow", { ceiling: 0 });
    wheel.hold("Welcome Screen");
    assert.deepEqual(volumesWritten(fake), [0]);
    assertNoErrorLogged(fake);
});
