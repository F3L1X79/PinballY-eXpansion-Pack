// ============================================================
// Table ROMs after launches that never become a game, through main.js on
// the fake PinballY globals: a launch cancelled at "prelaunch" and a launch
// that fails ("launcherror") each pause the script reading only until
// PinballY is back on the wheel, never for good.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startTableRoms, table, vpxFile } from "./table_roms_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";

const AFM = "Attack from Mars (Bally 1995)";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const TMNT = "Teenage Mutant Ninja Turtles (Data East 1991)";
const TABLES = [table(AFM), table(MEDIEVAL), table(TMNT)];
const STARTUP_DELAY_MS = 10 * 1000;
// The --version run and its poll, before the first table.
const VERSION_READ_MS = 500;
// Long enough for a 100 ms run and its next poll.
const ONE_READ_MS = 1000;

test("a cancelled launch and a failed launch do not leave the script reading paused", async () => {
    const { fake, roms, pendingRoms, log, scriptsRead } = await startTableRoms({
        tables: TABLES,
        files: Object.fromEntries(TABLES.map(game => [vpxFile(game.configId), {}])),
        vpxtool: { [vpxFile(AFM)]: "afm_113", [vpxFile(MEDIEVAL)]: "mm_109c", [vpxFile(TMNT)]: "tmnt_104" },
    });
    const played = fake.getAllTables().find(game => game.configId === AFM);

    // Another script cancels the launch: PinballY stays on the wheel.
    fake.advanceTime(STARTUP_DELAY_MS + VERSION_READ_MS + 200);
    fake.one("prelaunch", ev => ev.preventDefault());
    fake.playGame(played);
    assert.equal(fake.launches().length, 0, "nothing launched");
    await settle();
    fake.advanceTime(400);
    assert.deepEqual(scriptsRead(), [vpxFile(AFM), vpxFile(MEDIEVAL)], "the reading goes on after a cancelled launch");

    fake.playGame(played);
    await settle();
    fake.advanceTime(ONE_READ_MS);
    assert.deepEqual(scriptsRead(), [vpxFile(AFM), vpxFile(MEDIEVAL)], "paused while the launch is under way");
    fake.launchError(played);
    fake.advanceTime(ONE_READ_MS);

    assert.deepEqual(scriptsRead(), [vpxFile(AFM), vpxFile(MEDIEVAL), vpxFile(TMNT)], "the reading resumes after a failed launch");
    assert.deepEqual(roms(), { [AFM]: "afm_113", [MEDIEVAL]: "", [TMNT]: "" }, "the launch wrote the ROM read before it");
    assert.deepEqual(pendingRoms(), { [MEDIEVAL]: "mm_109c", [TMNT]: "tmnt_104" });
    assert.deepEqual(log().filter(line => line.includes("ERROR")), []);
});
