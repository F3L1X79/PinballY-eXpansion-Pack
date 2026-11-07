// ============================================================
// Temporary NVRAM probe (#482): with a nvram_probe folder in the pack, every
// .nv is read once by "vpxtool nvram show" after startup, then the table's
// .nv copied at launch and each .nv the game changed, after the game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile, NVRAM_FOLDER } from "./table_roms_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const AFM = "Attack from Mars (Bally 1995)";
const PROBE_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\nvram_probe";

const answer = (score, gamesStarted) => ({
    output: JSON.stringify({
        audits: { Earnings: [{ label: "Games Started", value: gamesStarted }, { label: "Free Games", value: 0 }] },
        game_state: {
            scores: [{ label: "Player 1", value: score }, { label: "Player 2", value: 0 }],
            player_count: { value: 1 },
            game_over: { warning: "Value is stored outside the NVRAM" },
            tilted: { value: false },
        },
    }),
});

test("the probe reads every .nv once, then a Play before and after the game", async () => {
    const { fake, play } = await startTableRoms({
        tables: [table(AFM, { rom: "afm_113" })],
        files: { [vpxFile(AFM)]: {}, [`${PROBE_FOLDER}\\probe.log`]: { content: "" } },
        nvFiles: ["afm_113", "bk_l4"],
        vpxtool: {
            [vpxFile(AFM)]: "afm_113",
            nvram: path => {
                if (path.endsWith("bk_l4.nv")) return { exitCode: 1, output: "" };
                return path.includes("\\before\\") ? answer(1000, 7) : answer(2000, 8);
            },
        },
    });
    const probeLog = () => fake.logLines().filter(line => line.startsWith("[NvramProbe]"));
    const nvramRuns = () => fake.programRuns().filter(run => run.args[0] === "nvram").map(run => run.args[2]);

    fake.advanceTime(30 * 1000);
    assert.deepEqual(nvramRuns(), [`${NVRAM_FOLDER}\\afm_113.nv`, `${NVRAM_FOLDER}\\bk_l4.nv`]);
    assert.deepEqual(probeLog().slice(1), [
        `[NvramProbe] sweep: 2 .nv files in ${NVRAM_FOLDER}.`,
        "[NvramProbe] sweep afm_113.nv: scores [2000, 0]; player_count 1; game_over outside the NVRAM; tilted false",
        "[NvramProbe] sweep bk_l4.nv: vpxtool exit code 1; no JSON in the answer (\"\")",
        "[NvramProbe] sweep done: 1 of 2 .nv files give values in game_state.scores; without: bk_l4.nv.",
    ]);
    assert.match(fake.readFile(`${PROBE_FOLDER}\\all\\done.txt`), /1 of 2/);
    assert.ok(fake.readFile(`${PROBE_FOLDER}\\all\\afm_113.nv.json`).includes("Player 1"));

    await play(AFM, { nvWritten: ["afm_113"] });
    fake.advanceTime(5 * 1000);
    const playRuns = nvramRuns().slice(2);
    assert.equal(playRuns.length, 2);
    assert.match(playRuns[0], /\\plays\\[0-9-]+ play 1\\before\\afm_113\.nv$/);
    assert.match(playRuns[1], /\\plays\\[0-9-]+ play 1\\after\\afm_113\.nv$/);
    assert.deepEqual(probeLog().slice(-5), [
        `[NvramProbe] play 1, launch of "${AFM}" (ROM afm_113): afm_113.nv copied before the game.`,
        `[NvramProbe] play 1, "${AFM}": ended after 300 s; .nv changed: afm_113.nv.`,
        `[NvramProbe] play 1, "${AFM}", before the game, afm_113.nv: scores [1000, 0]; player_count 1; game_over outside the NVRAM; tilted false`,
        `[NvramProbe] play 1, "${AFM}", after the game, afm_113.nv: scores [2000, 0]; player_count 1; game_over outside the NVRAM; tilted false`,
        `[NvramProbe] play 1, "${AFM}", values changed in afm_113.nv besides game_state: audits.Earnings.Games Started: 7 -> 8`,
    ]);
    assert.ok(fake.readFile(`${PROBE_FOLDER}\\probe.log`).includes("after the game"));
    assertNoErrorLogged(fake);
});
