// ============================================================
// Table ROMs pending ROMs on the wheel: a script read writes nothing; a table
// dwelt on for 2 s has its ROM written as the wheel leaves it, once; tables
// passed while scrolling write nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "./table_roms_scenario.js";
import { DWELL_MS } from "../../common/table_roms/pending_rom_writer.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const AFM = "Attack from Mars (Bally 1995)";
const TMNT = "Teenage Mutant Ninja Turtles (Data East 1991)";
const SONIC = "Sonic (VPX Community 2023)";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const TABLES = [AFM, TMNT, SONIC, MEDIEVAL];

test("a pending ROM is written as the wheel leaves a table dwelt on for 2 s, never while it stays, nor while scrolling", async () => {
    const { fake, readScripts, roms, record, select, romUpdates, infoLines } = await startTableRoms({
        tables: TABLES.map(configId => table(configId)),
        files: Object.fromEntries(TABLES.map(configId => [vpxFile(configId), {}])),
        vpxtool: { [vpxFile(AFM)]: "afm_113", [vpxFile(TMNT)]: "tmnt_104", [vpxFile(SONIC)]: "sonic_l1", [vpxFile(MEDIEVAL)]: "mm_109c" },
    });

    readScripts();
    assert.deepEqual(romUpdates(), [], "the script reads refresh no table");
    assert.equal(record().tables[AFM].pending, "afm_113");
    assert.equal(record().tables[AFM].written, undefined);
    assert.deepEqual(await infoLines(), ["[TableRoms] Script reading done; ROMs pending: 4."]);

    select(AFM);
    fake.advanceTime(DWELL_MS);
    assert.deepEqual(romUpdates(), [], "nothing while the player stays on the table");

    select(TMNT);
    assert.deepEqual(romUpdates(), [[AFM, "afm_113"]], "written on leaving it, not on the new table");
    assert.equal(record().tables[AFM].pending, undefined);
    assert.deepEqual(record().tables[AFM].written, { rom: "afm_113", source: "script" });
    assert.equal(roms()[AFM], "afm_113");
    assert.equal((await infoLines())[1], `[TableRoms] "${AFM}": pending ROM "afm_113" written on leaving the table.`);

    fake.advanceTime(DWELL_MS - 1);
    select(SONIC);
    select(MEDIEVAL);
    select(TMNT);
    select(SONIC);
    assert.deepEqual(romUpdates(), [[AFM, "afm_113"]], "a fast scroll writes nothing");
    assert.equal(record().tables[TMNT].pending, "tmnt_104");

    select(AFM);
    fake.advanceTime(DWELL_MS);
    select(SONIC);
    assert.deepEqual(romUpdates(), [[AFM, "afm_113"]], "a table is written once");
    assertNoErrorLogged(fake);
});
