// ============================================================
// Table ROMs pending ROMs and attract mode, and a ROM typed by hand before
// the writing: attract mode cancels a dwell and its own moves write nothing;
// the hand-typed ROM is kept and the pending one dropped.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "./table_roms_scenario.js";
import { DWELL_MS } from "../../common/table_roms/pending_rom_writer.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { settle } from "../support/fake_pinbally_host.js";

const AFM = "Attack from Mars (Bally 1995)";
const TMNT = "Teenage Mutant Ninja Turtles (Data East 1991)";
const SONIC = "Sonic (VPX Community 2023)";
const TABLES = [AFM, TMNT, SONIC];

test("attract mode never writes a pending ROM, and a ROM typed by hand meanwhile is kept", async () => {
    const { fake, readScripts, roms, log, record, select, romUpdates } = await startTableRoms({
        tables: TABLES.map(configId => table(configId)),
        files: Object.fromEntries(TABLES.map(configId => [vpxFile(configId), {}])),
        vpxtool: { [vpxFile(AFM)]: "afm_113", [vpxFile(TMNT)]: "tmnt_104", [vpxFile(SONIC)]: "sonic_l1" },
    });
    readScripts();

    select(AFM);
    fake.advanceTime(DWELL_MS);
    fake.enterAttractMode();
    await settle();
    // PinballY's own attract switches fire "gameselect", each after a long stay.
    fake.moveWheel(1);
    fake.advanceTime(DWELL_MS);
    fake.moveWheel(1);
    fake.exitAttractMode();
    select(TMNT);
    assert.deepEqual(romUpdates(), [], "attract mode cancelled the dwell and wrote nothing");
    assert.equal(record().tables[AFM].pending, "afm_113");

    fake.getGameInfo(TMNT).update({ rom: "tmnt_103" });
    fake.advanceTime(DWELL_MS);
    select(SONIC);
    assert.deepEqual(romUpdates(), [[TMNT, "tmnt_103"]], "only the owner's own update");
    assert.equal(roms()[TMNT], "tmnt_103");
    assert.equal(record().tables[TMNT].pending, undefined);
    assert.equal(log().at(-1), `[TableRoms] "${TMNT}": hand-typed ROM "tmnt_103" kept; the script gives "tmnt_104".`);
    assertNoErrorLogged(fake);
});
