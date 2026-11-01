// ============================================================
// Status Icons, through main.js, by default (Update Check on, GitHub
// answering nothing newer, nothing remembered): the layer is there beside
// the clock and draws nothing, before the reply or after it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { statusIconsLayer } from "./status_icons_reader.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

test("by default the Status Icons draw nothing", async () => {
    const { fake, settle } = await startOnProfilePicker({
        addOns: ["clock", "statusIcons"],
        seed: f => f.replyToHttp({ text: JSON.stringify({ tag_name: `v${PACK_VERSION}`, assets: [] }) }),
    });
    assert.ok(statusIconsLayer(fake), "the layer is there");
    assert.deepEqual(statusIconsLayer(fake).strokes(), [], "nothing before GitHub answers");
    await settle();
    fake.advanceTime(1000);

    assert.deepEqual(statusIconsLayer(fake).strokes(), [], "nor after");
    assertNoErrorLogged(fake);
});
