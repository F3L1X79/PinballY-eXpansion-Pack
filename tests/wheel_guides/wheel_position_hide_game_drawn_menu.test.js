// ============================================================
// The Wheel Position and the Wheel Rail after "Hide game" chosen in a Drawn
// Menu, as on the cabinet: the native menu is cancelled, so no "menuclose"
// fires, and both leave out the hidden table without a wheel move.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownPosition, shownRail, DEFAULT_ADD_ONS } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { OPEN_OVER_MS, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";

test("the Wheel Position and the Wheel Rail follow the Drawn Menu's Hide game at once", async () => {
    const { fake } = await startWheelGuides({ addOns: [...DEFAULT_ADD_ONS, "drawnMenus"] });
    // What PinballY does on this command, after the pack's "command" listeners:
    // update() refreshes the wheel (pinbally-help.md). Assumed: no event on
    // that refresh, and which table it selects then is not documented, so
    // only the count and the rail's letters are read.
    const hideGame = globalThis.command.HideGame;
    fake.setNativeCommand(hideGame, () => {
        fake.getCurrentTable().update({ isHidden: true });
        fake.setWheelTables(["Cyclone", "Dracula", "Eight Ball", "Addams Family"]);
    });

    fake.moveWheel(1);
    assert.equal(shownPosition(fake), "2/5");
    assert.ok(!shownRail(fake).dimmed.includes("B"), "Black Knight's letter lit on the rail");
    fake.openMenu("game setup", [{ title: "Hide game", cmd: hideGame }]);
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Hide game");
    await settle();
    fake.advanceTime(300);
    await settle();
    assert.match(shownPosition(fake) ?? "", /\/4$/, "Black Knight hidden, the wheel not moved");
    assert.ok(shownRail(fake).dimmed.includes("B"), "its letter dimmed on the rail");
    assertNoErrorLogged(fake);
});
