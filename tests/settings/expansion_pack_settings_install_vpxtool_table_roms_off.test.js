// ============================================================
// No "Install vpxtool" line in the eXpansion Pack Settings, through main.js,
// while the Table ROMs Add-on is off, vpxtool missing all the same: nothing
// would read the scripts with it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnSettings } from "./install_vpxtool_scenario.js";

test("the list has no install line", async () => {
    const { fake, lines } = await startOnSettings({ tableRoms: false });

    assert.deepEqual(lines.slice(-3), ["Offline Mode", "---", "Back"]);
    assertNoErrorLogged(fake);
});
