// ============================================================
// Status Icons, through main.js, around a game: the Discord icon is hidden
// while it runs, though the cabinet is still public, and back on the wheel
// at once, without a fade or a new drawing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { discordSymbolLayer, symbolDrawings } from "./status_icons_reader.js";

test("the Discord icon hides during a game and is back on the wheel, without a fade", async () => {
    const { fake } = await startDiscordScenario({ addOns: ["discordRichPresence", "statusIcons"] });
    fake.advanceTime(POLL_MS);
    const layer = discordSymbolLayer(fake);
    assert.equal(layer.alpha, 1);
    const drawnBefore = symbolDrawings(fake);

    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);
    assert.equal(layer.alpha, 0, "hidden while the game runs");

    fake.gameOver(MARS);
    assert.equal(layer.alpha, 1, "back at once");
    assert.equal(symbolDrawings(fake), drawnBefore, "not drawn again");
    assertNoErrorLogged(fake);
});
