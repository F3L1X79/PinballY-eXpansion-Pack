// ============================================================
// Shared NVRAM watch with the Table ROMs Add-on on, through main.js on the
// fake PinballY globals: another Add-on hears which .nv files changed
// during a game, after the Table ROMs Add-on confirmed the ROM from them.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "../table_roms/table_roms_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { getNvramWatch } from "../../common/vpxtool/nvram_watch.js";

const AFM = "Attack from Mars (Bally 1995)";

test("another Add-on hears the .nv files changed during a game, the ROM already confirmed", async () => {
    const { fake, play, roms } = await startTableRoms({
        tables: [table(AFM)],
        files: { [vpxFile(AFM)]: {} },
        vpxtool: { [vpxFile(AFM)]: "afm_113" },
        nvFiles: ["afm_113", "mm_109c"],
    });
    const heard = [];
    getNvramWatch().watch("OtherAddOn", {
        onGameEnded: ({ configId, folder, changed }) => heard.push({ configId, folder, changed, rom: roms()[AFM] }),
    });

    await play(AFM, { nvWritten: ["afm_113b"] });

    assert.deepEqual(heard, [{ configId: AFM, folder: "C:\\Visual Pinball\\VPinMAME\\nvram", changed: ["afm_113b"], rom: "afm_113b" }]);
    assertNoErrorLogged(fake);
});
