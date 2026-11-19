// ============================================================
// Table ROMs record saved at launch: a table launched while the scripts are
// read saves the answers recorded so far, before the batch is full.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "./table_roms_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const READ = Array.from({ length: 10 }, (_, index) => `Table ${index + 1} (Bally 1990)`);
// Its game file is no .vpx: it is never read, and has no pending ROM.
const LAUNCHED = "Future Pinball Table (FP 2010)";
// After the startup delay, long enough for a few answers only.
const A_FEW_ANSWERS_MS = 10 * 1000 + 2500;

test("a launch saves the answers recorded so far", async () => {
    const { fake, record, scriptsRead } = await startTableRoms({
        tables: [...READ.map(configId => table(configId)), table(LAUNCHED, { gameFile: "C:\\Future Pinball\\Tables\\launched.fpt" })],
        files: Object.fromEntries(READ.map(configId => [vpxFile(configId), {}])),
        vpxtool: Object.fromEntries(READ.map((configId, index) => [vpxFile(configId), `rom_${index}`])),
    });
    fake.advanceTime(A_FEW_ANSWERS_MS);
    const answered = scriptsRead().length;
    assert.ok(answered > 1 && answered < READ.length, `${answered} answers so far`);
    assert.equal(record(), undefined, "nothing saved before the batch is full");

    fake.playGame(fake.getAllTables().find(game => game.configId === LAUNCHED));
    await settle();

    // The last run asked may still be under way.
    const saved = Object.keys(record().tables);
    assert.ok(saved.length >= answered - 1, `${saved.length} of ${answered} saved`);
    assert.deepEqual(saved, READ.slice(0, saved.length));
    assertNoErrorLogged(fake);
});
