// ============================================================
// The Wheel Mark module on its own, on the fake host, with a fake mark: shown
// on the selected table; hidden with no table, during a game and in attract
// mode; shown again on the return to the wheel; following the Attract
// Order's moves, a Profile switch and a refresh, in the order marks register,
// and only from start(), after the listeners installed before it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { createWheelMarks } from "../../common/core/wheel_marks.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";

const TABLES = [{ configId: "afm", title: "Attack from Mars" }, { configId: "mm", title: "Medieval Madness" }];

// A fake host, the module over a fake Attract Order and Profile store, and
// what one fake mark was told, in order.
function start() {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 18, 20, 0, 0), tables: TABLES });
    const moveListeners = [];
    const switchListeners = [];
    const attractOrder = { onMove: listener => { moveListeners.push(listener); } };
    const profileStore = { onSwitch: listener => { switchListeners.push(listener); } };
    const marks = createWheelMarks(fake, { attractOrder, profileStore });
    const told = [];
    const handle = marks.register("Test", {
        show: (game, { returned }) => told.push(`show ${game.configId}${returned ? " (returned)" : ""}`),
        hide: ({ returned }) => told.push(`hide${returned ? " (returned)" : ""}`),
    });
    marks.start();
    // The Attract Order's move: the wheel turned by a script, no "gameselect".
    const attractMove = offset => {
        fake.setWheelGame(offset, { animate: true });
        for (const listener of moveListeners) listener(fake.getCurrentTable());
    };
    const switchProfile = () => { for (const listener of switchListeners) listener(); };
    return { fake, marks, told, handle, attractMove, switchProfile };
}

test("shown on the selected table at registration, then on each of the player's moves", () => {
    const { fake, told } = start();
    assert.deepEqual(told, ["show afm"]);
    fake.moveWheel(1);
    assert.deepEqual(told, ["show afm", "show mm"]);
    assertNoErrorLogged(fake);
});

test("hidden with no table selected", () => {
    const { fake, told } = start();
    fake.setWheelTables([]);
    fake.moveWheel(0);
    assert.deepEqual(told.slice(1), ["hide"]);
    assertNoErrorLogged(fake);
});

test("hidden during a game, whatever moves meanwhile, and shown again on the return to the wheel", async () => {
    const { fake, told, switchProfile } = start();
    const [afm] = fake.getAllTables();
    fake.playGame(afm);
    fake.gameStarted(afm);
    assert.deepEqual(told.slice(1), ["hide"]);
    switchProfile();
    assert.deepEqual(told.slice(1), ["hide", "hide"], "a Profile switch during the game leaves it hidden");
    fake.gameOver(afm);
    await settle();
    assert.deepEqual(told.slice(1), ["hide", "hide", "show afm (returned)"]);
    assertNoErrorLogged(fake);
});

test("a return to the wheel with no table hides it, told as a return", () => {
    const { fake, told } = start();
    fake.setWheelTables([]);
    fake.openMainMenu();
    fake.closeMenu();
    assert.deepEqual(told.slice(1), ["hide (returned)"]);
    assertNoErrorLogged(fake);
});

test("hidden in attract mode, through the Attract Order's moves, and shown on the table attract mode ended on", async () => {
    const { fake, told, attractMove } = start();
    fake.enterAttractMode();
    fake.advanceTime(1);
    await settle();
    assert.deepEqual(told.slice(1), ["hide"]);
    attractMove(1);
    assert.deepEqual(told.slice(1), ["hide", "hide"]);
    fake.exitAttractMode();
    assert.deepEqual(told.slice(1), ["hide", "hide", "show mm (returned)"]);
    assertNoErrorLogged(fake);
});

test("an attract mode a drawn screen holds off hides nothing", async () => {
    const { fake, told } = start();
    fake.one("attractmodestart", ev => ev.preventDefault());
    fake.enterAttractMode();
    fake.advanceTime(1);
    await settle();
    assert.deepEqual(told, ["show afm"]);
    assertNoErrorLogged(fake);
});

test("follows the Attract Order's moves, a Profile switch and a refresh", () => {
    const { fake, told, handle, attractMove, switchProfile } = start();
    attractMove(1);
    switchProfile();
    handle.refresh();
    assert.deepEqual(told, ["show afm", "show mm", "show mm", "show mm"]);
    assertNoErrorLogged(fake);
});

test("listens only from start(): a listener installed before it, after the registration, hears first", () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 18, 20, 0, 0), tables: TABLES });
    const marks = createWheelMarks(fake, { attractOrder: { onMove: () => {} }, profileStore: { onSwitch: () => {} } });
    const heard = [];
    marks.register("Test", { show: game => heard.push(`mark ${game.configId}`), hide: () => heard.push("hide") });
    fake.onGameListEvent("gameselect", ev => heard.push(`listener ${ev.game.configId}`));
    marks.start();
    fake.moveWheel(1);
    assert.deepEqual(heard, ["mark afm", "listener mm", "mark mm"]);
    assertNoErrorLogged(fake);
});

test("marks are told in the order they register, and one that fails is logged without stopping the next", () => {
    const { fake, marks } = start();
    // safeHandler logs through PinballY's globals; never uninstalled: node
    // --test runs each test file in its own process, and this test is the last.
    fake.installGlobals();
    const told = [];
    marks.register("Broken", { show: () => { throw new Error("boom"); }, hide: () => {} });
    marks.register("Second", { show: game => told.push(`second ${game.configId}`), hide: () => {} });
    fake.moveWheel(1);
    assert.deepEqual(told, ["second afm", "second mm"]);
    assert.equal(errorLines(fake).filter(line => line.includes("[Broken]")).length, 2);
});
