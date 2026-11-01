// ============================================================
// The start after a failed Pack Update, the check off, through main.js on
// the fake host, a Household without an Admin Profile: an Error Toast
// points to the helper's log once the Welcome Screen closes, the failure
// goes to the Error Log, and the request is cleared.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { pickAfterFailedUpdate, requestedVersionOf } from "./update_failed_scenario.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const LOG_HINT = "%TEMP%\\PinballYExpansionPack\\pack-update.log";

test("a failed Pack Update brings an Error Toast at the next start, even with the check off", async () => {
    const { fake, errorCards } = await pickAfterFailedUpdate();

    assert.deepEqual(errorCards.map(card => card.text), [
        `PROBLEM | eXpansion Pack | The update to v9.0.0 failed: the previous version is still in place. Details in ${LOG_HINT}`,
    ]);
    assert.equal(requestedVersionOf(fake), undefined, "told once");
    assert.deepEqual(errorLines(fake), [`[UpdateResult] ERROR Pack Update to 9.0.0 failed, still on ${PACK_VERSION}: see ${LOG_HINT}`]);
});
