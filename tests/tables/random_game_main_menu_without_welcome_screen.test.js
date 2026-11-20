// ============================================================
// Welcome Screen Add-on off: the main menu still offers "Launch a random
// table", right under Play, and it launches the wheel's table.
// - Runs with the animation off: the launch comes at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { mainMenuSection } from "../support/main_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { installVpxtool } from "../support/vpxtool.js";

const TABLES = [{ id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness" }];

test("with the Welcome Screen Add-on off, the main menu still launches a random table", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.setWheelTables(TABLES.map(table => table.configId));
    installVpxtool(fake);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    config.addOns.startupChoicePrompt = false;
    // The main menu read as a native one.
    config.addOns.drawnMenus = false;
    config.language = "en";
    config.skipRandomGameAnimation = true;

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();

    const randomTable = lang.customMenuLabels.randomTable;
    assert.deepEqual(mainMenuSection(fake, randomTable).slice(0, 2), ["Play", randomTable]);
    fake.openMainMenu();
    fake.selectMenuItem(randomTable);
    await settle();
    assert.deepEqual(fake.launches().map(game => game.configId), ["Medieval Madness (Williams 1997)"]);
    assertNoErrorLogged(fake);
});
