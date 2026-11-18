// ============================================================
// The Wheel Mark module on its own, on the fake host, with fake marks: shown
// on the selected table; hidden with no table, during a game and in attract
// mode; back on the return to the wheel; following the Attract Order's moves,
// a Profile switch and a refresh, only from start(); told in the top right
// stack's order, whose tops follow the pieces that registered.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { createWheelMarks } from "../../common/core/wheel_marks.js";
import { TOP_RIGHT_STACK, TOP_RIGHT_STACK_GAP, BADGE_HEIGHT } from "../../common/drawing/top_right_stack.js";
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

test("a mark that shows without a table is shown with none, and still hidden during a game", () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 18, 20, 0, 0), tables: TABLES });
    const marks = createWheelMarks(fake, { attractOrder: { onMove: () => {} }, profileStore: { onSwitch: () => {} } });
    const told = [];
    marks.register("Card", { showsWithoutTable: true, show: game => told.push(`show ${game ? game.configId : "none"}`), hide: () => told.push("hide") });
    marks.start();
    fake.setWheelTables([]);
    fake.moveWheel(0);
    const [afm] = fake.getAllTables();
    fake.playGame(afm);
    fake.gameStarted(afm);
    assert.deepEqual(told, ["show afm", "show none", "hide"]);
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

test("a Profile switch is told as one, and a hide says whether the wheel was left for a game or attract mode", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 18, 20, 0, 0), tables: TABLES });
    const switchListeners = [];
    const marks = createWheelMarks(fake, { attractOrder: { onMove: () => {} }, profileStore: { onSwitch: listener => { switchListeners.push(listener); } } });
    const told = [];
    const flags = context => Object.keys(context).filter(key => context[key]).join(",");
    marks.register("Test", {
        show: (game, context) => told.push(`show ${flags(context)}`),
        hide: context => told.push(`hide ${flags(context)}`),
    });
    marks.start();
    const switchProfile = () => { for (const listener of switchListeners) listener(); };
    switchProfile();
    fake.setWheelTables([]);
    fake.moveWheel(0);
    switchProfile();
    const [afm] = fake.getAllTables();
    fake.playGame(afm);
    fake.gameStarted(afm);
    switchProfile();
    fake.gameOver(afm);
    await settle();
    fake.enterAttractMode();
    fake.advanceTime(1);
    await settle();
    assert.deepEqual(told, ["show ", "show switched", "hide ", "hide switched",
        "hide wheelLeft", "hide switched,wheelLeft", "hide returned", "hide wheelLeft"]);
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

test("marks of the top right stack are told first, the Challenge Card, the Mastery Bar, then the Rating Plate, whatever order they register in", () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 18, 20, 0, 0), tables: TABLES });
    const marks = createWheelMarks(fake, { attractOrder: { onMove: () => {} }, profileStore: { onSwitch: () => {} } });
    const told = [];
    const piece = place => ({ place, margins: { top: 0, bottom: 0 }, height: () => 10 });
    const register = (name, topRight) => marks.register(name, { topRight, show: () => told.push(name), hide: () => {} });
    register("Guides", null);
    register("Plate", piece(TOP_RIGHT_STACK.RATING_PLATE));
    register("Bar", piece(TOP_RIGHT_STACK.MASTERY_BAR));
    register("Card", piece(TOP_RIGHT_STACK.CHALLENGE_CARD));
    assert.deepEqual(told, [], "nothing told before start()");
    marks.start();
    fake.moveWheel(1);
    assert.deepEqual(told, ["Card", "Bar", "Plate", "Guides", "Card", "Bar", "Plate", "Guides"]);
    assertNoErrorLogged(fake);
});

// The stack's tops, each piece giving its own sizes; places: which register.
function stackTops({ underBadge, places, cardHeight = () => 124 }) {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 18, 20, 0, 0), tables: TABLES });
    const marks = createWheelMarks(fake, { attractOrder: { onMove: () => {} }, profileStore: { onSwitch: () => {} }, underBadge });
    const pieces = {
        plate: { place: TOP_RIGHT_STACK.RATING_PLATE, margins: { top: 6, bottom: 10 }, height: () => 56 },
        card: { place: TOP_RIGHT_STACK.CHALLENGE_CARD, margins: { top: 8, bottom: 2 }, height: cardHeight },
        bar: { place: TOP_RIGHT_STACK.MASTERY_BAR, margins: { top: 14, bottom: 18 } },
    };
    const handles = places.map(name => [name, marks.register(name, { topRight: pieces[name], show: () => {}, hide: () => {} })]);
    marks.start();
    return Object.fromEntries(handles.map(([name, handle]) => [name, handle.top()]));
}

test("under the badge with the card, the plate rises beside the badge and the bar sits under the card", () => {
    assert.equal(BADGE_HEIGHT, 170);
    assert.equal(TOP_RIGHT_STACK_GAP, 24);
    // Registered bottom first: the order in main.js makes no difference.
    assert.deepEqual(stackTops({ underBadge: true, places: ["bar", "card", "plate"] }), { bar: 302, card: 170, plate: 108 });
});

test("a card with no Challenge takes no room: the bar rises to its place", () => {
    assert.deepEqual(stackTops({ underBadge: true, places: ["plate", "card", "bar"], cardHeight: () => null }), { plate: 108, card: 170, bar: 170 });
});

test("without the badge the plate tops the stack; without the card the bar sits under the plate", () => {
    assert.deepEqual(stackTops({ underBadge: false, places: ["plate", "card", "bar"] }), { plate: 0, card: 62, bar: 194 });
    assert.deepEqual(stackTops({ underBadge: true, places: ["plate", "bar"] }), { plate: 170, bar: 226 });
    assert.deepEqual(stackTops({ underBadge: true, places: ["bar"] }), { bar: 170 });
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
