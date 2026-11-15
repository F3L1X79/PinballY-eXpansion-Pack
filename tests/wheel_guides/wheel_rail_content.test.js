// ============================================================
// The Wheel Rail through main.js follows the wheel's content: its dimmed
// letters change after a Profile switch, a filter choice and a table leaving
// Favorite Tables at "menuclose"; the base is drawn again only then.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, railDraws, table } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLES = [
    table("Addams Family", 1992, { isFavorite: true }),
    table("Black Knight", 1980, { categories: ["NSFW"] }),
    table("Cyclone", 1988, { isFavorite: true }),
    table("Dracula", 1993),
];
const lit = fake => "#ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").filter(row => !shownRail(fake).dimmed.includes(row));

test("the Wheel Rail's dimmed letters follow the wheel's content", async () => {
    const { fake, chooseInFilterPicker, switchTo } = await startWheelGuides({
        tables: TABLES, profiles: { Kid: { isChild: true }, Mom: {} }, active: "Mom",
    });
    assert.deepEqual(lit(fake), ["A", "B", "C", "D"]);

    switchTo("Kid");
    assert.deepEqual(lit(fake), ["A", "C", "D"], "a Child Profile's wheel, without the Adult Table, at once");
    switchTo("Mom");
    await settle();
    assert.deepEqual(lit(fake), ["A", "B", "C", "D"]);

    await chooseInFilterPicker("Favorites");
    assert.deepEqual(lit(fake), ["A", "C"], "Favorite Tables, after the delayed reads");
    const { base } = railDraws(fake);
    fake.openMainMenu();
    fake.closeMenu();
    await settle();
    fake.advanceTime(300);
    await settle();
    assert.equal(railDraws(fake).base, base, "the same content: the base is not drawn again");

    // Taken as PinballY refreshing Favorite Tables once the menu closes.
    globalThis.mainWindow.on("menuclose", () => globalThis.gameList.setCurFilter("Favorites"));
    fake.moveWheel(1);
    assert.equal(fake.getCurrentTable().title, "Cyclone");
    fake.openMainMenu();
    fake.getGameInfo("Cyclone").update({ isFavorite: false });
    fake.closeMenu();
    await settle();
    fake.advanceTime(300);
    await settle();
    assert.deepEqual(lit(fake), ["A"], "Cyclone taken out of Favorite Tables");
    assert.equal(shownRail(fake).pill, "A");
    assertNoErrorLogged(fake);
});
