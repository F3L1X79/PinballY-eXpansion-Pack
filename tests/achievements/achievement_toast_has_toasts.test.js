// ============================================================
// The Achievement Toast module's question for what must not start over a
// toast: is one on screen or waiting?
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createAchievementToasts } from "../../common/achievements/achievement_toast.js";

const TOAST = { title: "T", description: "D", onShown() {} };
// Longer than a toast's whole life (rise, hold, fade).
const WHOLE_LIFE_MS = 6000;

test("a toast counts from its submission until it has left the screen", () => {
    const fake = createFakePinballYHost();
    const toasts = createAchievementToasts(fake);
    assert.equal(toasts.hasToasts(), false);
    toasts.submit(TOAST);
    assert.equal(toasts.hasToasts(), true, "on screen");
    fake.advanceTime(WHOLE_LIFE_MS);
    assert.equal(toasts.hasToasts(), false, "gone");
});

test("a toast waiting for the end of a game counts", () => {
    const fake = createFakePinballYHost();
    const toasts = createAchievementToasts(fake);
    fake.gameStarted({ id: 1, configId: "Table", title: "Table" });
    toasts.submit(TOAST);
    assert.equal(toasts.hasToasts(), true);
});
