// ============================================================
// The Wheel Position through main.js on Favorite Tables: when the selected
// table leaves the favourites from the main menu and PinballY drops it from
// the wheel as the menu closes, the count follows; the Info Log answers the
// cabinet check on whether PinballY refreshed Favorite Tables.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownPosition, INFO_LOG } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Wheel Position follows a table leaving Favorite Tables at menuclose", async () => {
    const { fake, chooseInFilterPicker } = await startWheelGuides();
    await chooseInFilterPicker("Favorites");
    fake.moveWheel(1);
    assert.equal(fake.getCurrentTable().title, "Cyclone");
    assert.equal(shownPosition(fake), "2/3");

    // Taken as PinballY refreshing Favorite Tables once the menu closes,
    // after the pack's own "menuclose" listeners.
    globalThis.mainWindow.on("menuclose", () => globalThis.gameList.setCurFilter("Favorites"));
    fake.openMainMenu();
    fake.getGameInfo("Cyclone").update({ isFavorite: false });
    fake.closeMenu();
    await settle();
    fake.advanceTime(300);
    await settle();

    assert.equal(fake.getCurrentTable().title, "Addams Family");
    assert.equal(shownPosition(fake), "1/2");
    assert.match(fake.readFile(INFO_LOG),
        /\[WheelGuides\] "Cyclone" taken out of Favorite Tables while shown there \(Favorites\): 3 tables at "menuopen", 3 at "menuclose", 2 300 ms later \(refreshed\)\./);
    assertNoErrorLogged(fake);
});
