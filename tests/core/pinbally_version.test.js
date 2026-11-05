// ============================================================
// The PinballY Version gap, for a version and the versions it is compared
// with. A version between the minimum and the Tested PinballY Version is tested
// with references of its own, so it holds even when the pack's two are equal.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { pinballYVersionGap } from "../../common/core/pinbally_version.js";

const BETA_9 = { display: "1.1.0 (Beta 9)", semantic: "1.1.0-beta.9" };
const BETA_11 = { display: "1.1.0 (Beta 11)", semantic: "1.1.0-beta.11" };
const BETA_9_TO_11 = { minimum: BETA_9, tested: BETA_11 };
const versionOf = (display, semantic) => ({ display, semantic, build: 1, status: "1.1.0" });

test("a version older than the Tested PinballY Version, at or above the minimum, has no gap", () => {
    const between = versionOf("1.1.0 (Beta 10)", "1.1.0-beta.10+10086.20240924T1200");
    assert.deepEqual(pinballYVersionGap(between, BETA_9_TO_11), { kind: "none" });
    assert.deepEqual(pinballYVersionGap(versionOf("1.1.0 (Beta 9)", "1.1.0-beta.9+9001.20230101T1200"), BETA_9_TO_11), { kind: "none" });
});

test("a newer Tested PinballY Version closes the gap of a version the pack's own one calls newer", () => {
    const beta11 = versionOf("1.1.0 (Beta 11)", "1.1.0-beta.11+10200.20260114T1200");
    assert.equal(pinballYVersionGap(beta11).kind, "notTested");
    assert.deepEqual(pinballYVersionGap(beta11, BETA_9_TO_11), { kind: "none" });
});

test("a newer version names itself and the Tested PinballY Version, in display form", () => {
    assert.deepEqual(pinballYVersionGap(versionOf("1.1.0 (Beta 11)", "1.1.0-beta.11+10200.20260114T1200")), {
        kind: "notTested", readable: true, running: "1.1.0 (Beta 11)", tested: "1.1.0 (Beta 10)",
    });
});

test("an unreadable version counts as not tested", () => {
    assert.deepEqual(pinballYVersionGap(versionOf("1.1.0 custom", "custom build")), {
        kind: "notTested", readable: false, running: "1.1.0 custom", tested: "1.1.0 (Beta 10)",
    });
});

test("an older version names itself and the minimum, in display form", () => {
    assert.deepEqual(pinballYVersionGap(versionOf("1.1.0 (Beta 9)", "1.1.0-beta.9+9001.20230101T1200")), {
        kind: "tooOld", running: "1.1.0 (Beta 9)", minimum: "1.1.0 (Beta 10)",
    });
});

test("status is never compared: it holds the three-part version on every PinballY", () => {
    const beta10 = { display: "1.1.0 (Beta 10)", semantic: "1.1.0-beta.10+10086.20240924T1200", build: 10086, status: "Beta 99" };
    assert.deepEqual(pinballYVersionGap(beta10), { kind: "none" });
});
