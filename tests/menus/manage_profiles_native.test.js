// ============================================================
// Manage profiles with the Drawn Menus Add-on off, through main.js on the
// fake PinballY globals: PinballY's own menus show the list and a
// Profile's menu; the Child line flips the mark and shows the menu again on
// it; a greyed line (Admin or Child) reads "<label> (<reason>)" and choosing
// it changes nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

test("the same menus show natively, the greyed line in brackets", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1 }));
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
    const selectedTitles = () => fake.currentMenu().items.filter(item => item.selected).map(item => item.title);
    const openProfileMenu = name => {
        fake.openOperatorMenu();
        fake.selectMenuItem(TEXT.menuEntry);
        fake.selectMenuItem(name);
    };

    openProfileMenu("Bob");
    assert.deepEqual(shownTitles(), ["Bob", "", TEXT.adminLine(false), TEXT.childLine(false), "", TEXT.reset, TEXT.back]);
    fake.selectMenuItem(TEXT.childLine(false));
    assert.equal(JSON.parse(fake.readFile(profileFile("Bob"))).isChild, true);
    const childFirst = lang.drawnMenu.disabledLine(TEXT.adminLine(false), TEXT.refusals.removeChildMarkFirst);
    assert.deepEqual(shownTitles(), ["Bob", "", childFirst, TEXT.childLine(true), "", TEXT.reset, TEXT.back], "shown again with the new value");
    assert.deepEqual(selectedTitles(), [TEXT.childLine(true)], "the cursor on that line");
    fake.selectMenuItem(TEXT.back);
    assert.equal(fake.currentMenu(), null, "natively, Back only closes");

    openProfileMenu("Alice");
    const lastAdmin = lang.drawnMenu.disabledLine(TEXT.adminLine(true), TEXT.refusals.lastAdmin);
    const greyed = lang.drawnMenu.disabledLine(TEXT.childLine(false), TEXT.refusals.removeAdminMarkFirst);
    assert.deepEqual(shownTitles(), ["Alice", "", lastAdmin, greyed, "", TEXT.reset, TEXT.back]);
    const aliceBefore = fake.readFile(profileFile("Alice"));
    fake.selectMenuItem(lastAdmin);
    fake.selectMenuItem(greyed);
    assert.deepEqual(shownTitles(), ["Alice", "", lastAdmin, greyed, "", TEXT.reset, TEXT.back], "the same menu again");
    assert.equal(fake.readFile(profileFile("Alice")), aliceBefore, "nothing changes");
    fake.selectMenuItem(TEXT.back);
    assert.equal(fake.currentMenu(), null);
    assertNoErrorLogged(fake);
});
