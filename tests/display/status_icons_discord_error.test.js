// ============================================================
// Status Icons, through main.js, Discord answering a game's status with an
// error: hidden during the game, the Discord icon is gone back on the wheel,
// at once, with no fade.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { shownIconNames, DISCORD } from "./status_icons_reader.js";

test("an error reply takes the Discord icon away", async () => {
    const { fake, discord } = await startDiscordScenario({ addOns: ["discordRichPresence", "statusIcons"] });
    fake.advanceTime(POLL_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD]);

    discord.errorNextCommand();
    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);
    assert.equal(discord.isConnected(), false, "the connection ended");
    fake.gameOver(MARS);

    assert.deepEqual(shownIconNames(fake), []);
    assertNoErrorLogged(fake);
});
