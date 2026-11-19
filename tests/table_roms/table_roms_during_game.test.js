// ============================================================
// Table ROMs during a game, through main.js on the fake PinballY globals:
// no vpxtool run starts from a table's launch until the return to the
// wheel; the run already started at launch finishes and its ROM is
// recorded (saved with its batch), even when the game slows it past the
// usual time limit; the queue then resumes with the remaining tables.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "./table_roms_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { SCRIPT_READ_TIMEOUT_MS } from "../../common/table_roms/script_queue.js";

const AFM = "Attack from Mars (Bally 1995)";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const TMNT = "Teenage Mutant Ninja Turtles (Data East 1991)";
const TABLES = [table(AFM), table(MEDIEVAL), table(TMNT)];
const STARTUP_DELAY_MS = 10 * 1000;
const GAME_MS = 30 * 60 * 1000;

test("a game pauses the script reading, lets the run in progress finish, and the queue resumes after it", async () => {
    const { fake, readScripts, roms, pendingRoms, log, scriptsRead } = await startTableRoms({
        tables: TABLES,
        files: Object.fromEntries(TABLES.map(game => [vpxFile(game.configId), {}])),
        vpxtool: {
            // Slowed down by the game: longer than the time a run gets.
            [vpxFile(AFM)]: { output: "afm_113\n", durationMs: SCRIPT_READ_TIMEOUT_MS + 10 * 1000 },
            [vpxFile(MEDIEVAL)]: "mm_109c",
            [vpxFile(TMNT)]: "tmnt_104",
        },
    });
    fake.advanceTime(STARTUP_DELAY_MS + 5 * 1000);
    assert.deepEqual(scriptsRead(), [vpxFile(AFM)], "the first table is being read");

    const played = fake.getAllTables().find(game => game.configId === MEDIEVAL);
    fake.playGame(played);
    await settle();
    fake.advanceTime(2 * 1000);
    fake.gameStarted(played);
    fake.advanceTime(GAME_MS);

    assert.deepEqual(scriptsRead(), [vpxFile(AFM)], "no run starts during the game");
    assert.deepEqual(pendingRoms(), {}, "the run in progress at launch waits for its batch to be saved");

    fake.gameOver(played);
    readScripts();

    assert.deepEqual(scriptsRead(), [vpxFile(AFM), vpxFile(MEDIEVAL), vpxFile(TMNT)], "the queue resumes after the game");
    assert.deepEqual(pendingRoms(), { [AFM]: "afm_113", [MEDIEVAL]: "mm_109c", [TMNT]: "tmnt_104" });
    assert.deepEqual(roms(), { [AFM]: "", [MEDIEVAL]: "", [TMNT]: "" }, "written once the wheel moves on, or at launch");
    assert.deepEqual(log().filter(line => line.includes("ERROR")), []);
});
