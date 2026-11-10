// ============================================================
// The fake host's random reaches what main.js's shared modules draw with: a
// scenario about something else never meets an Easter Egg, whatever
// Math.random says, and one that wants a real draw replaces it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createPinballYHost } from "../../common/core/pinbally_host.js";

test("the real host draws from the fake's random once its globals are installed", () => {
    const fake = createFakePinballYHost();
    const uninstall = fake.installGlobals();
    const host = createPinballYHost();
    assert.equal(host.random(), 0.99, "never a win");
    fake.random = () => 0.25;
    assert.equal(host.random(), 0.25, "a test that wants a draw replaces it");
    uninstall();
});
