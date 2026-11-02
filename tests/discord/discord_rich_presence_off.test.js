// ============================================================
// Discord Rich Presence off, its default, through main.js: with Discord
// running, no pipe is opened, through a whole game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { MARS, NOW, playGame } from "./discord_scenario.js";

test("off by default, Discord Rich Presence opens no pipe", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [MARS] });
    const discord = fake.startDiscord();
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    assert.equal(config.addOns.discordRichPresence, false, "off by default");
    // Every other default kept, but Table ROMs, which would need vpxtool and the tables' files.
    config.addOns.tableRoms = false;

    await import("../../main.js");
    await settle();
    await playGame(fake, MARS);

    assert.deepEqual(fake.pipeOpens(), []);
    assert.deepEqual(discord.frames(), []);
    assertNoErrorLogged(fake);
});
