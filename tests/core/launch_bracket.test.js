// ============================================================
// The Launch Bracket on its own, on the fake host: each launch it lets
// through is told as one "began" and exactly one "ended", whether the game
// runs, fails, or a later script cancels it; a launch an earlier script
// cancelled is told to no one; a launch taken over is told to no
// subscriber, nor to any later "prelaunch" listener.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { createLaunchBracket } from "../../common/core/launch_bracket.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";

const TABLES = [{ configId: "afm", title: "Attack from Mars" }, { configId: "mm", title: "Medieval Madness" }];

// A fake host, its bracket, and what one subscriber heard, in order.
function start() {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 17, 20, 0, 0), tables: TABLES });
    const bracket = createLaunchBracket(fake);
    const heard = [];
    bracket.subscribe("Test", {
        onBegan: launch => heard.push(`began ${launch.game.configId}${bracket.isUnderWay() ? "" : " (not under way)"}`),
        onEnded: launch => heard.push(`ended ${launch.game.configId}${launch.cancelled ? " (cancelled)" : ""}${bracket.isUnderWay() ? " (still under way)" : ""}`),
    });
    const [afm, mm] = fake.getAllTables();
    return { fake, bracket, heard, afm, mm };
}

test("a game that runs: began at the launch, ended once at its end", async () => {
    const { fake, bracket, heard, afm } = start();
    fake.playGame(afm);
    assert.deepEqual(heard, ["began afm"]);
    fake.advanceTime(1);
    assert.deepEqual(heard, ["began afm"], "its overlay showed: the launch goes ahead");
    fake.gameStarted(afm);
    assert.equal(bracket.isUnderWay(), true);
    fake.gameOver(afm);
    await settle();
    assert.deepEqual(heard, ["began afm", "ended afm"]);
    assert.equal(bracket.isUnderWay(), false);
    assertNoErrorLogged(fake);
});

test("a launch that fails: ended once, at its error", async () => {
    const { fake, heard, afm } = start();
    let heardAtError = null;
    fake.on("launcherror", () => { heardAtError = [...heard]; });
    fake.playGame(afm);
    fake.launchError(afm);
    await settle();
    assert.deepEqual(heardAtError, ["began afm", "ended afm"]);
    assert.deepEqual(heard, ["began afm", "ended afm"], "nothing more at its \"postlaunch\"");
    assertNoErrorLogged(fake);
});

test("a launch a later script cancels: ended a tick later, as cancelled", async () => {
    const { fake, bracket, heard, afm } = start();
    fake.one("prelaunch", ev => ev.preventDefault());
    fake.playGame(afm);
    assert.deepEqual(heard, ["began afm"]);
    // The fake host's own timers, a zero delay included, wait for advanceTime().
    fake.advanceTime(1);
    assert.deepEqual(heard, ["began afm", "ended afm (cancelled)"]);
    assert.equal(bracket.isUnderWay(), false);
    assertNoErrorLogged(fake);
});

test("a launch an earlier script cancelled: no taker and no subscriber hears of it", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 17, 20, 0, 0), tables: TABLES });
    // An External Add-on registers before the pack's bracket.
    let cancelling = true;
    fake.on("prelaunch", ev => { if (cancelling) ev.preventDefault(); });
    const bracket = createLaunchBracket(fake);
    const heard = [];
    bracket.subscribe("Test", { onBegan: launch => heard.push(`began ${launch.game.configId}`), onEnded: launch => heard.push(`ended ${launch.game.configId}`) });
    const offered = [];
    bracket.offerTakeover("Taker", ev => { offered.push(ev.game.configId); return () => {}; });
    const [afm] = fake.getAllTables();

    fake.playGame(afm);
    assert.equal(bracket.isUnderWay(), false);
    fake.advanceTime(1);
    await settle();
    assert.deepEqual(fake.launches(), [], "the launch stays cancelled");
    assert.deepEqual(offered, []);
    assert.deepEqual(heard, []);

    cancelling = false;
    fake.playGame(afm);
    assert.deepEqual(offered, ["afm"], "the next launch is offered as usual");
    assertNoErrorLogged(fake);
});

test("a launch taken over: no subscriber and no later \"prelaunch\" listener hears of it", async () => {
    const { fake, bracket, heard, afm, mm } = start();
    const started = [];
    bracket.offerTakeover("Taker", ev => (ev.game.configId === "afm" ? () => started.push(ev.game.configId) : null));
    let heardByLaterListener = 0;
    fake.on("prelaunch", () => { heardByLaterListener++; });

    fake.playGame(afm);
    await settle();
    assert.deepEqual(fake.launches(), [], "the launch is cancelled");
    assert.deepEqual(started, ["afm"]);
    assert.deepEqual(heard, []);
    assert.equal(heardByLaterListener, 0);
    assert.equal(bracket.isUnderWay(), false);

    fake.playGame(mm);
    assert.deepEqual(heard, ["began mm"], "a launch the taker turns down goes ahead");
    assert.equal(heardByLaterListener, 1);
    assertNoErrorLogged(fake);
});

test("a new launch before the last one ended: the last one ends first, as cancelled", async () => {
    const { fake, heard, afm, mm } = start();
    fake.playGame(afm);
    fake.fire("prelaunch", { game: mm, command: fake.getBuiltInCommand("PlayGame") });
    fake.fire("launchoverlayshow", { game: mm });
    fake.advanceTime(1);
    fake.fire("postlaunch", { game: mm });
    assert.deepEqual(heard, ["began afm", "ended afm (cancelled)", "began mm", "ended mm"]);
    assertNoErrorLogged(fake);
});

test("a subscriber that fails stops neither the others nor the pairs", async () => {
    const { fake, bracket, heard, afm } = start();
    // Handler errors are logged through PinballY's globals.
    fake.installGlobals();
    const later = [];
    bracket.subscribe("Failing", { onBegan: () => { throw new Error("boom"); }, onEnded: () => { throw new Error("boom"); } });
    bracket.subscribe("Later", { onBegan: () => later.push("began"), onEnded: () => later.push("ended") });
    fake.playGame(afm);
    fake.gameStarted(afm);
    fake.gameOver(afm);
    await settle();
    assert.deepEqual(heard, ["began afm", "ended afm"]);
    assert.deepEqual(later, ["began", "ended"]);
    assert.equal(errorLines(fake).filter(line => line.includes("[Failing]")).length, 2);
});
