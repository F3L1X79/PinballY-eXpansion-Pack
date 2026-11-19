// ============================================================
// Table ROMs answers lost to a stop (first run in a child process): PinballY
// stops after a full batch and a few more answers; the next start reads again
// the tables of the unsaved answers, along with those never read.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { startTableRoms, table, vpxFile, RECORD_FILE } from "./table_roms_scenario.js";
import { SAVE_BATCH_SIZE } from "../../common/table_roms/table_rom_record.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const CONFIG_IDS = Array.from({ length: SAVE_BATCH_SIZE + 10 }, (_, index) => `Table ${index + 1} (Bally 1990)`);
const START = {
    tables: CONFIG_IDS.map(configId => table(configId)),
    files: Object.fromEntries(CONFIG_IDS.map(configId => [vpxFile(configId), {}])),
    vpxtool: Object.fromEntries(CONFIG_IDS.map((configId, index) => [vpxFile(configId), `rom_${index}`])),
};
// Runs started before the stop: the full batch, then a few more answers.
const STARTED_BEFORE_STOP = SAVE_BATCH_SIZE + 4;

const FIRST_RUN = `
import { startTableRoms } from ${JSON.stringify(new URL("./table_roms_scenario.js", import.meta.url).href)};
const { fake, scriptsRead, record } = await startTableRoms(${JSON.stringify(START)});
while (scriptsRead().length < ${STARTED_BEFORE_STOP}) fake.advanceTime(100);
process.stdout.write(JSON.stringify(record()));
`;

test("answers not saved before a stop are read again at the next start", async () => {
    const savedRecord = execFileSync(process.execPath, ["--input-type=module", "-e", FIRST_RUN], { encoding: "utf8" });
    assert.deepEqual(Object.keys(JSON.parse(savedRecord).tables), CONFIG_IDS.slice(0, SAVE_BATCH_SIZE), "only the full batch was saved");

    const { fake, readScripts, scriptsRead } = await startTableRoms({ ...START, files: { ...START.files, [RECORD_FILE]: { content: savedRecord } } });
    readScripts();

    assert.deepEqual(scriptsRead(), CONFIG_IDS.slice(SAVE_BATCH_SIZE).map(vpxFile));
    assertNoErrorLogged(fake);
});
