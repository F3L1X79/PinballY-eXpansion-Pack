// ============================================================
// Shared NVRAM watch with the Table ROMs Add-on off, through main.js on the
// fake PinballY globals: another Add-on hears the ROMs whose .nv file
// changed during each game, none or several included, and once that the
// NVRAM folder is missing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "../table_roms/table_roms_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { getNvramWatch } from "../../common/vpxtool/nvram_watch.js";

const AFM = "Attack from Mars (Bally 1995)";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MISSING_FOLDER = "D:\\Elsewhere\\nvram";

test("with Table ROMs off, another Add-on hears the .nv files changed during each game", async () => {
    const { fake, play } = await startTableRoms({
        tables: [table(AFM), table(MEDIEVAL, { system: { nvramPath: MISSING_FOLDER } })],
        files: { [vpxFile(AFM)]: {}, [vpxFile(MEDIEVAL)]: {} },
        nvFiles: ["afm_113"],
        enabled: false,
    });
    const heard = [];
    getNvramWatch().watch("OtherAddOn", {
        onGameEnded: ({ configId, changed }) => heard.push({ configId, changed }),
        onFolderMissing: where => heard.push({ missing: where }),
    });

    await play(AFM, { nvWritten: ["afm_113"] });
    await play(AFM);
    await play(AFM, { nvWritten: ["afm_113", "tmnt_104"] });
    await play(MEDIEVAL, { folder: MISSING_FOLDER });
    await play(MEDIEVAL, { folder: MISSING_FOLDER });

    assert.deepEqual(heard, [
        { configId: AFM, changed: ["afm_113"] },
        { configId: AFM, changed: [] },
        { configId: AFM, changed: ["afm_113", "tmnt_104"] },
        { missing: `no folder at ${MISSING_FOLDER}` },
    ]);
    assertNoErrorLogged(fake);
});
