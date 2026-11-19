// ============================================================
// Table ROMs record saves while the scripts are read: once per batch of
// answers and once when the queue empties, not once per answer.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile, PROFILES_FOLDER } from "./table_roms_scenario.js";
import { SAVE_BATCH_SIZE } from "../../common/table_roms/table_rom_record.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE_COUNT = SAVE_BATCH_SIZE * 2 + 5;
const CONFIG_IDS = Array.from({ length: TABLE_COUNT }, (_, index) => `Table ${index + 1} (Bally 1990)`);

test("the record is saved once per batch of answers, and once more when the queue empties", async () => {
    const { fake, readScripts, record } = await startTableRoms({
        tables: CONFIG_IDS.map(configId => table(configId)),
        files: Object.fromEntries(CONFIG_IDS.map(configId => [vpxFile(configId), {}])),
        vpxtool: Object.fromEntries(CONFIG_IDS.map((configId, index) => [vpxFile(configId), index % 2 === 0 ? `rom_${index}` : null])),
    });
    readScripts();

    const saves = fake.fileOperations().filter(operation => operation.operation === "write" && operation.path === `${PROFILES_FOLDER}\\table_roms.tmp.json`);
    assert.equal(saves.length, 3, "two full batches, then the last five answers");
    assert.deepEqual(Object.keys(record().tables), CONFIG_IDS);
    assertNoErrorLogged(fake);
});
