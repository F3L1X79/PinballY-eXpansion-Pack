// ============================================================
// The Update result at init: the requested Pack Version running shows the
// success once, ahead of the Update Prompt, with the Release Highlights of
// the versions on the way; another one brings an Error
// Toast for whoever sees the setup entries, kept recorded until it starts
// and submitted again at a Profile switch, never twice at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";
import { createUpdateState } from "../../common/updates/update_state.js";
import { submitUpdateResult } from "../../common/updates/update_result.js";
import { DIALOG_PRIORITY } from "../../common/core/wheel_dialog.js";
import { TOAST_KIND } from "../../common/achievements/achievement_toast.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const LOG_HINT = "%TEMP%\\PinballYExpansionPack\\pack-update.log";

// A Profile Store whose active Profile sees the setup entries or not, as the test sets it.
function fakeProfileStore(sees) {
    const switchListeners = [];
    const store = {
        sees,
        isAdmin: () => store.sees,
        hasAdminProfile: () => true,
        onSwitch: listener => switchListeners.push(listener),
        switchTo: sees => {
            store.sees = sees;
            for (const listener of switchListeners) listener();
        },
    };
    return store;
}

function submitAt({ saved, sees = true, releaseHighlights = {} } = {}) {
    const fake = createFakePinballYHost();
    if (saved) fake.addFile(STATE_FILE, JSON.stringify({ version: 1, ...saved }));
    const dialogs = [];
    const toasts = [];
    const profileStore = fakeProfileStore(sees);
    submitUpdateResult(fake, {
        state: createUpdateState(fake),
        profileStore,
        dialogs: { submit: dialog => dialogs.push(dialog) },
        toasts: { submit: toast => toasts.push(toast) },
        releaseHighlights,
    });
    return { fake, dialogs, toasts, profileStore };
}

const requestedIn = fake => JSON.parse(fake.readFile(STATE_FILE)).requestedVersion;

test("nothing without a requested Pack Update", () => {
    const { fake, dialogs, toasts } = submitAt({ saved: { offeredVersion: "9.0.0" } });
    assert.deepEqual([dialogs.length, toasts.length], [0, 0]);
    assertNoErrorLogged(fake);
});

test("the requested version running says so once, ahead of the Update Prompt", () => {
    const { fake, dialogs, toasts } = submitAt({ saved: { requestedVersion: PACK_VERSION }, sees: false });

    assert.equal(toasts.length, 0);
    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0].priority, DIALOG_PRIORITY.UPDATE_RESULT);
    assert.ok(dialogs[0].priority < DIALOG_PRIORITY.UPDATE_PROMPT);
    assert.deepEqual([dialogs[0].title, dialogs[0].message], ["Update complete", `eXpansion Pack updated to v${PACK_VERSION}`]);
    assert.deepEqual(dialogs[0].buttons.map(button => button.label), ["OK"]);
    assert.equal(requestedIn(fake), PACK_VERSION, "kept until it shows");

    dialogs[0].onShown();
    assert.equal(requestedIn(fake), undefined);
    assertNoErrorLogged(fake);
});

test("the Release Highlights of the versions on the way follow the line as a dash list, and are forgotten with the request", () => {
    const { fake, dialogs } = submitAt({
        saved: { requestedVersion: PACK_VERSION, previousVersion: "0.0.1" },
        releaseHighlights: { "0.0.1": ["Already there."], "0.0.2": ["Older news."], [PACK_VERSION]: ["Fresh news.", "More news."] },
    });

    assert.equal(dialogs[0].message, `eXpansion Pack updated to v${PACK_VERSION}\n\n- Fresh news.\n- More news.\n- Older news.`);
    dialogs[0].onShown();
    assert.deepEqual(JSON.parse(fake.readFile(STATE_FILE)), { version: 1 });
    assertNoErrorLogged(fake);
});

test("another version running brings an Error Toast pointing to the helper's log, cleared once it starts", () => {
    const { fake, dialogs, toasts } = submitAt({ saved: { requestedVersion: "9.0.0" } });

    assert.equal(dialogs.length, 0);
    assert.equal(toasts.length, 1);
    assert.equal(toasts[0].kind, TOAST_KIND.ERROR);
    assert.equal(toasts[0].title, "eXpansion Pack");
    assert.equal(toasts[0].description, `The update to v9.0.0 failed: the previous version is still in place. Details in ${LOG_HINT}`);
    assert.equal(toasts[0].isStale(), false);
    assert.deepEqual(errorLines(fake), [`[UpdateResult] ERROR Pack Update to 9.0.0 failed, still on ${PACK_VERSION}: see ${LOG_HINT}`]);
    assert.equal(requestedIn(fake), "9.0.0", "kept until it starts");

    toasts[0].onShown();
    assert.equal(requestedIn(fake), undefined);
});

test("a failure the active Profile cannot see waits for a switch to one that does, one toast at a time", () => {
    const { fake, toasts, profileStore } = submitAt({ saved: { requestedVersion: "9.0.0" }, sees: false });
    assert.equal(toasts.length, 1, "submitted: the Startup Screen's pick may still change the Profile");
    assert.equal(toasts[0].isStale(), true, "dropped at its turn");

    profileStore.switchTo(false);
    assert.equal(toasts.length, 1, "nothing for a Profile without the setup entries");
    assert.equal(requestedIn(fake), "9.0.0", "still recorded");

    profileStore.switchTo(true);
    profileStore.switchTo(true);
    assert.equal(toasts.length, 3);
    assert.deepEqual(toasts.map(toast => toast.isStale()), [true, true, false], "only the latest one shows");
    toasts[2].onShown();
    assert.equal(requestedIn(fake), undefined);
    assert.equal(toasts[2].isStale(), true, "told once");

    profileStore.switchTo(true);
    assert.equal(toasts.length, 3);
});
