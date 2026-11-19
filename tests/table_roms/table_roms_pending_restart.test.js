// ============================================================
// Table ROMs pending ROMs across a restart: a ROM left pending by an earlier
// session is not read again, and is written at this session's dwell-then-leave or launch.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile, NOW, RECORD_FILE } from "./table_roms_scenario.js";
import { DWELL_MS } from "../../common/table_roms/pending_rom_writer.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const AFM = "Attack from Mars (Bally 1995)";
const TMNT = "Teenage Mutant Ninja Turtles (Data East 1991)";
const SCRIPT = "script";
const read = rom => ({ vpx: { modified: NOW.getTime(), size: SCRIPT.length }, vbs: null, rom });

test("a ROM left pending by an earlier session is written at a later session's dwell-then-leave or launch", async () => {
    const { fake, readScripts, record, select, play, romUpdates, scriptsRead, infoLines } = await startTableRoms({
        tables: [table(AFM), table(TMNT)],
        files: {
            [vpxFile(AFM)]: { content: SCRIPT },
            [vpxFile(TMNT)]: { content: SCRIPT },
            [RECORD_FILE]: {
                content: JSON.stringify({
                    version: 1,
                    tables: { [AFM]: { script: read("afm_113"), pending: "afm_113" }, [TMNT]: { script: read("tmnt_104"), pending: "tmnt_104" } },
                }),
            },
        },
        vpxtool: { [vpxFile(AFM)]: "never_asked", [vpxFile(TMNT)]: "never_asked" },
    });
    readScripts();
    assert.deepEqual(scriptsRead(), []);
    assert.deepEqual(await infoLines(), ["[TableRoms] Script reading done; ROMs pending: 2."]);

    select(AFM);
    fake.advanceTime(DWELL_MS);
    select(TMNT);
    assert.deepEqual(romUpdates(), [[AFM, "afm_113"]]);
    assert.deepEqual(record().tables[AFM], { script: read("afm_113"), written: { rom: "afm_113", source: "script" } });

    await play(TMNT);
    assert.deepEqual(romUpdates(), [[AFM, "afm_113"], [TMNT, "tmnt_104"]], "or at launch");
    assertNoErrorLogged(fake);
});
