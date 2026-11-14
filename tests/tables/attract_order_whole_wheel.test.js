// ============================================================
// The Attract Order Whole Wheel through main.js, PinballY's option holding
// the long value and its own interval kept in cabinet.json: in attract mode
// every table of the wheel is shown once, in a shuffled order, before any
// comes back, never the table already on screen, each switch one fast
// animated jump; a new attract mode starts a new shuffle.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const CABINET_FILE = `${PACK}\\profiles\\cabinet.json`;
const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;
const table = title => ({ id: title, configId: title, title });
const TITLES = ["Attack from Mars", "Black Knight", "Cirqus Voltaire", "Dracula", "Elvira"];
const TABLES = TITLES.map(table);

const fake = createFakePinballYHost({ now: new Date(2026, 10, 14, 20, 0, 0), tables: TABLES });
const currentTitle = () => fake.getCurrentTable().title;

// A seeded draw, so that the shuffle is not the wheel's own order.
let seed = 12345;
fake.random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
};

// The titles the next switches show, one per kept interval.
function nextShown(count) {
    const shown = [];
    for (let i = 0; i < count; i++) {
        fake.advanceTime(STEP_MS);
        shown.push(currentTitle());
    }
    return shown;
}

const sorted = titles => [...titles].sort();
const others = title => TITLES.filter(other => other !== title);

test("setup", async () => {
    fake.seedSettings({ [SWITCH_TIME_KEY]: 86400 });
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: KEPT_SECONDS }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "wheelOrder";
    config.language = "en";
    config.attractOrder = "wholeWheel";
    // The seeded draw below must never make an Easter Egg win.
    const { setEasterEggDraw } = await import("../../common/easter_eggs/easter_egg_rules.js");
    setEasterEggDraw(() => 0.99);
    await import("../../main.js");
    await settle();
});

test("the first switches show every other table once, never the one on screen", async () => {
    fake.enterAttractMode();
    await settle();
    fake.advanceTime(STEP_MS - 1);
    assert.equal(currentTitle(), "Attack from Mars", "not before the interval");
    fake.advanceTime(1);
    const shown = [currentTitle(), ...nextShown(TITLES.length - 2)];

    assert.deepEqual(sorted(shown), sorted(others("Attack from Mars")));
    assert.notDeepEqual(shown, others("Attack from Mars"), "shuffled, not the wheel's order");
});

test("each switch is one fast animated jump", () => {
    const moves = fake.wheelMoves();

    assert.equal(moves.length, TITLES.length - 1);
    assert.ok(moves.every(move => move.animate && move.fast));
});

test("once the shuffle is used up, every table comes back once, never first the one on screen", () => {
    for (let round = 0; round < 4; round++) {
        const onScreen = currentTitle();
        const shown = nextShown(TITLES.length);

        assert.notEqual(shown[0], onScreen, `round ${round}`);
        assert.deepEqual(sorted(shown), sorted(TITLES), `round ${round}`);
        assert.ok(shown.every((title, i) => i === 0 || title !== shown[i - 1]), `round ${round}: every switch shows a change`);
    }
});

test("a new attract mode starts a new shuffle from the table on screen", async () => {
    nextShown(2);
    fake.exitAttractMode();
    const onScreen = currentTitle();

    fake.enterAttractMode();
    await settle();
    const shown = nextShown(TITLES.length - 1);

    assert.deepEqual(sorted(shown), sorted(others(onScreen)));
    fake.exitAttractMode();
    assertNoErrorLogged(fake);
});
