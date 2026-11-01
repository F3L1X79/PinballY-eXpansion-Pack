// ============================================================
// Status Icons, through main.js, in a Household with an Admin Profile: no
// update icon while another Profile plays, and the icons follow Change
// Player both ways, with one fade each time, and without one when the switch
// happened during a game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { shownIcons, shownIconNames, UPDATE_CHECK_OFF } from "./status_icons_reader.js";

const ADMIN_PROFILE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\Alice\\profile.json";
const GAME = { id: 1, configId: "mm", title: "Medieval Madness" };
const FADE_OVER_MS = 300;

test("the update icons show only to a Profile that sees the setup entries, and follow Change Player", async () => {
    const { fake, store, settle } = await startOnProfilePicker({
        addOns: ["clock", "statusIcons"],
        activeProfile: "Bob",
        tables: [GAME],
        settings: { updateCheck: false },
        seed: f => f.addFile(ADMIN_PROFILE_FILE, JSON.stringify({ version: 1, plays: {}, notified: [], isAdmin: true })),
    });
    await settle();
    assert.deepEqual(shownIconNames(fake), [], "nothing for Bob");

    store.switchTo("Alice");
    fake.advanceTime(FADE_OVER_MS);
    assert.deepEqual(shownIconNames(fake), [UPDATE_CHECK_OFF], "shown once the Admin Profile takes over");

    store.switchTo("Bob");
    fake.advanceTime(FADE_OVER_MS);
    assert.deepEqual(shownIconNames(fake), [], "gone when Bob is back");

    // A switch while hidden shows on the next return to the wheel, at once.
    fake.gameStarted(GAME);
    store.switchTo("Alice");
    fake.gameOver(GAME);
    assert.deepEqual(shownIcons(fake).map(({ icon, alpha }) => ({ icon, alpha })), [{ icon: UPDATE_CHECK_OFF, alpha: 0xFF }],
        "no fade on the way back to the wheel");
    assertNoErrorLogged(fake);
});
