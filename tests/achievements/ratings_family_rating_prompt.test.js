// ============================================================
// The Ratings family through the Rating Prompt, through main.js on the fake
// PinballY globals: after a long enough game, "Rate now" opens PinballY's
// rating dialog, and its closing on a first Rating brings First Verdict.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, MEDIEVAL } from "./ratings_family_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PLAYED_SECONDS = 120;

test("a first Rating given through the Rating Prompt brings its toast on closing the dialog", async () => {
    config.askToRateAfterMinutesPlayed = 1;
    const { fake, titles, familyToasts, newToastTexts, rate, closePopup, lang } = await startRatingsScenario({ addOns: ["profileRatings", "ratingPrompt"] });
    const [firstVerdict] = titles;

    const game = fake.getGameInfo(MEDIEVAL.configId);
    fake.gameStarted(game);
    fake.advanceTime(PLAYED_SECONDS * 1000);
    game.playTime = PLAYED_SECONDS;
    fake.gameOver(game);
    await settle();
    await newToastTexts();
    assert.ok(fake.shownMenus().some(menu => menu.id === "ratingPrompt"), "the Rating Prompt shows");
    fake.selectMenuItem(lang.ratingPrompt.rateNow);
    await settle();
    assert.ok(fake.executedCommands().includes(globalThis.command.RateGame), "Rate now opens PinballY's rating dialog");

    rate(MEDIEVAL, 3);
    await closePopup();
    assert.deepEqual(familyToasts(await newToastTexts()), [firstVerdict]);
    assertNoErrorLogged(fake);
});
