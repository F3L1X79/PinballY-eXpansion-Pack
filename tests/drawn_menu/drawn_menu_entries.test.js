// ============================================================
// The main menu as a Drawn Menu shows the final entries, through main.js
// on the fake PinballY globals, in French with Menu Cleanup on: the pack's
// entries in their places, PinballY's own translated, those Menu Cleanup
// removes left out, Table Setup hidden from a non-admin Profile. A screen
// opened from it goes back to it with the cursor on its entry.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, drawnMenuLines, highlightedEntry, openMainMenu, chooseEntry } from "./drawn_menu_reader.js";
import { sectionHolding } from "../support/main_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "achievements", "menuCleanup", "drawnMenus"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

const fake = createFakePinballYHost({ now: new Date(2026, 9, 10, 20, 0, 0) });
let lang;
// Imported once the language is set: the Achievement List reads its texts on import.
let listReader;

test("setup", async () => {
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "fr";
    ({ default: lang } = await import("../../common/core/i18n.js"));
    listReader = await import("../achievements/achievement_list_reader.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");
});

test("a non-admin Profile's main menu shows the final entries, translated and cleaned up", () => {
    openMainMenu(fake);

    assert.equal(fake.currentMenu(), null);
    const section = entry => sectionHolding(drawnMenuLines(fake), entry);
    assert.deepEqual(section("Jouer"), ["Jouer"]);
    assert.deepEqual(section("Noter la table"), ["Ajouter aux favoris", "Noter la table"]);
    assert.deepEqual(section("Mes succès"), ["Mon profil", "Mes succès"]);
    assert.deepEqual(section("Changer de filtre"), ["Changer de filtre"]);
    assert.deepEqual(section("Retour"), ["Retour"]);
    assert.deepEqual(drawnMenuLines(fake), [
        "Jouer", "---", "Ajouter aux favoris", "Noter la table", "---",
        "Mon profil", "Mes succès", "---", "Changer de filtre", "---", "Retour",
    ], "the same order as the native main menu");
    assert.equal(section(lang.customMenuLabels.tableSetup), null, "no Table Setup for a non-admin Profile");
});

test("back from the Achievement List, the menu opens again on its entry", () => {
    chooseEntry(fake, lang.achievementList.menuEntry);
    assert.ok(listReader.isListOpen(fake));
    assert.ok(!isDrawnMenuShown(fake));

    listReader.press(fake, "Exit");
    assert.equal(fake.executedCommands().at(-1), globalThis.command.ShowMainMenu);
    // PinballY opens the main menu on ShowMainMenu.
    openMainMenu(fake);

    assert.equal(highlightedEntry(fake), lang.achievementList.menuEntry);
});
