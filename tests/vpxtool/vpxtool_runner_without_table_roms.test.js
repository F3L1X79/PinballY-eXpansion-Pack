// ============================================================
// Shared vpxtool runner with the Table ROMs Add-on off, through main.js on
// the fake PinballY globals: another Add-on's run starts at once on the
// wheel, waits for the end of a game, and hears a run with no answer in
// time through its failure handler.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, VPXTOOL } from "../table_roms/table_roms_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { getVpxtoolRunner, VPXTOOL_RUN_TIMEOUT_MS } from "../../common/vpxtool/vpxtool_runner.js";

const AFM = "Attack from Mars (Bally 1995)";
const NV_COPY = "C:\\PinballY\\Scripts\\ExpansionPack\\play_scores\\afm_113.nv";
const GAME_MS = 30 * 60 * 1000;

test("with Table ROMs off, a run starts at once on the wheel and waits for the end of a game", async () => {
    const { fake } = await startTableRoms({ tables: [table(AFM)], enabled: false });
    const answers = [];
    fake.addProgram(VPXTOOL, args => (args[0] === "--slow"
        ? { output: "late", durationMs: VPXTOOL_RUN_TIMEOUT_MS + 10 * 1000 }
        : { output: `{"answer":"${args[1]}"}` }));
    const runner = getVpxtoolRunner();
    const submit = args => runner.submit({
        scriptName: "OtherAddOn", args, apply: result => answers.push(result.output), fail: reason => answers.push(`failed: ${reason}`),
    });

    submit(["first", NV_COPY]);
    assert.deepEqual(fake.programRuns().map(run => run.args[0]), ["first"], "started at once");
    fake.advanceTime(5 * 1000);
    assert.deepEqual(answers, [`{"answer":"${NV_COPY}"}`]);

    const played = fake.getAllTables()[0];
    fake.playGame(played);
    await settle();
    fake.gameStarted(played);
    submit(["second", NV_COPY]);
    fake.advanceTime(GAME_MS);
    assert.deepEqual(fake.programRuns().map(run => run.args[0]), ["first"], "no run starts during the game");

    fake.gameOver(played);
    submit(["--slow"]);
    fake.advanceTime(5 * 60 * 1000);

    assert.deepEqual(fake.programRuns().map(run => run.args[0]), ["first", "second", "--slow"]);
    assert.deepEqual(answers, [
        `{"answer":"${NV_COPY}"}`,
        `{"answer":"${NV_COPY}"}`,
        `failed: no answer from vpxtool within ${VPXTOOL_RUN_TIMEOUT_MS / 1000} s`,
    ]);
    assertNoErrorLogged(fake);
});
