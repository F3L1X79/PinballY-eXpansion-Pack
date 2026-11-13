// ============================================================
// vpxtool present but failing on one table, an Admin Profile picked at
// startup through main.js on the fake host: the failure stays a log line
// and brings no Error Toast.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { table, vpxFile } from "./table_roms_scenario.js";
import { pickAtStartup } from "./startup_pick_scenario.js";

const AFM = "Attack from Mars (Bally 1995)";
const BROKEN = "Broken Table (Williams 1992)";

test("vpxtool failing on one table: a log line only, no Error Toast", async () => {
    const { fake, errorCards } = await pickAtStartup({
        adminProfiles: ["Alice"], activeProfile: "Alice",
        tables: [table(AFM), table(BROKEN)],
        // No answer for the broken table: vpxtool exits with code 1.
        vpxtool: { [vpxFile(AFM)]: "afm_113" },
    });

    assert.deepEqual(errorCards, []);
    assert.deepEqual(errorLines(fake), [
        `[TableRoms] ERROR reading the script of "${BROKEN}": vpxtool exit code 1; read again once the table or vpxtool changes.`,
    ]);
});
