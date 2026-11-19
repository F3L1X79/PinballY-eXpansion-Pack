// ============================================================
// Table ROMs confirmed by a Play after the script reading, through main.js
// on the fake PinballY globals: the .nv corrects a wrong script guess,
// replaces the script's ROM with an alternative one, makes a script guess
// it agrees with a confirmed ROM, and makes a table whose script loads no
// ROM a ROM table (its script result is kept as read).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "./table_roms_scenario.js";

const TWILIGHT_ZONE = "Twilight Zone (Bally 1993)";
const AFM = "Attack from Mars (Bally 1995)";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const SPACE_TRIP = "Space Trip (VPX Community 2021)";
const TABLES = [TWILIGHT_ZONE, AFM, MEDIEVAL, SPACE_TRIP];
const MODIFIED = new Date(2026, 5, 1, 12, 0, 0).getTime();
const scriptRead = rom => ({ vpx: { modified: MODIFIED, size: "script".length }, vbs: null, rom });

test("a Play's .nv wins over the script's guess and clears a \"no ROM\" mark", async () => {
    const { play, readScripts, roms, log, record } = await startTableRoms({
        tables: TABLES.map(configId => table(configId)),
        files: Object.fromEntries(TABLES.map(configId => [vpxFile(configId), { content: "script", modified: MODIFIED }])),
        vpxtool: { [vpxFile(TWILIGHT_ZONE)]: "tz_94h", [vpxFile(AFM)]: "afm_113", [vpxFile(MEDIEVAL)]: "mm_109c", [vpxFile(SPACE_TRIP)]: null },
        nvFiles: ["tz_94h", "afm_113", "mm_109c"],
    });
    readScripts();
    const scriptLines = log().length;

    await play(TWILIGHT_ZONE, { nvWritten: ["tz_94ch"] });
    await play(AFM, { nvWritten: ["afm_113b"] });
    await play(MEDIEVAL, { nvWritten: ["mm_109c"] });
    await play(SPACE_TRIP, { nvWritten: ["spacetrp"] });

    assert.deepEqual(roms(), { [TWILIGHT_ZONE]: "tz_94ch", [AFM]: "afm_113b", [MEDIEVAL]: "mm_109c", [SPACE_TRIP]: "spacetrp" });
    // Each launch writes the script's pending ROM first.
    assert.deepEqual(log().slice(scriptLines), [
        `[TableRoms] "${TWILIGHT_ZONE}": ROM "tz_94h" written (was empty; source: script).`,
        `[TableRoms] "${TWILIGHT_ZONE}": ROM "tz_94ch" written (was "tz_94h"; source: nv).`,
        `[TableRoms] "${AFM}": ROM "afm_113" written (was empty; source: script).`,
        `[TableRoms] "${AFM}": ROM "afm_113b" written (was "afm_113"; source: nv).`,
        `[TableRoms] "${MEDIEVAL}": ROM "mm_109c" written (was empty; source: script).`,
        `[TableRoms] "${SPACE_TRIP}": ROM "spacetrp" written (was empty; source: nv).`,
    ]);
    assert.deepEqual(record().tables, {
        [TWILIGHT_ZONE]: { script: scriptRead("tz_94h"), written: { rom: "tz_94ch", source: "nv" } },
        [AFM]: { script: scriptRead("afm_113"), written: { rom: "afm_113b", source: "nv" } },
        [MEDIEVAL]: { script: scriptRead("mm_109c"), written: { rom: "mm_109c", source: "nv" } },
        [SPACE_TRIP]: { script: scriptRead(null), written: { rom: "spacetrp", source: "nv" } },
    });
});
