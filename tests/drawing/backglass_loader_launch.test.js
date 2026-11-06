// ============================================================
// The backglass comet through main.js with the Seamless Launch Overlay and
// Force Backglass: alone and centred while the table loads and closes (Exit
// Game, before loading, on its own, failed launch), off during a game and
// from a capture's "capturing" on; no button taken.
// - The fake host lists the backglass layers whether its window shows or not.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readLoader, readLoaderCaption, readBackglassLoader } from "../support/loader_reader.js";

const TABLE = { configId: "afm", title: "Attack from Mars" };
const fake = createFakePinballYHost({ now: new Date(2026, 10, 6, 20, 0, 0), tables: [TABLE] });
const game = fake.getAllTables()[0];

// The comet alone in the very middle of the backglass window, 7 % high.
function assertBackglassComet() {
    const comet = readBackglassLoader(fake);
    assert.equal(comet.shown, true, "the comet turns on the backglass");
    assert.deepEqual(comet.position, { x: 0, y: 0 }, "in the very middle");
    assert.deepEqual(comet.scale, { ySpan: 0.07 }, "7 % of the window's height");
    assert.equal(comet.otherLayers, 0, "no caption on the backglass");
}

function assertNoBackglassLayer() {
    assert.equal(fake.backglassDrawingLayers().length, 0, "no layer on the backglass");
}

// A button pressed while the comet turns: none of the pack's listeners takes it.
function assertButtonsPassThrough() {
    assert.equal(fake.fire("keydown", { key: "Enter", code: "Enter", repeat: false }).defaultPrevented, false, "a key goes through");
    assert.equal(fake.fire("command", { id: fake.getBuiltInCommand("PlayGame") }).defaultPrevented, false, "a command goes through");
}

test("the backglass comet turns from the launch until the game plays, and again from Exit Game until the overlay goes", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "seamlessLaunchOverlay" || key === "forceBackglass";
    await import("../../main.js");
    await settle();
    assertNoBackglassLayer();

    fake.playGame(game);
    assertBackglassComet();
    assertButtonsPassThrough();
    assert.equal(readLoader(fake).shown, true, "the playfield's comet turns too");

    fake.gameStarted(game);
    assertNoBackglassLayer();
    assert.deepEqual(fake.backglassShowCalls().slice(-1), [false], "Force Backglass hid the window");

    fake.runCommand(fake.getBuiltInCommand("KillGame"));
    assertBackglassComet();
    assertButtonsPassThrough();
    let checkedAtGameOver = false;
    fake.one("gameover", () => {
        assertBackglassComet();
        checkedAtGameOver = true;
    });
    let checkedAfterRunAfter = false;
    fake.one("runafterpost", () => {
        assertBackglassComet();
        checkedAfterRunAfter = true;
    });
    fake.gameOver(game);
    assert.ok(checkedAtGameOver, "there when Force Backglass shows the window again");
    assert.ok(checkedAfterRunAfter, "still there once the Run After step is done");
    assertNoBackglassLayer();
    assert.deepEqual(fake.backglassShowCalls(), [true, false, true], "Force Backglass shows, hides and shows the window as before");
    assertNoErrorLogged(fake);
});

test("Exit Game before the table has loaded keeps the backglass comet until the overlay goes", () => {
    fake.playGame(game);
    fake.runCommand(fake.getBuiltInCommand("KillGame"));
    assertBackglassComet();
    let checkedAfterRunAfter = false;
    fake.one("runafterpost", () => {
        assertBackglassComet();
        checkedAfterRunAfter = true;
    });
    fake.gameOver(game);
    assert.ok(checkedAfterRunAfter);
    assertNoBackglassLayer();
    assertNoErrorLogged(fake);
});

test("a table that closes on its own shows the backglass comet from its game-over message until the overlay goes", () => {
    fake.playGame(game);
    fake.gameStarted(game);
    assertNoBackglassLayer();
    let checkedAtGameOver = false;
    fake.one("gameover", () => {
        assertBackglassComet();
        checkedAtGameOver = true;
    });
    fake.gameOver(game);
    assert.ok(checkedAtGameOver, "ready when the window returns");
    assertNoBackglassLayer();
    assertNoErrorLogged(fake);
});

test("a failed launch removes the backglass comet when the overlay goes, and its second hide changes nothing", () => {
    fake.playGame(game);
    let checkedAtError = false;
    fake.one("launcherror", () => {
        assertBackglassComet();
        checkedAtError = true;
    });
    const afterEachHide = [];
    fake.on("launchoverlayhide", () => afterEachHide.push(fake.backglassDrawingLayers().length));
    fake.launchError(game);
    assert.ok(checkedAtError);
    assert.deepEqual(afterEachHide, [0, 0]);
    assertNoErrorLogged(fake);
});

test("during a media capture the backglass comet is off from the capturing message and back on the capture's game-over message", () => {
    fake.playGame(game);
    assertBackglassComet();
    fake.gameStarted(game, { capture: "single" });
    assertNoBackglassLayer();
    assert.equal(readLoader(fake).shown, true, "the playfield's comet still turns");
    assert.equal(readLoaderCaption(fake).text, "Capturing…", "with the capture's words");
    let checkedAtGameOver = false;
    fake.one("gameover", () => {
        assertBackglassComet();
        checkedAtGameOver = true;
    });
    fake.gameOver(game);
    assert.ok(checkedAtGameOver);
    assertNoBackglassLayer();
    assertNoErrorLogged(fake);
});
