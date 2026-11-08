// ============================================================
// The Drawn main menu with the Profile picker and the Welcome Screen on,
// for an Admin Profile, through main.js on the fake PinballY globals: Play,
// Set Up Table, Change Player and Back to the Welcome Screen open it, then "My Profile",
// "My Achievements", and PinballY's High Scores as "Table Scores".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { drawnMenuLines, openMainMenu } from "./drawn_menu_reader.js";
import { sectionHolding } from "../support/main_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "profilePicker", "achievements", "startupChoicePrompt", "drawnMenus"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

test("an Admin Profile's Drawn main menu opens on its starting points, then its renamed entries", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 19, 20, 0, 0) });
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Bob");

    openMainMenu(fake);
    const lines = drawnMenuLines(fake);

    assert.deepEqual(lines.slice(0, lines.indexOf("---")), ["Play", "Set Up Table", "Change Player", "Back to the Welcome Screen"]);
    assert.deepEqual(sectionHolding(lines, "My Profile"), ["My Profile", "My Achievements"]);
    assert.ok(lines.includes("Table Scores"), lines.join(" | "));
    assert.equal(lines.includes("High Scores"), false, lines.join(" | "));
    assertNoErrorLogged(fake);
});
