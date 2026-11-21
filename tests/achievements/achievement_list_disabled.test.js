// ============================================================
// With the achievements Add-on disabled, main.js adds neither the
// Achievement List entry nor the Profile Stats entry: the other custom
// entries follow "Play" in their section.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { mainMenuSection } from "../support/main_menu_reader.js";

test("no Achievement List or Profile Stats entry when the achievements Add-on is disabled", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0) });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "customMenuCommands";
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const MENU_LABELS = lang.customMenuLabels;
    await import("../../main.js");

    const openMainMenu = () => fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
    assert.equal(mainMenuSection(fake, lang.achievementList.menuEntry, openMainMenu), null);
    assert.equal(mainMenuSection(fake, lang.profileStats.menuEntry, openMainMenu), null);
    assert.deepEqual(mainMenuSection(fake, "Play", openMainMenu), ["Play"]);
    assert.deepEqual(mainMenuSection(fake, MENU_LABELS.tableSetup, openMainMenu), [MENU_LABELS.tableSetup]);
    assertNoErrorLogged(fake);
});
