// ============================================================
// When the PinballY Version Notice is submitted at a start, and what it says:
// once per PinballY Version for each Admin Profile, once for the whole cabinet
// while it has no Admin Profile, never for a Profile without the setup entries.
// Each submitAt() is a new start on the same cabinet's disk.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";
import { createUpdateState } from "../../common/updates/update_state.js";
import { submitVersionNotice } from "../../common/updates/version_notice.js";
import { DIALOG_PRIORITY } from "../../common/core/wheel_dialog.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const versionOf = (display, semantic) => ({ display, semantic, build: 1, status: "1.1.0" });
const BETA_9 = versionOf("1.1.0 (Beta 9)", "1.1.0-beta.9+9001.20230101T1200");
const BETA_10 = versionOf("1.1.0 (Beta 10)", "1.1.0-beta.10+10086.20240924T1200");
const BETA_11 = versionOf("1.1.0 (Beta 11)", "1.1.0-beta.11+10200.20260114T1200");
const BETA_12 = versionOf("1.1.0 (Beta 12)", "1.1.0-beta.12+10300.20270114T1200");
const CUSTOM = versionOf("1.1.0 custom", "custom build");

// The household as the Notice asks about it: its Admin Profiles and the active Profile.
const household = (active, admins = []) => ({
    getActiveProfile: () => ({ name: active }),
    isAdmin: () => admins.includes(active),
    hasAdminProfile: () => admins.length > 0,
});

const cabinet = () => createFakePinballYHost();

// A new start: the dialog submitted, or null. show: whether it reaches the screen.
function submitAt(fake, profileStore, { version = BETA_11, references, show = true } = {}) {
    const host = { ...fake, getPinballYVersion: () => version };
    const submitted = [];
    submitVersionNotice(host, {
        state: createUpdateState(fake),
        profileStore,
        dialogs: { submit: dialog => submitted.push(dialog) },
        references,
    });
    assert.ok(submitted.length <= 1);
    if (submitted.length === 0) return null;
    if (show) submitted[0].onShown();
    return submitted[0];
}

const AVA = household("Ava", ["Ava", "Ben"]);
const BEN = household("Ben", ["Ava", "Ben"]);

test("a newer version is told to an Admin Profile, naming both versions, with one button of its own", () => {
    const fake = cabinet();
    const notice = submitAt(fake, AVA);

    assert.equal(notice.title, "Untested PinballY version");
    assert.equal(notice.message, "PinballY 1.1.0 (Beta 11) has not been tested with this version of the pack, which was tested on 1.1.0 (Beta 10). "
        + "Everything may work fine, but if something misbehaves, this may be why.");
    assert.deepEqual(notice.buttons.map(button => button.label), ["Got it"]);
    assertNoErrorLogged(fake);
});

test("a version the pack cannot read is told as not tested", () => {
    const notice = submitAt(cabinet(), AVA, { version: CUSTOM });

    assert.equal(notice.title, "Untested PinballY version");
    assert.ok(notice.message.startsWith("PinballY 1.1.0 custom has not been tested"));
});

test("an older version than the minimum is told as too old, naming both versions", () => {
    const notice = submitAt(cabinet(), AVA, { version: BETA_9 });

    assert.equal(notice.title, "PinballY version too old");
    assert.equal(notice.message, "This pack needs PinballY 1.1.0 (Beta 10) or newer, and this cabinet has 1.1.0 (Beta 9). "
        + "Some features may not work: install a newer PinballY.");
});

test("it comes after the Update Prompt and before the Script Reader Prompt and the Startup Screen", () => {
    const { priority } = submitAt(cabinet(), AVA);

    assert.ok(DIALOG_PRIORITY.UPDATE_PROMPT < priority);
    assert.ok(priority < DIALOG_PRIORITY.SCRIPT_READER_PROMPT);
    assert.ok(priority < DIALOG_PRIORITY.STARTUP_PROMPT);
});

test("no gap means no Notice, and a Tested PinballY Version naming the running one closes the gap", () => {
    const fake = cabinet();
    assert.equal(submitAt(fake, AVA, { version: BETA_10 }), null);
    assert.equal(submitAt(fake, AVA, { references: { minimum: BETA_9, tested: BETA_11 } }), null);
    assert.equal(fake.readFile(STATE_FILE), undefined, "nothing is written for nothing");
});

test("each Admin Profile sees it once for a PinballY Version, whoever saw it before", () => {
    const fake = cabinet();
    assert.ok(submitAt(fake, AVA));
    assert.equal(submitAt(fake, AVA), null, "Ava's next start");
    assert.ok(submitAt(fake, BEN), "another Admin Profile, at a later start");
    assert.equal(submitAt(fake, BEN), null);
    assert.equal(submitAt(fake, AVA), null, "Ben's turn left Ava's memory in place");
    assertNoErrorLogged(fake);
});

test("Profile names compare as they do elsewhere: case does not matter", () => {
    const fake = cabinet();
    submitAt(fake, AVA);
    assert.equal(submitAt(fake, household("AVA", ["AVA"])), null);
});

test("a submission that never showed marks nothing: it comes back at the next start", () => {
    const fake = cabinet();
    assert.ok(submitAt(fake, AVA, { show: false }));
    assert.equal(fake.readFile(STATE_FILE), undefined);
    assert.ok(submitAt(fake, AVA));
});

test("a different PinballY Version brings it back, and leaves the older memory behind", () => {
    const fake = cabinet();
    submitAt(fake, AVA);
    assert.ok(submitAt(fake, AVA, { version: BETA_12 }));
    assert.equal(submitAt(fake, AVA, { version: BETA_12 }), null);
    assert.ok(submitAt(fake, AVA), "back on Beta 11, its memory was replaced");
});

test("a Profile that does not see the setup entries never sees it, and marks nothing", () => {
    const fake = cabinet();
    for (const name of ["Kid", "Guest"]) assert.equal(submitAt(fake, household(name, ["Ava"])), null);
    assert.equal(fake.readFile(STATE_FILE), undefined);
    assert.ok(submitAt(fake, household("Ava", ["Ava"])), "its first Admin Profile still sees it");
});

test("with no Admin Profile it shows once for the whole cabinet, Guest included", () => {
    const fake = cabinet();
    assert.ok(submitAt(fake, household("Guest")));
    assert.equal(submitAt(fake, household("Guest")), null);
    assert.equal(submitAt(fake, household("Bob")), null, "another Profile of the same household");
    assertNoErrorLogged(fake);
});

test("an Admin Profile added later sees it once, unless it read it before its mark", () => {
    const fake = cabinet();
    submitAt(fake, household("Guest"));
    assert.ok(submitAt(fake, household("Ava", ["Ava"])), "the new Admin Profile");
    assert.equal(submitAt(fake, household("Ava", ["Ava"])), null);

    const other = cabinet();
    submitAt(other, household("Bob"));
    assert.equal(submitAt(other, household("Bob", ["Bob"])), null, "Bob read it, then gained the mark");
});

test("a memory file cut by a crash is logged and deleted, and the Notice still shows", () => {
    const fake = cabinet();
    fake.addFile(STATE_FILE, "{\"version\":1,\"pinballYNot");

    const notice = submitAt(fake, AVA, { show: false });

    assert.ok(notice);
    assert.equal(fake.readFile(STATE_FILE), undefined, "deleted");
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /pack_update\.json/);
});

test("a failed write goes to the Error Log, the Notice still shows, and it may show again", () => {
    const fake = cabinet();
    fake.lockFile(STATE_FILE);

    const notice = submitAt(fake, AVA);

    assert.ok(notice, "shown all the same");
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /\[VersionNotice\] ERROR/);
    fake.unlockFile(STATE_FILE);
    assert.ok(submitAt(fake, AVA), "nothing was remembered");
});
