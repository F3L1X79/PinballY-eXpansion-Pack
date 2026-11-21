// ============================================================
// The Welcome Screen's Button Hints, through main.js on the fake PinballY
// globals: the footer names the flippers (Browse), Select (Choose) and
// Exit (Close, since Exit leaves the bare wheel), while the cross, its
// Close tooltip and the flippers' loop stay as they were.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";
import { expectedButtonHints } from "../support/button_hints_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Welcome Screen's footer says Browse, Choose and Close", async () => {
    config.language = "en";
    const { startWelcomeScreen } = await import("./button_hints_scenario.js");
    const { buttonHints, readChoices } = await import("./welcome_screen_reader.js");
    const { fake, lang } = await startWelcomeScreen();
    const TEXT = lang.welcomeScreen;

    assert.deepEqual(buttonHints(fake), expectedButtonHints(lang, { exit: "close" }));
    assert.deepEqual(buttonHints(fake), [
        { keys: ["L. FLIPPER", "R. FLIPPER"], label: "BROWSE" },
        { keys: ["LAUNCHER"], label: "CHOOSE" },
        { keys: ["EXIT"], label: "CLOSE" },
    ]);
    assert.deepEqual(readChoices(fake), [
        lang.profiles.menuEntry, "Close", TEXT.periodCards.day.period, TEXT.periodCards.week.period, TEXT.randomTable, TEXT.stayOn("Medieval Madness"),
    ]);
    assertNoErrorLogged(fake);
});
