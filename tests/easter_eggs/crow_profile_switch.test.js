// ============================================================
// The Crow after a Profile switch, through main.js: drawn once for the new
// Profile when the Welcome Screen that welcomes it closes, if it had no Crow
// draw today; switching back gives no extra draw.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, press, openFromMainMenu, pickProfileBeside } from "../welcome_screen/welcome_screen_reader.js";
import { startCrowScenario, birds, FLIGHT_MS, ALL_GONE_MS, TOAST_LIFE_MS } from "./crow_scenario.js";

test("after a Profile switch the Crow is drawn once for the new Profile, and not again when switching back", async () => {
    const crowDraws = [];
    const { fake, lang, store } = await startCrowScenario({ wins: "" });
    const { setEasterEggDraw } = await import("../../common/easter_eggs/easter_egg_rules.js");
    // Only Alice's draw of the Crow wins.
    setEasterEggDraw(name => {
        if (name !== "crow") return 0.99;
        crowDraws.push(store.getActiveProfile().name);
        return store.getActiveProfile().name === "Alice" ? 0 : 0.99;
    });
    async function switchBeside(direction) {
        await openFromMainMenu(fake, lang.profiles.menuEntry);
        await pickProfileBeside(fake, direction);
        press(fake, "Exit");
        await settle();
    }

    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    press(fake, "Exit");
    await settle();
    assert.deepEqual(crowDraws, ["Bob"], "drawn at startup");

    await switchBeside("Prev");
    assert.equal(store.getActiveProfile().name, "Alice");
    assert.deepEqual(crowDraws, ["Bob", "Alice"], "drawn once the switch is over");
    fake.advanceTime(FLIGHT_MS / 2);
    assert.equal(birds(fake).length, 1, "and it flies");
    fake.advanceTime(ALL_GONE_MS);
    await settle();
    fake.advanceTime(TOAST_LIFE_MS);
    await settle();

    await switchBeside("Next");
    assert.equal(store.getActiveProfile().name, "Bob");
    await switchBeside("Prev");
    assert.equal(store.getActiveProfile().name, "Alice");
    fake.advanceTime(TOAST_LIFE_MS);
    await settle();
    assert.deepEqual(crowDraws, ["Bob", "Alice"], "no extra draw from switching back and forth");
    assert.deepEqual(birds(fake), []);
    setEasterEggDraw(null);
    assertNoErrorLogged(fake);
});
