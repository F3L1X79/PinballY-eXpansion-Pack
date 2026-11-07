// ============================================================
// The main menu in French, through main.js on the fake PinballY globals:
// "Mon profil", "Mes succès", PinballY's High Scores as "Scores de la table"
// (still "Meilleurs scores" in the pause menu), Rate Table with the Rating's
// decimal comma ("Noter la table (actuel : 4,5 / 5)"), Favorites as "Tables
// favorites", the screens keeping their own titles, "Tables à découvrir".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "achievements", "tablesToDiscover"];
// Any command id: only the title is translated.
const FAVORITES_FILTER_CMD = 7000;
// Rated in half stars, so Rate Table shows the French decimal comma.
const TABLES = [{ id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", rating: 4.5 }];

test("the main menu names My Profile, My Achievements, the Table Scores, the current Rating and the Favorite Tables in French, the pause menu keeping Meilleurs scores", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 30, 20, 0, 0), tables: TABLES });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "fr";

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();

    fake.openMenu("main", [
        { title: "Play", cmd: globalThis.command.PlayGame },
        { title: "High Scores", cmd: globalThis.command.HighScores },
        { title: "Rate Table", cmd: globalThis.command.RateGame },
        { cmd: -1 },
        { title: "Favorites", cmd: FAVORITES_FILTER_CMD },
    ]);
    const titles = fake.currentMenu().items.map(item => item.title);
    fake.closeMenu();

    for (const label of ["Mon profil", "Mes succès", "Scores de la table", "Noter la table (actuel : 4,5 / 5)", "Tables favorites"]) {
        assert.ok(titles.includes(label), `${label} in ${titles.join(" | ")}`);
    }
    assert.equal(titles.includes("Meilleurs scores"), false, titles.join(" | "));
    assert.equal(lang.achievementList.title, "Succès personnels");
    assert.equal(lang.profileStats.buttons.mostPlayedTables, "Tables les plus jouées");
    const tablesToDiscover = fake.scriptFilters().find(filter => filter.id === "project.TablesToDiscover");
    assert.equal(tablesToDiscover.title, "Tables à découvrir");

    fake.openMenu("pause game", [{ title: "High Scores", cmd: globalThis.command.HighScores }]);
    assert.deepEqual(fake.currentMenu().items.map(item => item.title), ["Meilleurs scores"]);
    fake.closeMenu();
    assertNoErrorLogged(fake);
});
