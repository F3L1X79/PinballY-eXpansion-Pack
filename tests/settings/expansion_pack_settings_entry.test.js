// ============================================================
// The eXpansion Pack Settings entry through main.js, with every Add-on off:
// right after PinballY's Options in the Operator Menu for everyone while no
// Profile is marked Admin, then for the Admin Profiles only, even when the
// coin door's service button opens the menu.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const markAdmin = (fake, name) => fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));

const ENTRY = "eXpansion Pack Settings";

test("the entry follows PinballY Options for whoever sees the setup entries", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFolder(`${PROFILES}\\Bob`);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = false;
    config.language = "en";
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    const store = getProfileStore();

    // As the coin door's service button opens it, with no Exit menu before.
    const operatorMenuTitles = () => {
        fake.openOperatorMenu();
        const titles = fake.currentMenu().items.map(item => item.title);
        fake.closeMenu();
        return titles;
    };
    const entryFollowsOptions = () => {
        const titles = operatorMenuTitles();
        return titles[titles.indexOf("PinballY Options") + 1] === ENTRY;
    };

    assert.ok(entryFollowsOptions(), "Guest, with no Admin Profile");
    store.switchTo("Alice");
    assert.ok(entryFollowsOptions(), "Alice, with no Admin Profile");

    markAdmin(fake, "Bob");
    assert.ok(!operatorMenuTitles().includes(ENTRY), "Alice, once Bob is an Admin Profile");
    store.switchTo("guest");
    assert.ok(!operatorMenuTitles().includes(ENTRY), "Guest, once Bob is an Admin Profile");
    store.switchTo("Bob");
    assert.ok(entryFollowsOptions(), "Bob, an Admin Profile");

    assertNoErrorLogged(fake);
});
