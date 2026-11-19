// ============================================================
// Table ROMs without VPinMAME's NVRAM folder, through main.js on the fake
// PinballY globals: one line is logged, however many games are played,
// no ROM is confirmed, and the script guess still works.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "./table_roms_scenario.js";

const AFM = "Attack from Mars (Bally 1995)";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const ELSEWHERE = "C:\\Visual Pinball\\VPinMAME\\nvram";

test("without an NVRAM folder, one line is logged and the script guess still works", async () => {
    const { fake, play, readScripts, pendingRoms, log } = await startTableRoms({
        tables: [table(AFM), table(MEDIEVAL)],
        files: { [vpxFile(AFM)]: {}, [vpxFile(MEDIEVAL)]: {} },
        vpxtool: { [vpxFile(AFM)]: "afm_113", [vpxFile(MEDIEVAL)]: "mm_109c" },
        nvramFolder: null,
    });
    fake.addFolder(ELSEWHERE);

    await play(AFM, { nvWritten: ["afm_113b"], folder: ELSEWHERE });
    await play(MEDIEVAL, { nvWritten: ["mm_109b"], folder: ELSEWHERE });
    readScripts();

    assert.deepEqual(pendingRoms(), { [AFM]: "afm_113", [MEDIEVAL]: "mm_109c" });
    assert.deepEqual(log().filter(line => line.includes("NVRAM")), [
        "[TableRoms] VPinMAME's NVRAM folder not found (no NVRAM path in the system settings nor nvram_directory in the registry); the ROMs are not confirmed after a game.",
    ]);
});
