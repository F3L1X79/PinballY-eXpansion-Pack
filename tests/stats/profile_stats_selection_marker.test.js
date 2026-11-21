// ============================================================
// Profile Stats' Selection Marker: on the Exit Button at opening, the first
// button on Next, the Avatar on Prev, a single marker on the button reopened from a child
// screen, gone with its timer at close.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    PROFILE_STATS_OPEN_MS, press, openProfileStats, isProfileStatsOpen, profileStatsLayerCount, buttons, highlighted, markerLayer, markerLayerCount, isMarkerOnExitButton, choose,
} from "./profile_stats_reader.js";

test("the Selection Marker surrounds the Exit Button, jumps on Next, follows the screen back from its lists and is gone once it closes", async () => {
    const { fake, lang } = await startHousehold({ profiles: { Alice: {}, Bob: {} } });
    const TEXT = lang.profileStats;
    const intervalsBefore = fake.runningIntervalCount();

    openProfileStats(fake, lang);
    assert.ok(markerLayer(fake), "the marker is drawn on opening");
    assert.ok(isMarkerOnExitButton(fake), "round the Exit Button");
    assert.equal(highlighted(fake), lang.buttonHints.back, "with its tooltip");
    press(fake, "Next");
    assert.equal(highlighted(fake), buttons(fake)[0].label, "on the first button after Next");
    press(fake, "Prev");
    press(fake, "Prev");
    assert.equal(highlighted(fake), TEXT.changeAvatar, "on the Avatar, the last choice, after Prev from the Exit Button");

    choose(fake, TEXT.buttons.achievements);
    press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(markerLayerCount(fake), 1, "a single marker back from the Achievement List");
    assert.equal(highlighted(fake), TEXT.buttons.achievements);

    choose(fake, TEXT.buttons.frame);
    press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(markerLayerCount(fake), 1, "a single marker back from the Avatar Frame list");
    assert.equal(highlighted(fake), TEXT.buttons.frame);

    choose(fake, TEXT.buttons.household);
    press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(markerLayerCount(fake), 1, "a single marker back from the Household Stats");
    assert.equal(highlighted(fake), TEXT.buttons.household);

    press(fake, "Exit");
    assert.equal(isProfileStatsOpen(fake), false);
    assert.equal(profileStatsLayerCount(fake), 0, "the marker's layer is removed with the others");
    assert.equal(fake.runningIntervalCount(), intervalsBefore, "no timer of the marker keeps running");

    openProfileStats(fake, lang);
    fake.fire("attractmodestart", {});
    assert.equal(profileStatsLayerCount(fake), 0, "removed on attract mode too");
    assert.equal(fake.runningIntervalCount(), intervalsBefore);
    assertNoErrorLogged(fake);
});
