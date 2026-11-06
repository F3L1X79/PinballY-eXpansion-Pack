// ============================================================
// The wheel's clock and the Status Icons keep the hidden layer rule,
// through main.js on the fake PinballY globals: points while a game runs,
// back at their usual size and place after it, and the Discord symbol's
// layer a point once the symbol has faded out.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { MARS, POLL_MS, startDiscordScenario } from "../discord/discord_scenario.js";
import { discordSymbolLayer, shownIconNames, DISCORD, STATUS_ICONS_Z } from "./status_icons_reader.js";

const FADE_OVER_MS = 600;

// The clock's layer, then the Status Icons' two.
const wheelLayers = fake => fake.drawingLayers().filter(layer => layer.zIndex === STATUS_ICONS_Z);
const placesOf = layers => layers.map(layer => ({ scale: layer.scale(), position: layer.position() }));

function assertRuleHeld(fake, where) {
    assert.equal(wheelLayers(fake).length, 3, where);
    assert.deepEqual(layersBreakingTheRule(fake, wheelLayers(fake)), [], where);
}

test("the clock and the Status Icons are points while hidden and come back at their usual size and place", async () => {
    const { fake, discord } = await startDiscordScenario({ addOns: ["discordRichPresence", "statusIcons", "clock"] });
    fake.advanceTime(POLL_MS);
    assert.deepEqual(shownIconNames(fake), [DISCORD]);
    assertRuleHeld(fake, "on the wheel");
    const usualPlaces = placesOf(wheelLayers(fake));

    fake.playGame(MARS);
    fake.gameStarted(MARS);
    fake.advanceTime(POLL_MS);
    assert.ok(wheelLayers(fake).every(isPoint), "every layer a point while the game runs");
    assertRuleHeld(fake, "during a game");

    fake.gameOver(MARS);
    assertRuleHeld(fake, "back on the wheel");
    assert.deepEqual(placesOf(wheelLayers(fake)), usualPlaces, "at their usual size and place");
    assert.deepEqual(shownIconNames(fake), [DISCORD]);

    discord.disappear();
    fake.advanceTime(FADE_OVER_MS);
    assert.deepEqual(shownIconNames(fake), [], "the symbol faded out");
    assert.ok(isPoint(discordSymbolLayer(fake)), "its layer a point");
    assertRuleHeld(fake, "after the fade");
    assertNoErrorLogged(fake);
});
