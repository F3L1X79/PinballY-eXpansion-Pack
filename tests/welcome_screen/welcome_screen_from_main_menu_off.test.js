// ============================================================
// Welcome Screen Add-on off: the main menu has no entry for the screen.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { installVpxtool } from "../support/vpxtool.js";

test("with the Welcome Screen Add-on off, the main menu has no Welcome Screen entry", async () => {
    const fake = createFakePinballYHost();
    installVpxtool(fake);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    config.addOns.startupChoicePrompt = false;
    // The main menu read as a native one.
    config.addOns.drawnMenus = false;
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();

    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    const titles = fake.currentMenu().items.map(item => item.title);
    assert.ok(titles.includes(lang.profiles.menuEntry), "the main menu shows the pack's entries");
    assert.ok(!titles.includes(lang.welcomeScreen.menuEntry));
    assertNoErrorLogged(fake);
});
