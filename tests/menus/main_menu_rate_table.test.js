// ============================================================
// The main menu's Rate Table, through main.js on the fake PinballY globals:
// it names the selected table's current Rating ("Rate Table (current: 4.5 / 5)"),
// a 0 included, read again at each opening; PinballY's -1 and an empty wheel
// keep the plain title. The entry keeps its place and its command.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MARS = "Attack from Mars (Bally 1995)";
const TWILIGHT = "Twilight Zone (Bally 1993)";
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 4.5 },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: -1 },
    { id: 3, configId: TWILIGHT, title: "Twilight Zone", rating: 0 },
];

test("Rate Table names the selected table's current Rating in the main menu", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["uiTranslation", "customMenuCommands"].includes(key);
    config.startupScreen = "wheel";
    config.language = "en";

    await import("../../main.js");
    await settle();

    // The Rate Table item of a main menu opening on this table.
    function rateTableItemOn(configId) {
        fake.setWheelTables(configId === null ? [] : [configId]);
        fake.openMainMenu();
        const items = fake.currentMenu().items;
        fake.closeMenu();
        const index = items.findIndex(item => item.cmd === globalThis.command.RateGame);
        assert.notEqual(index, -1, items.map(item => item.title).join(" | "));
        return { ...items[index], after: items[index + 1].title };
    }

    const rated = rateTableItemOn(MEDIEVAL);
    assert.equal(rated.title, "Rate Table (current: 4.5 / 5)");
    assert.equal(rated.after, "Add to Favorites", "the entry keeps its place");
    assert.equal(rateTableItemOn(TWILIGHT).title, "Rate Table (current: 0 / 5)");
    assert.equal(rateTableItemOn(MARS).title, "Rate Table");
    assert.equal(rateTableItemOn(null).title, "Rate Table");

    // PinballY's rating dialog saves the new Rating on the table.
    fake.getGameInfo(MARS).update({ rating: 3 });
    assert.equal(rateTableItemOn(MARS).title, "Rate Table (current: 3 / 5)");

    // Only the main menu: the entry still runs PinballY's own command.
    let ratingDialogOpened = false;
    fake.setNativeCommand(globalThis.command.RateGame, () => { ratingDialogOpened = true; });
    fake.setWheelTables([MEDIEVAL]);
    fake.openMainMenu();
    fake.selectMenuItem("Rate Table (current: 4.5 / 5)");
    assert.equal(ratingDialogOpened, true);
    assertNoErrorLogged(fake);
});
