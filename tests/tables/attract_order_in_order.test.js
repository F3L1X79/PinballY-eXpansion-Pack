// ============================================================
// The Attract Order In Order through main.js, PinballY's option holding the
// long value and its own interval kept in cabinet.json: from attract mode's
// start to its end, the pack moves the wheel one animated step per interval,
// wrapping after the last table, and the Info Log answers the cabinet checks.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const CABINET_FILE = `${PACK}\\profiles\\cabinet.json`;
const INFO_LOG = `${PACK}\\logs\\info.log`;
const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;
const table = title => ({ id: title, configId: title, title });
const TABLES = ["Attack from Mars", "Black Knight", "Cirqus Voltaire", "Dracula"].map(table);

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
const currentTitle = () => fake.getCurrentTable().title;

test("setup", async () => {
    fake.seedSettings({ [SWITCH_TIME_KEY]: 86400 });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: KEPT_SECONDS }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "wheelOrder";
    config.language = "en";
    config.attractOrder = "inOrder";
    await import("../../main.js");
    await settle();
});

test("the wheel stays put outside attract mode", () => {
    fake.advanceTime(3 * STEP_MS);

    assert.equal(currentTitle(), "Attack from Mars");
    assert.deepEqual(fake.wheelMoves(), []);
});

test("in attract mode, one animated step of the wheel per kept interval, not fast", async () => {
    fake.enterAttractMode();
    await settle();
    fake.advanceTime(STEP_MS - 1);
    assert.equal(currentTitle(), "Attack from Mars", "not before the interval");

    fake.advanceTime(1);
    assert.equal(currentTitle(), "Black Knight");
    fake.advanceTime(STEP_MS);
    assert.equal(currentTitle(), "Cirqus Voltaire");
    assert.deepEqual(fake.wheelMoves(), [{ offset: 1, animate: true, fast: false }, { offset: 1, animate: true, fast: false }]);
});

test("after the last table, the first one comes back", () => {
    fake.advanceTime(2 * STEP_MS);

    assert.equal(currentTitle(), "Attack from Mars");
});

test("a gameselect the pack did not cause is logged once as PinballY still switching", async () => {
    fake.moveWheel(1);
    fake.moveWheel(1);
    await settle();

    const lines = fake.readFile(INFO_LOG).split("\n").filter(line => line.includes("PinballY still switches"));
    assert.equal(lines.length, 1);
});

test("attract mode's end stops the switches on the table on screen", () => {
    fake.exitAttractMode();
    const shown = currentTitle();
    const moves = fake.wheelMoves().length;

    fake.advanceTime(3 * STEP_MS);

    assert.equal(currentTitle(), shown);
    assert.equal(fake.wheelMoves().length, moves);
});

test("the Info Log names PinballY's option and the value read at startup", () => {
    assert.match(fake.readFile(INFO_LOG), /\[AttractOrder\] AttractMode\.SwitchTime read at startup: 86400, Attract Order inOrder\./);
    assert.deepEqual([...fake.writtenSettingsKeys()].filter(key => key === SWITCH_TIME_KEY), [], "nothing written at startup");
    assertNoErrorLogged(fake);
});
