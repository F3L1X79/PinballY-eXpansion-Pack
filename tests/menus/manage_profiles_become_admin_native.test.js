// ============================================================
// The first Admin Profile with the Drawn Menus Add-on off, through main.js
// on the fake PinballY globals: PinballY's own menus show "Become admin",
// which marks the active Profile and opens the full list.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

test("Become admin works natively too", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 30, 20, 0, 0) });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "customMenuCommands";
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");
    const shownTitles = () => fake.currentMenu().items.map(item => item.title ?? "");

    fake.openOperatorMenu();
    fake.selectMenuItem(TEXT.menuEntry);
    assert.deepEqual(shownTitles(), [TEXT.becomeAdmin, "", TEXT.cancel]);
    fake.selectMenuItem(TEXT.becomeAdmin);
    assert.equal(JSON.parse(fake.readFile(profileFile("Alice"))).isAdmin, true);
    assert.deepEqual(shownTitles(), [TEXT.listTitle, "", lang.profiles.guestName, "Alice", "", TEXT.everyProfile, "", TEXT.cancel], "the full list opens");
    fake.selectMenuItem(TEXT.cancel);
    assert.equal(fake.currentMenu(), null);
    assertNoErrorLogged(fake);
});
