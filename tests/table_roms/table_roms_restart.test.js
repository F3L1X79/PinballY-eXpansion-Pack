// ============================================================
// Table ROMs across a restart (first run in a child process): unchanged
// tables are not read again; a changed .vpx or .vbs is, and the Add-on's own
// ROM updated; a table vpxtool failed on waits for a change, a timeout does not.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { startTableRoms, table, vpxFile, vbsFile, RECORD_FILE } from "./table_roms_scenario.js";
import { SCRIPT_READ_TIMEOUT_MS } from "../../common/table_roms/script_queue.js";

const AFM = "Attack from Mars (Bally 1995)";
const SPACE_TRIP = "Space Trip (VPX Community 2021)";
const BROKEN = "Broken Table (Williams 1992)";
const SLOW = "Slow Table (Bally 1980)";
const NOISY = "Noisy Table (Stern 2005)";
const PATCHED = "Patched Table (Gottlieb 1994)";
const KEPT = "Kept Table (Data East 1990)";

const TABLES = [AFM, SPACE_TRIP, BROKEN, SLOW, NOISY, PATCHED, KEPT];
const FIRST_DAY = new Date(2026, 5, 1, 12, 0, 0).getTime();
const NEXT_DAY = new Date(2026, 5, 2, 12, 0, 0).getTime();
const FIRST_FILES = {
    ...Object.fromEntries(TABLES.map(configId => [vpxFile(configId), { content: "v1", modified: FIRST_DAY }])),
    [vbsFile(PATCHED)]: { content: "patch 1", modified: FIRST_DAY },
};

const FIRST_RUN = `
import { startTableRoms, table, RECORD_FILE } from ${JSON.stringify(new URL("./table_roms_scenario.js", import.meta.url).href)};
const { fake, readScripts, roms, log } = await startTableRoms(${JSON.stringify({
    tables: TABLES.map(configId => table(configId)),
    files: FIRST_FILES,
    vpxtool: {
        [vpxFile(AFM)]: "afm_11",
        [vpxFile(SPACE_TRIP)]: null,
        [vpxFile(SLOW)]: { output: "slow_1\n", durationMs: SCRIPT_READ_TIMEOUT_MS + 5000 },
        [vpxFile(NOISY)]: { output: "error: cannot read the table!\n" },
        [vpxFile(PATCHED)]: "pat_1",
        [vpxFile(KEPT)]: "kept_1",
    },
})});
readScripts();
process.stdout.write(JSON.stringify({ record: fake.readFile(RECORD_FILE), roms: roms(), log: log() }));
`;

test("a restart reads again the changed tables and the timed-out one, not those vpxtool failed on", async () => {
    const firstRun = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", FIRST_RUN], { encoding: "utf8" }));
    assert.deepEqual(firstRun.log, [
        `[TableRoms] "${AFM}": ROM "afm_11" written (was empty; source: script).`,
        `[TableRoms] "${SPACE_TRIP}": its script loads no ROM.`,
        `[TableRoms] ERROR reading the script of "${BROKEN}": vpxtool exit code 1; read again once the table or vpxtool changes.`,
        `[TableRoms] ERROR reading the script of "${SLOW}": no answer from vpxtool within 60 s; read again at the next startup.`,
        `[TableRoms] ERROR reading the script of "${NOISY}": vpxtool's output is no ROM name: "error: cannot read the table!"; read again once the table or vpxtool changes.`,
        `[TableRoms] "${PATCHED}": ROM "pat_1" written (was empty; source: script).`,
        `[TableRoms] "${KEPT}": ROM "kept_1" written (was empty; source: script).`,
    ]);
    assert.deepEqual(Object.keys(JSON.parse(firstRun.record).tables), [AFM, SPACE_TRIP, BROKEN, NOISY, PATCHED, KEPT], "a timeout is not recorded");

    // The AFM and noisy table files were updated, and the patched table's .vbs.
    const { readScripts, roms, log, scriptsRead } = await startTableRoms({
        tables: TABLES.map(configId => table(configId, firstRun.roms[configId] ? { rom: firstRun.roms[configId] } : {})),
        files: {
            ...FIRST_FILES,
            [vpxFile(AFM)]: { content: "v2", modified: NEXT_DAY },
            [vpxFile(NOISY)]: { content: "v2", modified: NEXT_DAY },
            [vbsFile(PATCHED)]: { content: "patch 2", modified: NEXT_DAY },
            [RECORD_FILE]: { content: firstRun.record },
        },
        vpxtool: {
            [vpxFile(AFM)]: "afm_113",
            [vpxFile(SPACE_TRIP)]: "never_asked",
            [vpxFile(BROKEN)]: "never_asked",
            [vpxFile(SLOW)]: "slow_1",
            [vpxFile(NOISY)]: "noisy_2",
            [vpxFile(PATCHED)]: "pat_2",
            [vpxFile(KEPT)]: "never_asked",
        },
    });
    readScripts();

    assert.deepEqual(scriptsRead(), [AFM, SLOW, NOISY, PATCHED].map(vpxFile));
    assert.deepEqual(roms(), {
        [AFM]: "afm_113",
        [SPACE_TRIP]: "",
        [BROKEN]: "",
        [SLOW]: "slow_1",
        [NOISY]: "noisy_2",
        [PATCHED]: "pat_2",
        [KEPT]: "kept_1",
    });
    assert.deepEqual(log(), [
        `[TableRoms] "${AFM}": ROM "afm_113" written (was "afm_11"; source: script).`,
        `[TableRoms] "${SLOW}": ROM "slow_1" written (was empty; source: script).`,
        `[TableRoms] "${NOISY}": ROM "noisy_2" written (was empty; source: script).`,
        `[TableRoms] "${PATCHED}": ROM "pat_2" written (was "pat_1"; source: script).`,
    ]);
});
