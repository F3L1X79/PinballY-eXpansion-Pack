// ============================================================
// Admin Profile menus through main.js: with no isAdmin mark, everyone sees
// "Table Setup" and "Operator Menu", and "Manage profiles" in the Operator
// Menu to become the first admin; once one is marked, only Admins do.
// - A mark on Guest or a non-boolean mark is logged and ignored.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { mainMenuSection } from "../support/main_menu_reader.js";

const NOW = new Date(2026, 8, 30, 20, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const markFile = (fake, name, isAdmin) => fake.addFile(profileFile(name), JSON.stringify({ version: 1, isAdmin }));

// PinballY's own separators are titled "".
const ADMIN_EXIT_MENU = ["Exit PinballY", "Shut Down", undefined, "Manage profiles", "", "Operator Menu", "", "Help", "About PinballY", "", "Cancel"];
const EXIT_MENU_WITHOUT_OPERATOR_MENU = ["Exit PinballY", "Shut Down", "", "Help", "About PinballY", "", "Cancel"];

test("only the Admin Profiles keep the setup entries, once the household has one", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFolder(`${PROFILES}\\Bob`);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "customMenuCommands";
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const LABELS = lang.customMenuLabels;
    const TABLE_SETUP = LABELS.tableSetup;
    await import("../../main.js");
    const store = getProfileStore();

    const openMainMenu = () => fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
    const mainMenuTitles = () => {
        openMainMenu();
        const titles = fake.currentMenu().items.map(item => item.title);
        fake.closeMenu();
        return titles;
    };
    const exitMenuTitles = () => {
        fake.openExitMenu();
        const titles = fake.currentMenu().items.map(item => item.title);
        fake.closeMenu();
        return titles;
    };
    // As the coin door's service button opens it, for anyone.
    const seesManageProfiles = () => {
        fake.openOperatorMenu();
        const shown = fake.currentMenu().items.some(item => item.title === lang.profileReset.menuEntry);
        fake.closeMenu();
        return shown;
    };

    store.switchTo("Alice");
    assert.ok(mainMenuTitles().includes(TABLE_SETUP), "no Admin Profile: everything shows");
    assert.deepEqual(exitMenuTitles(), ADMIN_EXIT_MENU);
    assert.ok(seesManageProfiles(), "and Manage profiles, to become the first admin");

    markFile(fake, "guest", true);
    markFile(fake, "Bob", "true");
    assert.ok(mainMenuTitles().includes(TABLE_SETUP), "a mark on Guest or not a boolean counts for nothing");
    assert.deepEqual(exitMenuTitles(), ADMIN_EXIT_MENU);
    assert.ok(fake.logLines().some(line => line.includes("Bob\\profile.json") && line.includes("isAdmin")));

    markFile(fake, "Bob", true);
    assert.equal(mainMenuSection(fake, TABLE_SETUP, openMainMenu), null, "a non-admin loses Table Setup");
    assert.deepEqual(mainMenuSection(fake, "Play", openMainMenu), ["Play"], "Play stays");
    assert.deepEqual(exitMenuTitles(), EXIT_MENU_WITHOUT_OPERATOR_MENU, "and the Operator Menu, nothing else");
    assert.ok(!seesManageProfiles(), "nor Manage profiles, even from the service button");

    store.switchTo("Bob");
    assert.ok(mainMenuTitles().includes(TABLE_SETUP), "an Admin Profile keeps both");
    assert.deepEqual(exitMenuTitles(), ADMIN_EXIT_MENU);
    assert.ok(seesManageProfiles(), "and gets Manage profiles");

    store.switchTo("guest");
    assert.ok(!mainMenuTitles().includes(TABLE_SETUP), "Guest is never an Admin Profile");
    assert.deepEqual(exitMenuTitles(), EXIT_MENU_WITHOUT_OPERATOR_MENU);
    assert.ok(!seesManageProfiles());
    assert.ok(fake.logLines().some(line => line.includes("guest\\profile.json") && line.includes("isAdmin")));

    assertNoErrorLogged(fake);
});
