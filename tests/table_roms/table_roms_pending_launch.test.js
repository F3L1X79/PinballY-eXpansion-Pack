// ============================================================
// Table ROMs pending ROMs at launch: a launch writes the table's pending ROM
// before any later "prelaunch" listener, whether the table was dwelt on or
// never selected, and the dwell's own write is dropped.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "./table_roms_scenario.js";
import { DWELL_MS } from "../../common/table_roms/pending_rom_writer.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const AFM = "Attack from Mars (Bally 1995)";
const TMNT = "Teenage Mutant Ninja Turtles (Data East 1991)";
const SONIC = "Sonic (VPX Community 2023)";
const TABLES = [AFM, TMNT, SONIC];

test("a launch writes the table's pending ROM before the launch is read, dwelt on or never selected", async () => {
    const { fake, readScripts, record, select, play, romUpdates, infoLines } = await startTableRoms({
        tables: TABLES.map(configId => table(configId)),
        files: Object.fromEntries(TABLES.map(configId => [vpxFile(configId), {}])),
        vpxtool: { [vpxFile(AFM)]: "afm_113", [vpxFile(TMNT)]: "tmnt_104", [vpxFile(SONIC)]: "sonic_l1" },
    });
    // Like the High Scores Add-on, which reads the ROM at launch to copy its .nv.
    const romsAtLaunch = [];
    fake.on("prelaunch", ev => romsAtLaunch.push([ev.game.configId, ev.game.rom]));
    readScripts();

    select(AFM);
    fake.advanceTime(DWELL_MS);
    await play(AFM);
    assert.deepEqual(romsAtLaunch, [[AFM, "afm_113"]]);
    select(TMNT);
    assert.deepEqual(romUpdates(), [[AFM, "afm_113"]], "the dwell's write is dropped once the launch wrote it");

    // As the Random Game or the Welcome Screen launch it: no "gameselect" for it first.
    await play(SONIC);
    assert.deepEqual(romsAtLaunch, [[AFM, "afm_113"], [SONIC, "sonic_l1"]]);
    assert.deepEqual(romUpdates(), [[AFM, "afm_113"], [SONIC, "sonic_l1"]]);
    assert.equal(record().tables[SONIC].pending, undefined);
    assert.deepEqual((await infoLines()).slice(1), [
        `[TableRoms] "${AFM}": pending ROM "afm_113" written at launch.`,
        `[TableRoms] "${SONIC}": pending ROM "sonic_l1" written at launch.`,
    ]);
    assertNoErrorLogged(fake);
});
