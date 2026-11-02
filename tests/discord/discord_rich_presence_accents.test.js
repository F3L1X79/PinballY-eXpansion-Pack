// ============================================================
// Discord Rich Presence through main.js, an accented table name: sent as
// UTF-8 bytes, the frame's header giving their count, not the characters'.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { assertNoErrorLogged } from "../support/error_log.js";
import { POLL_MS, activitiesSent, startDiscordScenario } from "./discord_scenario.js";

const TITLE = "Élan Vital: Café Müller ★";
const TABLE = { id: 3, configId: "Elan Vital (Original 2024)", title: TITLE, manufacturer: "VPX Community", year: 2024, categories: [], isConfigured: true, isHidden: false };

test("an accented table name is sent as UTF-8, its header counting the bytes", async () => {
    const { fake, discord } = await startDiscordScenario({ tables: [TABLE] });
    fake.advanceTime(POLL_MS);
    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    fake.advanceTime(POLL_MS);

    // The fake Discord decodes strict UTF-8 and checks the header's length.
    assert.equal(activitiesSent(discord).at(-1).details, TITLE);
    const frame = discord.frames().at(-1);
    assert.equal(frame.byteLength, Buffer.byteLength(JSON.stringify(frame.payload), "utf8"));
    assert.ok(frame.byteLength > JSON.stringify(frame.payload).length, "more bytes than characters");
    assertNoErrorLogged(fake);
});
