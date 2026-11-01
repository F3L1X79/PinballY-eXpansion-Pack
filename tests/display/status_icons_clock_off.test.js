// ============================================================
// Status Icons, through main.js, with the clock turned off: the icons keep
// the slot they have beside the clock, right of the widest time it could
// show, instead of moving to the corner.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { shownIconNames, statusIconsLayer, assertInSlot, UPDATE_CHECK_OFF } from "./status_icons_reader.js";

test("with the clock off, the icons keep their slot", async () => {
    const { fake, lang, settle } = await startOnProfilePicker({
        addOns: ["statusIcons"],
        settings: { updateCheck: false },
    });
    await settle();

    assert.equal(statusIconsLayer(fake).position().align, "top left");
    assert.deepEqual(shownIconNames(fake), [UPDATE_CHECK_OFF]);
    assertInSlot(fake, lang, "the slot it has with the clock on");
    assertNoErrorLogged(fake);
});
