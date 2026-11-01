// ============================================================
// No "Install vpxtool" line in the eXpansion Pack Settings, through main.js,
// while vpxtool.exe is already in the tools folder with Table ROMs on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnSettings } from "./install_vpxtool_scenario.js";

test("the list has no install line", async () => {
    const { fake, lines } = await startOnSettings({ vpxtool: true });

    assert.deepEqual(lines.slice(-3), ["Offline Mode", "---", "Back"]);
    assertNoErrorLogged(fake);
});
