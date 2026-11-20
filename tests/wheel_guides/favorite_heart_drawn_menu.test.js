// ============================================================
// The Favorite Heart after "Add to Favorites" chosen in the drawn main
// menu, as on the cabinet: the native menu is cancelled, so no "menuclose"
// fires, and the heart still turns red without a wheel move.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownHeart, DEFAULT_ADD_ONS } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { openMainMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";

test("the Favorite Heart follows the drawn main menu's Add to Favorites at once", async () => {
    const { fake } = await startWheelGuides({ addOns: [...DEFAULT_ADD_ONS, "drawnMenus"] });
    // What PinballY does on this command, after the pack's "command" listeners.
    fake.setNativeCommand(globalThis.command.AddFavorite, () => fake.getCurrentTable().update({ isFavorite: true }));

    fake.moveWheel(1);
    assert.equal(shownHeart(fake), "grey");
    openMainMenu(fake);
    chooseEntry(fake, "Add to Favorites");
    await settle();
    assert.equal(shownHeart(fake), "red", "Black Knight added, the wheel not moved");
    assertNoErrorLogged(fake);
});
