// ============================================================
// The start after a failed Pack Update, the check on, through main.js on the
// fake host: the same Error Toast as with the check off.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { pickAfterFailedUpdate, requestedVersionOf } from "./update_failed_scenario.js";

test("a failed Pack Update brings its Error Toast with the check on too", async () => {
    const { fake, errorCards } = await pickAfterFailedUpdate({ updateCheck: true });

    assert.equal(errorCards.length, 1);
    assert.match(errorCards[0].text, /^PROBLEM \| eXpansion Pack \| The update to v9\.0\.0 failed/);
    assert.equal(requestedVersionOf(fake), undefined, "told once");
    assert.equal(errorLines(fake).length, 1, "only the failure");
});
