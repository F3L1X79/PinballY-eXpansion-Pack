// ============================================================
// The Avatar Frame list's Button Hints, through main.js on the fake
// PinballY globals: the footer names the flippers (Browse), Select
// (Choose) and Exit (Back, the Exit Button's word).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, DRAWN_AHEAD_MS } from "../mastery/mastery_bar_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { openProfileStats, choose, untilFrameListShown } from "../stats/profile_stats_reader.js";
import { frameListButtonHints } from "./avatar_frame_list_reader.js";

test("the footer reads L Flipper R Flipper Browse, Select Choose, Exit Back", async () => {
    const fake = await startScenario({
        addOns: ["tableMastery", "achievements", "customMenuCommands"], frameImages: true, profiles: { guest: { collectionTier: 3 } },
    });
    fake.advanceTime(DRAWN_AHEAD_MS);
    const { default: lang } = await import("../../common/core/i18n.js");
    openProfileStats(fake, lang);
    choose(fake, "Avatar Frames");
    untilFrameListShown(fake);

    assert.deepEqual(frameListButtonHints(fake), [
        { keys: ["L FLIPPER", "R FLIPPER"], label: "BROWSE" },
        { keys: ["SELECT"], label: "CHOOSE" },
        { keys: ["EXIT"], label: "BACK" },
    ]);
    assertNoErrorLogged(fake);
});
