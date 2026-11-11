// ============================================================
// A Rocket Game that cannot play or fails, through main.js: a missing image
// is logged and nothing opens, the main menu comes back on the entry; a
// failing frame is logged once, the layers go, and the main menu comes back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { errorLines } from "../support/error_log.js";
import { whileDrawsFail, FAILING_DRAW_MESSAGE } from "../support/failing_draws.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { ROCKET_IMAGES, SHIP_IMAGE } from "../easter_eggs/rocket_scenario.js";
import {
    startRocketGame, chooseRocketGame, gameLayerCount, scoreScreenLayerCount, reopenedMainMenuSelection, INTRO_MS, LEAVING_MS,
} from "./rocket_game_scenario.js";

test("a missing image opens nothing, and a failing frame gives the main menu back, logged once", async () => {
    const { fake, lang } = await startRocketGame({ files: ROCKET_IMAGES.filter(path => path !== SHIP_IMAGE) });
    const entry = lang.rocketGame.menuEntry;

    // Listed whatever the images: they are checked once chosen.
    await chooseRocketGame(fake, lang);
    assert.equal(gameLayerCount(fake), 0, "nothing opens");
    assert.ok(fake.logLines().some(line => line.startsWith("[Rocket]") && line.includes(SHIP_IMAGE)), "the missing image is logged");
    assert.equal(fake.executedCommands().at(-1), globalThis.command.ShowMainMenu);
    assert.deepEqual(reopenedMainMenuSelection(fake), [entry]);
    assert.deepEqual(errorLines(fake), []);

    fake.addFile(SHIP_IMAGE);
    const commandsBefore = fake.executedCommands().length;
    await chooseRocketGame(fake, lang);
    fake.advanceTime(INTRO_MS);
    // The score is drawn again when the first row passes the ship.
    whileDrawsFail(() => fake.advanceTime(5000));
    fake.advanceTime(LEAVING_MS);
    await settle();
    assert.equal(gameLayerCount(fake), 0, "every layer removed");
    assert.equal(scoreScreenLayerCount(fake), 0);
    assert.notEqual(press(fake, "Next").defaultPrevented, true, "the buttons are free again");
    assert.deepEqual(fake.executedCommands().slice(commandsBefore), [globalThis.command.ShowMainMenu], "the main menu back");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1, "logged once");
    assert.ok(errors[0].includes(FAILING_DRAW_MESSAGE));
});
