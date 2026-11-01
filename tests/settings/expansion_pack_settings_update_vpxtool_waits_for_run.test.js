// ============================================================
// "Update vpxtool" chosen in the eXpansion Pack Settings while vpxtool reads
// a table's script, through main.js on the fake host: the wait shows at once,
// but the helper replaces vpxtool.exe only once that run has ended, and no
// other run starts meanwhile.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { startOnSettings, romnameRuns } from "./install_vpxtool_scenario.js";

// Past the Table ROMs Add-on's 10 s delay and the --version run's poll.
const READING_STARTED_MS = 11 * 1000;
const ROMNAME_RUN_MS = 20 * 1000;

test("the vpxtool update waits for a script reading in progress", async () => {
    const vpxtool = args => (args[0] === "--version" ? { output: "vpxtool git:v0.37.1\n" } : { output: "mm_109c\n", durationMs: ROMNAME_RUN_MS });
    const { fake } = await startOnSettings({ vpxtool, rememberedVersion: "0.37.1" });
    fake.advanceTime(READING_STARTED_MS);
    assert.equal(romnameRuns(fake).length, 1, "a table is being read");

    chooseEntry(fake, "Update vpxtool (v0.37.1 → v0.38.0)");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Update");
    await settle();
    assert.equal(readLoader(fake).shown, true);
    fake.advanceTime(ROMNAME_RUN_MS / 2);
    assert.deepEqual(fake.scriptReaderInstallsAsked(), [], "not while vpxtool runs");

    fake.advanceTime(ROMNAME_RUN_MS);
    assert.deepEqual(fake.scriptReaderInstallsAsked().map(install => install.version), ["0.38.0"]);
    assert.equal(romnameRuns(fake).length, 1, "no run started under the swap");
    assertNoErrorLogged(fake);
});
