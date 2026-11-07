// ============================================================
// The main menu's Rate Table after Change Player, through main.js on the fake
// PinballY globals with Profile Ratings on: the next opening names the new
// active Profile's Rating, or the plain title when that Profile has none.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MARS = "Attack from Mars (Bally 1995)";
// Alice's Ratings on the columns.
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 5, isFavorite: false },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: 3, isFavorite: false },
];

test("after Change Player, Rate Table names the new active Profile's Rating", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\ratings.json`, JSON.stringify({ version: 1, ratings: { [MEDIEVAL]: 5, [MARS]: 3 }, favorites: [] }));
    fake.addFile(`${PROFILES}\\Bob\\ratings.json`, JSON.stringify({ version: 1, ratings: { [MEDIEVAL]: 1.5 }, favorites: [] }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["uiTranslation", "customMenuCommands", "profilePicker", "profileRatings"].includes(key);
    config.startupScreen = "wheel";
    config.language = "en";

    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();

    function rateTableTitleOn(configId) {
        fake.setWheelTables([configId]);
        fake.openMainMenu();
        const item = fake.currentMenu().items.find(menuItem => menuItem.cmd === globalThis.command.RateGame);
        fake.closeMenu();
        return item.title;
    }

    assert.equal(rateTableTitleOn(MEDIEVAL), "Rate Table (current: 5 / 5)");
    getProfileStore().switchTo("Bob");
    await settle();
    assert.equal(rateTableTitleOn(MEDIEVAL), "Rate Table (current: 1.5 / 5)");
    assert.equal(rateTableTitleOn(MARS), "Rate Table", "Bob has not rated Attack from Mars");
    assertNoErrorLogged(fake);
});
