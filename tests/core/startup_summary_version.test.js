// ============================================================
// Startup summary's version warning: a WARNING line only for a PinballY
// older than 1.1.0 Beta 10 or newer than the last version tested (Beta 10),
// with versions in the formats of docs/pinbally/pinbally-help.md §2.10.
// The summary line starts with the Pack Version, marked in a git checkout.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, BETA_10_VERSION } from "../support/fake_pinbally_host.js";
import { writeStartupSummary } from "../../common/core/startup_summary.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const SETUP = { language: "en", addOns: { clock: true, wheelArc: true }, profileCount: 1 };
const GIT_PATH = "C:\\PinballY\\Scripts\\ExpansionPack\\.git";

const versionOf = (display, semantic, build) => ({
    basic: "1.1.0", build, buildDate: new Date(Date.UTC(2024, 0, 1)), display, semantic, status: "1.1.0",
});

function packLinesFor(pinballYVersion, setup = SETUP, seed = () => {}) {
    const fake = createFakePinballYHost({ pinballYVersion });
    seed(fake);
    writeStartupSummary(fake, setup);
    return fake.logLines().filter(line => line.startsWith("[ExpansionPack]"));
}

test("Beta 9 is warned as older than the minimum", () => {
    assert.deepEqual(packLinesFor(versionOf("1.1.0 (Beta 9)", "1.1.0-beta.9+9001.20230101T1200", 9001)), [
        `[ExpansionPack] Started: eXpansion Pack v${PACK_VERSION}, PinballY 1.1.0 (Beta 9), build 9001, language en, `
            + "Add-ons off: none, 1 Profiles, 0 tables",
        "[ExpansionPack] WARNING: PinballY 1.1.0 (Beta 9) is older than 1.1.0 Beta 10, the minimum this pack needs.",
    ]);
});

test("Beta 11 is warned as newer than the last version tested", () => {
    assert.deepEqual(packLinesFor(versionOf("1.1.0 (Beta 11)", "1.1.0-beta.11+10200.20260114T1200", 10200)).slice(1), [
        "[ExpansionPack] WARNING: PinballY 1.1.0 (Beta 11) is newer than 1.1.0 Beta 10, the last version this pack was tested with.",
    ]);
});

test("a 1.1.0 release and an RC are newer than Beta 10", () => {
    assert.match(packLinesFor(versionOf("1.1.0 (Release)", "1.1.0+10300.20270101T1200", 10300))[1], /is newer than/);
    assert.match(packLinesFor(versionOf("1.1.0 (RC1)", "1.1.0-rc.1+10250.20261201T1200", 10250))[1], /is newer than/);
});

test("a 1.1.0 dev build, made from the code after Beta 10, is newer", () => {
    assert.match(packLinesFor(versionOf("1.1.0 (Dev)", "1.1.0-Dev.10150+20260301T1200", 10150))[1], /is newer than/);
});

test("a 1.0 release is older, despite having no pre-release status", () => {
    assert.match(packLinesFor(versionOf("1.0.0 (Release)", "1.0.0+5000.20200101T1200", 5000))[1], /is older than/);
});

test("Beta 10 itself, and a version in an unknown format, get no warning", () => {
    assert.equal(packLinesFor(BETA_10_VERSION).length, 1);
    assert.equal(packLinesFor(versionOf("1.1.0 custom", "custom build", 1)).length, 1);
});

test("Add-ons off are listed in config order, and a Profile store that failed reads as unknown", () => {
    const [line] = packLinesFor(BETA_10_VERSION,
        { language: "de", addOns: { clock: false, wheelArc: true, menuCleanup: false }, profileCount: null });
    assert.equal(line, `[ExpansionPack] Started: eXpansion Pack v${PACK_VERSION}, PinballY 1.1.0 (Beta 10), build 10086, language de, `
        + "Add-ons off: clock, menuCleanup, Profiles unknown, 0 tables");
});

test("a git checkout follows the Pack Version, a .git folder or a worktree's .git file", () => {
    for (const seed of [f => f.addFolder(GIT_PATH), f => f.addFile(GIT_PATH, "gitdir: C:/repo/.git/worktrees/pack")]) {
        const [line] = packLinesFor(BETA_10_VERSION, SETUP, seed);
        assert.equal(line, `[ExpansionPack] Started: eXpansion Pack v${PACK_VERSION} (git checkout), PinballY 1.1.0 (Beta 10), `
            + "build 10086, language en, Add-ons off: none, 1 Profiles, 0 tables");
    }
});
