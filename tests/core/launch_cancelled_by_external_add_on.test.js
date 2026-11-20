// ============================================================
// A launch an External Add-on cancels before the pack, through main.js on
// the fake globals: the Rocket never takes it, even with its draw won; the
// Backglass Clock never shows; High Scores reads and copies nothing; the
// vpxtool runner keeps reading the Table ROMs queue. Nothing is announced,
// and a launch the Add-on lets through behaves as usual.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { winTheDrawOf } from "../easter_eggs/winning_draw.js";
import { ROCKET_IMAGES, NAVIGATION_SOUND, rocketLayers, launchFromWheel } from "../easter_eggs/rocket_scenario.js";
import { fakeVpxtool, table, VPXTOOL, NVRAM_FOLDER, NVRAM_REGISTRY_KEY } from "../table_roms/table_roms_scenario.js";

const AFM = "Attack from Mars (Bally 1995)";
const ROMLESS = ["Medieval Madness (Williams 1997)", "Theatre of Magic (Bally 1995)", "Twilight Zone (Bally 1993)"];
const TABLES = [table(AFM, { rom: "afm_113b" }), ...ROMLESS.map(configId => table(configId))]
    .map((game, index) => ({ ...game, id: index + 1, audioVolume: 80 }));
const STARTUP_DELAY_MS = 10 * 1000;
// The --version run and its poll, before the first table.
const VERSION_READ_MS = 500;
// Long enough for a 100 ms run and its next poll.
const ONE_READ_MS = 1000;
const BOARD = ["HIGHEST SCORES", "1) SLL 52000000", ""];

test("a launch an External Add-on cancels before the pack is no launch for the pack", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 17, 20, 0, 0), tables: TABLES, monitorCount: 2 });
    fake.setWheelTables(TABLES.map(table => table.configId));
    for (const path of [...ROCKET_IMAGES, NAVIGATION_SOUND, NAVIGATION_SOUND.replace("Next.wav", "Prev.wav")]) fake.addFile(path);
    for (const table of TABLES) fake.addFile(table.gameFile, "vpx");
    fake.setRegistryValue(NVRAM_REGISTRY_KEY, NVRAM_FOLDER);
    fake.addFolder(NVRAM_FOLDER);
    fake.addFile(`${NVRAM_FOLDER}\\afm_113b.nv`, "nvram", { modified: new Date(2026, 0, 1) });
    const romnames = fakeVpxtool(Object.fromEntries(TABLES.map(table => [table.gameFile, { output: `${table.rom ?? "rom"}\n`, durationMs: 100 }])));
    fake.addProgram(VPXTOOL, args => (args[0] === "nvram" ? { output: "" } : romnames(args)));
    fake.setNvramBoard(AFM, BOARD);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["backglassClock", "highScores", "tableRoms", "easterEggs"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    const { toastDrawings } = await import("../achievements/achievement_toast_reader.js");
    await winTheDrawOf("rocket");
    // The External Add-on, imported before the pack.
    let cancelling = true;
    globalThis.mainWindow.on("prelaunch", ev => { if (cancelling) ev.preventDefault(); });
    let boardRequests = 0;
    globalThis.mainWindow.on("highscoresrequest", () => { boardRequests++; });
    await import("../../main.js");
    await settle();
    fake.advanceTime(STARTUP_DELAY_MS + VERSION_READ_MS + 200);
    await settle();

    const [clock] = fake.mediaWindows();
    const clockCalls = clock.calls().length;
    const scriptsRead = () => fake.programRuns().filter(run => run.args[0] === "romname").length;
    const readBefore = scriptsRead();
    const copies = () => fake.fileOperations().filter(operation => operation.operation === "copy").length;
    const afm = fake.getGameInfo(AFM);

    launchFromWheel(fake, afm);
    assert.equal(clock.isVisible(), false, "the Backglass Clock never shows");
    await settle();
    fake.advanceTime(ONE_READ_MS);
    await settle();
    assert.deepEqual(fake.launches(), [], "the launch stays cancelled");
    assert.equal(rocketLayers(fake).length, 0, "the Rocket never starts, its draw won");
    assert.equal(clock.calls().length, clockCalls, "the Backglass Clock window is never touched");
    assert.equal(boardRequests, 0, "High Scores reads no board");
    assert.equal(copies(), 0, "nor copies the .nv");
    assert.ok(scriptsRead() > readBefore, "the vpxtool runner keeps reading the queue");
    assert.deepEqual(fake.shownMenus(), [], "no Dialog");
    assert.deepEqual(toastDrawings(fake), [], "no toast");

    // The Add-on lets the next launch through: it behaves as usual.
    cancelling = false;
    await winTheDrawOf("");
    launchFromWheel(fake, afm);
    assert.equal(clock.isVisible(), true, "the Backglass Clock shows");
    await settle();
    assert.deepEqual(fake.launches(), [afm]);
    assert.equal(boardRequests, 1, "High Scores reads the board");
    assert.equal(copies(), 1, "and copies the .nv");

    // The Rocket's draw won on a launch let through: it does start, so it was the cancel that stopped it.
    fake.gameStarted(afm);
    fake.gameOver(afm);
    await settle();
    await winTheDrawOf("rocket");
    launchFromWheel(fake, afm);
    await settle();
    assert.ok(rocketLayers(fake).length > 0, "the Rocket starts");
    assert.deepEqual(fake.launches(), [afm], "in place of the launch");
    assertNoErrorLogged(fake);
});
