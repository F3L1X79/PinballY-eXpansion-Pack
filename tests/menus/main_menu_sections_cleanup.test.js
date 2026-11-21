// ============================================================
// The main menu's sections in French with Menu Cleanup on, for a non-Admin
// Profile: information entries and Table Setup gone, selections and groups
// behind "Filtre actif : Toutes les tables" at the end of what to change,
// "Retour" alone, no doubled separator.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { mainMenuSection, mainMenuHasStraySeparator } from "../support/main_menu_reader.js";

const ADD_ONS_UNDER_TEST = [
    "uiTranslation", "customMenuCommands", "menuCleanup", "profilePicker", "achievements", "highScores",
    "hallOfFame", "tablesToDiscover", "challenges",
];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

test("a non-Admin Profile's cleaned main menu runs in its sections, in French", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 30, 20, 0, 0) });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "fr";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");
    const LABELS = lang.customMenuLabels;

    const section = entry => mainMenuSection(fake, entry);

    assert.deepEqual(section("Jouer"), ["Jouer"]);
    assert.deepEqual(section("Noter la table"), ["Ajouter aux favoris", "Noter la table"]);
    assert.deepEqual(section("Mes succès"), ["Mon profil", "Mes succès", lang.highScores.board.menuEntry]);
    const filterPicker = "Filtre actif : Toutes les tables";
    assert.deepEqual(section(lang.profiles.menuEntry), [lang.profiles.menuEntry, filterPicker]);
    assert.deepEqual(section("Retour"), ["Retour"]);
    assert.equal(section(LABELS.tableSetup), null, "no Table Setup for a non-Admin Profile");

    fake.openMainMenu();
    const groups = fake.currentMenu().items.filter(item => item.hasSubmenu).map(item => item.title);
    fake.closeMenu();
    assert.deepEqual(groups, [filterPicker], "the filter groups are behind it");
    assert.equal(mainMenuHasStraySeparator(fake), false);
    assertNoErrorLogged(fake);
});
