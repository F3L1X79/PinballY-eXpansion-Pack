// ============================================================
// Shared vpxtool runner with the Table ROMs Add-on on, through main.js on
// the fake PinballY globals: a run another Add-on submits waits for the
// script read in progress and for the end of a game, then runs and hands
// its answer back; an error in its handler is logged under its name.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "../table_roms/table_roms_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { errorLines } from "../support/error_log.js";
import { getVpxtoolRunner } from "../../common/vpxtool/vpxtool_runner.js";

const AFM = "Attack from Mars (Bally 1995)";
const NV_COPY = "C:\\PinballY\\Scripts\\ExpansionPack\\play_scores\\afm_113.nv";
const STARTUP_DELAY_MS = 10 * 1000;
const READ_MS = 30 * 1000;
const GAME_MS = 30 * 60 * 1000;

test("another Add-on's run waits for the script read in progress and for the game, then runs", async () => {
    const { fake, roms } = await startTableRoms({
        tables: [table(AFM)],
        files: { [vpxFile(AFM)]: {} },
        vpxtool: { [vpxFile(AFM)]: { output: "afm_113\n", durationMs: READ_MS } },
    });
    const nvramRuns = () => fake.programRuns().filter(run => run.args[0] === "nvram");
    fake.advanceTime(STARTUP_DELAY_MS + 5 * 1000);

    const answers = [];
    getVpxtoolRunner().submit({
        scriptName: "OtherAddOn",
        args: ["nvram", "show", NV_COPY],
        apply: (result) => {
            answers.push(result);
            throw new Error("handler trouble");
        },
        fail: reason => answers.push({ failed: reason }),
    });
    assert.deepEqual(nvramRuns(), [], "the script read in progress goes first");

    const played = fake.getAllTables()[0];
    fake.playGame(played);
    await settle();
    fake.gameStarted(played);
    fake.advanceTime(GAME_MS);

    assert.deepEqual(roms(), { [AFM]: "afm_113" }, "the script read finished during the game");
    assert.deepEqual(nvramRuns(), [], "no run starts during the game");

    fake.gameOver(played);
    fake.advanceTime(60 * 1000);

    assert.deepEqual(nvramRuns().map(run => run.args), [["nvram", "show", NV_COPY]]);
    // The fake vpxtool has no answer for this file: exit code 1.
    assert.deepEqual(answers, [{ exitCode: 1, output: "" }]);
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /^\[OtherAddOn\] .*handler trouble/);
});
