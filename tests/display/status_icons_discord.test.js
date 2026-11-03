// ============================================================
// Status Icons, through main.js, with Discord Rich Presence on and READY
// late: no icon before READY, then Discord's symbol in the slot, as tall as
// the clock's digits and in its own proportions, fading in once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { assertNoErrorLogged } from "../support/error_log.js";
import { LOGO_URL, POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { discordSymbolLayer, shownIcons, shownIconNames, symbolDrawings, DISCORD } from "./status_icons_reader.js";

// The client reads the pipe every 250 ms: the symbol's fade is just under way.
const JUST_READ_MS = 250 + 3 * 16;
const FADE_OVER_MS = 300;
// Discord's symbol is 528 by 400: these keep its proportions exactly.
const SYMBOL_HEIGHT = 25;
const SYMBOL_WIDTH = 33;

test("Discord's symbol is shipped in the pack's images, in the proportions it is drawn with", () => {
    const png = readFileSync(new URL("../../assets/images/discord_symbol.png", import.meta.url));
    // A PNG's IHDR: its width, then its height, from byte 16.
    assert.equal(png.readUInt32BE(16) * SYMBOL_HEIGHT, png.readUInt32BE(20) * SYMBOL_WIDTH);
});

test("the Rich Presence's logo is in the repository, at its public URL's path", () => {
    assert.ok(existsSync(new URL(`../../${LOGO_URL.split("/main/")[1]}`, import.meta.url)));
});

test("the Discord icon comes with READY, in one fade, and stays", async () => {
    const { fake, discord } = await startDiscordScenario({ discord: { holdReady: true }, addOns: ["discordRichPresence", "statusIcons"] });
    fake.advanceTime(5 * POLL_MS);
    assert.deepEqual(shownIconNames(fake), [], "connected, but nothing public before READY");

    discord.sendReady();
    fake.advanceTime(JUST_READ_MS);
    const [icon] = shownIcons(fake);
    assert.equal(icon.icon, DISCORD);
    assert.ok(icon.alpha > 0 && icon.alpha < 0xFF, `fading in (alpha ${icon.alpha})`);
    assert.equal(icon.bottom - icon.top, SYMBOL_HEIGHT);
    assert.equal(icon.right - icon.left, SYMBOL_WIDTH);

    fake.advanceTime(FADE_OVER_MS);
    assert.equal(discordSymbolLayer(fake).alpha, 1, "then fully shown");
    fake.advanceTime(10 * 1000);
    assert.equal(symbolDrawings(fake), 1, "one drawing, never a loop");
    assertNoErrorLogged(fake);
});
