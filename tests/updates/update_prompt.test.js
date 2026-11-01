// ============================================================
// When the Update Prompt is submitted at init: only for a remembered
// version newer than the running one and not offered yet, with the check
// on, outside a git checkout, for a Profile that sees the setup entries;
// otherwise nothing is submitted and nothing marked offered.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { createUpdateState } from "../../common/updates/update_state.js";
import { submitUpdatePrompt } from "../../common/updates/update_prompt.js";
import { DIALOG_PRIORITY } from "../../common/core/wheel_dialog.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const PROJECT = "C:\\PinballY\\Scripts\\ExpansionPack";
const STATE_FILE = `${PROJECT}\\pack_update.json`;
const releaseOf = packVersion => ({ packVersion, zipUrl: `https://example.com/${packVersion}.zip`, sha256: "c0".repeat(32) });

const EVERYONE_SEES = { isAdmin: () => false, hasAdminProfile: () => false };
const NOT_ADMIN = { isAdmin: () => false, hasAdminProfile: () => true };

// Submits at init on a fresh fake host, with the update state saved as
// given; gives the fake, the dialogs submitted and the Pack Updates started.
function submitAt({ saved, enabled = true, profileStore = EVERYONE_SEES, seed = () => {} } = {}) {
    const fake = createFakePinballYHost();
    if (saved) fake.addFile(STATE_FILE, JSON.stringify({ version: 1, ...saved }));
    seed(fake);
    const submitted = [];
    const started = [];
    submitUpdatePrompt(fake, {
        state: createUpdateState(fake),
        profileStore,
        dialogs: { submit: dialog => submitted.push(dialog) },
        updater: { start: release => started.push(release) },
        enabled,
    });
    return { fake, submitted, started };
}

const offeredIn = fake => JSON.parse(fake.readFile(STATE_FILE)).offeredVersion;

test("a newer remembered version is asked about ahead of the Startup Screen, and marked offered once shown", () => {
    const { fake, submitted, started } = submitAt({ saved: { latestRelease: releaseOf("9.0.0") } });

    assert.equal(submitted.length, 1);
    assert.ok(submitted[0].priority < DIALOG_PRIORITY.STARTUP_PROMPT);
    assert.deepEqual([submitted[0].title, submitted[0].message], ["Update available", "eXpansion Pack v9.0.0 is available."]);
    assert.deepEqual(submitted[0].buttons.map(button => button.label), ["Update now", "Later"]);
    assert.equal(offeredIn(fake), undefined, "not marked before it shows");

    submitted[0].onShown();
    assert.equal(offeredIn(fake), "9.0.0");
    submitted[0].buttons[0].action();
    assert.deepEqual(started, [releaseOf("9.0.0")]);
    assertNoErrorLogged(fake);
});

test("a version already offered is not asked again, a newer one is", () => {
    assert.equal(submitAt({ saved: { latestRelease: releaseOf("9.0.0"), offeredVersion: "9.0.0" } }).submitted.length, 0);
    assert.equal(submitAt({ saved: { latestRelease: releaseOf("9.1.0"), offeredVersion: "9.0.0" } }).submitted.length, 1);
});

test("nothing is asked without a remembered version newer than the running one", () => {
    assert.equal(submitAt().submitted.length, 0, "no state file");
    assert.equal(submitAt({ saved: { latestRelease: releaseOf(PACK_VERSION) } }).submitted.length, 0, "the running version");
});

test("nothing is asked or marked with the check off, in a git checkout, or for a Profile without the setup entries", () => {
    const saved = { latestRelease: releaseOf("9.0.0") };
    for (const options of [
        { enabled: false },
        { seed: fake => fake.addFolder(`${PROJECT}\\.git`) },
        { profileStore: NOT_ADMIN },
    ]) {
        const { fake, submitted } = submitAt({ saved, ...options });
        assert.equal(submitted.length, 0);
        assert.equal(offeredIn(fake), undefined);
        assertNoErrorLogged(fake);
    }
});
