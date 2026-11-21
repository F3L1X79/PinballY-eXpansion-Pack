// ============================================================
// The main menu with no selected-table entry shown, through main.js on the
// fake PinballY globals: Menu Cleanup on, no High Score Board, a non-Admin
// Profile once the household has an Admin, and PinballY offering neither
// Rate Table nor Add to Favorites (an empty wheel selection): the selected
// table's section is gone, "Return" alone after what to change.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { mainMenuSection, mainMenuHasStraySeparator } from "../support/main_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "menuCleanup", "profilePicker"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

test("with no selected-table entry shown, the selected table's section is gone with its separator", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 30, 20, 0, 0) });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFile(`${PROFILES}\\Bob\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");
    const LABELS = lang.customMenuLabels;
    const { PlayGame, GameInfo, Flyer, HighScores, Instructions, FilterFirst, FilterByEra, MenuReturn } = globalThis.command;

    const openMainMenu = () => fake.openMenu("main", [
        { title: "Play", cmd: PlayGame },
        { title: "", cmd: -1 },
        { title: "Information", cmd: GameInfo },
        { title: "Flyer", cmd: Flyer },
        { title: "High Scores", cmd: HighScores },
        { title: "Instruction Card", cmd: Instructions },
        { title: "", cmd: -1 },
        { title: "", cmd: -1 },
        { title: "All Tables", cmd: FilterFirst },
        { title: "", cmd: -1 },
        { title: "Filter by Era", cmd: FilterByEra, hasSubmenu: true },
        { title: "", cmd: -1 },
        { title: "Return", cmd: MenuReturn },
    ]);
    const section = entry => mainMenuSection(fake, entry, openMainMenu);

    for (const entry of ["Information", "Flyer", "Table Scores", "Instruction Card", LABELS.tableSetup]) {
        assert.equal(section(entry), null, entry);
    }
    assert.deepEqual(section("Play"), ["Play"]);
    assert.deepEqual(section(lang.profiles.menuEntry), [lang.profiles.menuEntry, LABELS.activeFilter("All Tables")]);
    assert.deepEqual(section("Return"), ["Return"]);
    assert.equal(mainMenuHasStraySeparator(fake, openMainMenu), false);
    assertNoErrorLogged(fake);
});
