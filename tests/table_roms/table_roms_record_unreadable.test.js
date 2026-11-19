// ============================================================
// Table ROMs record cut by a crash: the unreadable table_roms.json is logged
// and set aside, the start goes on, and every table is read again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile, RECORD_FILE } from "./table_roms_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const AFM = "Attack from Mars (Bally 1995)";
const TMNT = "Teenage Mutant Ninja Turtles (Data East 1991)";

test("a record cut by a crash is set aside and every table is read again", async () => {
    const { fake, readScripts, scriptsRead, pendingRoms } = await startTableRoms({
        tables: [table(AFM), table(TMNT)],
        files: {
            [vpxFile(AFM)]: {},
            [vpxFile(TMNT)]: {},
            [RECORD_FILE]: { content: `{ "version": 1, "tables": { "${AFM}": { "script": { "vpx"` },
        },
        vpxtool: { [vpxFile(AFM)]: "afm_113", [vpxFile(TMNT)]: "tmnt_104" },
    });
    readScripts();

    assert.deepEqual(scriptsRead(), [vpxFile(AFM), vpxFile(TMNT)]);
    assert.deepEqual(pendingRoms(), { [AFM]: "afm_113", [TMNT]: "tmnt_104" });
    const [cause, outcome, ...more] = fake.logLines().filter(line => line.includes("table_roms"));
    // The cause quotes the JSON parser's own message.
    assert.ok(cause.startsWith(`[ProfileStore] ${RECORD_FILE} cannot be read: `), cause);
    assert.equal(outcome, "[ProfileStore] table_roms.json and its backup are unreadable; kept aside as table_roms.broken-2026-10-12_20-00-00.json, starting from zero.");
    assert.deepEqual(more, []);
    assertNoErrorLogged(fake);
});
