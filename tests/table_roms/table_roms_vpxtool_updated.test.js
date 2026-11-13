// ============================================================
// Table ROMs after a vpxtool update (first run in a child process): a table
// vpxtool failed on, unchanged since, is read again by the new vpxtool.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startTableRoms, table, vpxFile, RECORD_FILE, NOW } from "./table_roms_scenario.js";

const NEW_TABLE = "New Table (Stern 2026)";
const FILES = { [vpxFile(NEW_TABLE)]: { content: "v1", modified: NOW.getTime() } };

const FIRST_RUN = `
import { startTableRoms, table, RECORD_FILE } from ${JSON.stringify(new URL("./table_roms_scenario.js", import.meta.url).href)};
const { fake, readScripts, log } = await startTableRoms(${JSON.stringify({
    tables: [table(NEW_TABLE)],
    files: FILES,
    // No answer for the table: the old vpxtool exits with code 1.
    vpxtool: {},
})});
readScripts();
process.stdout.write(JSON.stringify({ record: fake.readFile(RECORD_FILE), log: log() }));
`;

test("a new vpxtool reads again a table the old one failed on", async () => {
    const firstRun = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", FIRST_RUN], { encoding: "utf8" }));
    assert.deepEqual(firstRun.log, [
        `[TableRoms] ERROR reading the script of "${NEW_TABLE}": vpxtool exit code 1; read again once the table or vpxtool changes.`,
    ]);

    const { fake, readScripts, roms, scriptsRead } = await startTableRoms({
        tables: [table(NEW_TABLE)],
        files: { ...FILES, [RECORD_FILE]: { content: firstRun.record } },
        vpxtool: { [vpxFile(NEW_TABLE)]: "new_100" },
        vpxtoolModified: new Date(2026, 9, 13, 9, 0, 0).getTime(),
    });
    readScripts();

    assert.deepEqual(scriptsRead(), [vpxFile(NEW_TABLE)]);
    assert.deepEqual(roms(), { [NEW_TABLE]: "new_100" });
    assertNoErrorLogged(fake);
});
