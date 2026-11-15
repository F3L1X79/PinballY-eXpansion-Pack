// ============================================================
// The Favorite Heart through main.js after "Add to Favorites" and "Remove
// from Favorites" in PinballY's main menu: the new state once back on the
// wheel, and the Info Log answers the cabinet check on whether the
// favourite flag has its new value at "menuclose".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownHeart, INFO_LOG } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Favorite Heart follows Add to Favorites and Remove from Favorites", async () => {
    const { fake } = await startWheelGuides();
    // What PinballY does on these commands, after the pack's "command" listeners.
    const COMMAND = globalThis.command;
    fake.setNativeCommand(COMMAND.AddFavorite, () => fake.getCurrentTable().update({ isFavorite: true }));
    fake.setNativeCommand(COMMAND.RemoveFavorite, () => fake.getCurrentTable().update({ isFavorite: false }));
    // The fake's main menu always offers "Add to Favorites": "Remove from
    // Favorites" comes from a menu holding that entry alone.
    const openMenuWith = title => {
        if (title === "Add to Favorites") fake.openMainMenu();
        else globalThis.mainWindow.showMenu("main", [{ title, cmd: COMMAND.RemoveFavorite }]);
    };
    const choose = async title => {
        openMenuWith(title);
        fake.selectMenuItem(title);
        await settle();
        fake.advanceTime(300);
        await settle();
    };

    fake.moveWheel(1);
    assert.equal(shownHeart(fake), "grey");
    await choose("Add to Favorites");
    assert.equal(shownHeart(fake), "red", "Black Knight added");
    assert.match(fake.readFile(INFO_LOG),
        /\[WheelGuides\] "Add to Favorites" on "Black Knight": isFavorite is true at "menuclose" \(the new value\)\./);

    await choose("Remove from Favorites");
    assert.equal(shownHeart(fake), "grey", "Black Knight removed");
    assert.match(fake.readFile(INFO_LOG),
        /\[WheelGuides\] "Remove from Favorites" on "Black Knight": isFavorite is false at "menuclose" \(the new value\)\./);
    assertNoErrorLogged(fake);
});
