// ============================================================
// The first start after a Pack Update that skipped versions, through
// main.js on the fake host: the success dialog lists the Release Highlights
// of every version on the way, newest first, five sentences at most.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readDrawnMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";
import { startAfterUpdate } from "./update_result_success_scenario.js";

test("the success dialog lists the Release Highlights of the skipped versions too", async () => {
    const { fake } = await startAfterUpdate({
        previousVersion: "0.0.1",
        releaseHighlights: {
            "0.0.1": ["Already there."],
            "0.0.2": ["Oldest news.", "Dropped past five."],
            "0.0.3": ["Older news.", "More older news."],
            [PACK_VERSION]: ["Fresh news.", "More fresh news."],
        },
    });

    assert.deepEqual(readDrawnMenu(fake).message.split("\n"), [
        `eXpansion Pack updated to v${PACK_VERSION}`, "",
        "- Fresh news.", "- More fresh news.", "- Older news.", "- More older news.", "- Oldest news.",
    ]);
    chooseEntry(fake, "OK");
    assertNoErrorLogged(fake);
});
