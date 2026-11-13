// ============================================================
// Returning greeting on the Welcome Screen in English, with the Profile
// picker off: Guest, the cabinet's only Profile then, is welcomed back
// after a week away, without a name.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { WELCOME_SCREEN_OPEN_MS, greeting } from "./welcome_screen_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

test("without the Profile picker, Guest is welcomed back after a week away, without a name", async () => {
    // Wednesday 7 October 2026, at noon; last Play 10 days before.
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 7, 12, 0, 0) });
    fake.addFile(`${PROFILES}\\Guest\\play-log-2026.json`, JSON.stringify({
        version: 1, plays: [{ start: "2026-09-27T21:00:00", configId: "Medieval Madness (Williams 1997)", seconds: 600 }],
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "startupChoicePrompt";
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.welcomeScreen;
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);

    assert.equal(greeting(fake), "Welcome back!");
    assert.equal(greeting(fake), TEXT.greetingAlone(TEXT.returning.week));
    assertNoErrorLogged(fake);
});
