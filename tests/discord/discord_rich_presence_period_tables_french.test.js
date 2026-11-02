// ============================================================
// Discord Rich Presence through main.js, in French: the state line of the
// Table of the Day and of the Table of the Week.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the state line speaks French", async () => {
    // Read at i18n's first load, which the scenario's import brings.
    config.language = "fr";
    const { MARS, MEDIEVAL, POLL_MS, activitiesSent, playGame, startDiscordScenario } = await import("./discord_scenario.js");
    const { fake, discord } = await startDiscordScenario({ dayTable: MARS, weekTable: MEDIEVAL });
    fake.advanceTime(POLL_MS);

    await playGame(fake, MARS);
    await playGame(fake, MEDIEVAL);

    assert.deepEqual(activitiesSent(discord).map(activity => activity.state),
        [undefined, "Table du jour", undefined, "Table de la semaine", undefined]);
    assertNoErrorLogged(fake);
});
