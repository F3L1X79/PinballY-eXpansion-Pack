// ============================================================
// The main menu without the Profile picker, the Achievements and the High
// Scores Add-ons: no Change Player, the pack's screens' section empty and gone
// with its separator, and PinballY's own High Scores after the Instruction Card.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands"];
const SEPARATOR = "---";

test("without the player's Add-ons, the main menu leaves out their entries and their section", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 30, 20, 0, 0) });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();

    fake.openMainMenu();
    const titles = fake.currentMenu().items.map(item => (item.cmd === -1 && !item.title ? SEPARATOR : item.title));
    fake.closeMenu();
    assert.deepEqual(titles, [
        "Play", SEPARATOR,
        "Add to Favorites", "Rate Table", "Information", "Flyer", "Instruction Card", "Table Scores",
        lang.customMenuLabels.tableSetup, SEPARATOR,
        lang.customMenuLabels.activeFilter("All Tables"), SEPARATOR,
        "Return",
    ]);
    assertNoErrorLogged(fake);
});
