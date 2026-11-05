// ============================================================
// PinballY Version Notice over the Welcome Screen's start, through main.js on
// the fake host: it hides the Startup Screen's Loader, which would swallow its
// Exit, and Exit closes it as having been read.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readLoader } from "../support/loader_reader.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { answer, shownDialog } from "../table_roms/script_reader_prompt_scenario.js";

const BETA_9 = { display: "1.1.0 (Beta 9)", semantic: "1.1.0-beta.9+9001.20230101T1200", build: 9001, status: "1.1.0" };

test("the Notice hides the Startup Screen's Loader, and Exit closes it", async () => {
    const start = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus"],
        activeProfile: "Alice",
        pinballYVersion: BETA_9,
        settings: { startupScreen: "welcome" },
    });
    const { fake, settle } = start;
    assert.equal(readLoader(fake).shown, true, "the comet turns before the queue's first turn");

    await settle();
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(shownDialog(fake).title, "PinballY version too old");
    assert.deepEqual(readLoader(fake), { shown: false });

    await answer(start, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.notEqual((shownDialog(fake) || {}).title, "PinballY version too old");
    assert.ok(fake.logLines().includes("[VersionNotice] Shown to Alice for PinballY 1.1.0 (Beta 9)."));
    assertNoErrorLogged(fake);
});
