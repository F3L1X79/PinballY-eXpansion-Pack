// ============================================================
// A Random Game animated on a wheel ordered by year, through main.js: the
// table the wheel stops on is the table launched, even when the animation
// jumps with Next Page, which pages by decade there, not by first letter.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { getRandomGame } from "../../common/tables/random_game.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const LAUNCH_COUNT = 30;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// Sixty tables whose first letters and decades do not go together.
const TABLES = Array.from({ length: 60 }, (_, i) => {
    const title = `${LETTERS[(i * 7) % LETTERS.length]}able ${i}`;
    return { id: i + 1, configId: title, title, year: 1960 + ((i * 13) % 60) };
});
const ADD_ONS_UNDER_TEST = ["customMenuCommands", "wheelOrder", "randomGame"];

const fake = createFakePinballYHost({ now: new Date(2026, 10, 20, 20, 0, 0), tables: TABLES });
let lang;

// A seeded draw, so every run animates the same Random Games.
let seed = 42;
Math.random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
};

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    config.skipRandomGameAnimation = false;
    ({ default: lang } = await import("../../common/core/i18n.js"));
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    fake.openMainMenu();
    fake.selectMenuItem(fake.currentMenu().items.find(item => item.cmd === fake.commandId("filterPicker")).title);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderAlphabetical);
    fake.selectMenuItem(lang.customMenuLabels.wheelOrderPageByYear);
    await settle();
});

test("by year, each Random Game launches the table the wheel stopped on", async () => {
    const mismatches = [];
    for (let i = 0; i < LAUNCH_COUNT; i++) {
        const launchesBefore = fake.launches().length;
        getRandomGame().launch();
        await settle();
        for (let step = 0; step < 1000 && fake.launches().length === launchesBefore; step++) {
            fake.advanceTime(100);
            await settle();
        }
        const launched = fake.launches().at(-1);
        assert.equal(fake.launches().length, launchesBefore + 1, `launch ${i}`);
        const shown = fake.getCurrentTable();
        if (shown.configId !== launched.configId) mismatches.push(`shown "${shown.title}", launched "${launched.title}"`);
        fake.gameStarted(launched);
        fake.advanceTime(60 * 1000);
        fake.gameOver(launched);
        await settle();
    }

    assert.deepEqual(mismatches, []);
    assertNoErrorLogged(fake);
});
