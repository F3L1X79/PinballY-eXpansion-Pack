// ============================================================
// A held button over a Drawn Menu through main.js: a held Select, Launch or
// Exit counts once (a submenu or a Drawn Screen it opened left alone), held
// Next, Prev, NextPage and PrevPage keep moving, every press swallowed, and
// Exit over the pause menu kept open resumes the game once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    OPEN_OVER_MS, GLIDE_OVER_MS, isDrawnMenuShown, isAnythingDrawn, drawnMenuLines, highlightedEntry, press, openPauseMenu,
} from "./drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["drawnMenus"];
const TABLE = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness (Williams 1997)",
    manufacturer: "Williams", year: 1997, categories: [], playCount: 0, playTime: 0, lastPlayed: null, rating: 0, isHidden: false,
};
const PARENT_LINES = ["Open the submenu", "Open the screen", "First", "Second", "Third"];
const CHILD_LINES = ["Child first", "Child second", "Back"];

const fake = createFakePinballYHost({ now: new Date(2026, 9, 21, 20, 0, 0), tables: [TABLE] });
let COMMAND;
let drawnMenus;
let controls;
let TEST_COMMAND;
const screenCalls = [];
let screenOpening = null;

const runCount = cmd => fake.executedCommands().filter(id => id === cmd).length;
const hold = buttonCommand => {
    const ev = fake.fire("commandbuttondown", { command: buttonCommand, repeat: true });
    fake.advanceTime(GLIDE_OVER_MS);
    return ev;
};

function showParent() {
    drawnMenus().show("held parent", [
        { title: PARENT_LINES[0], cmd: TEST_COMMAND.openSubmenu, hasSubmenu: true },
        { title: PARENT_LINES[1], cmd: TEST_COMMAND.openScreen },
        { title: PARENT_LINES[2], cmd: TEST_COMMAND.first },
        { title: PARENT_LINES[3], cmd: TEST_COMMAND.second },
        { title: PARENT_LINES[4], cmd: TEST_COMMAND.third },
    ]);
    fake.advanceTime(OPEN_OVER_MS);
}

function showChild() {
    drawnMenus().show("held child", [
        { title: CHILD_LINES[0], cmd: TEST_COMMAND.childFirst },
        { title: CHILD_LINES[1], cmd: TEST_COMMAND.childSecond },
        { title: CHILD_LINES[2], cmd: COMMAND.MenuReturn },
    ], { onBack: showParent });
    fake.advanceTime(OPEN_OVER_MS);
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    await import("../../main.js");
    await settle();
    COMMAND = globalThis.command;
    TEST_COMMAND = Object.fromEntries(["openSubmenu", "openScreen", "first", "second", "third", "childFirst", "childSecond"]
        .map(name => [name, COMMAND.allocate(`heldTest_${name}`)]));
    ({ getDrawnMenus: drawnMenus } = await import("../../common/drawn_menu/drawn_menu.js"));
    const { getDrawnScreenControls } = await import("../../common/core/drawn_screen_controls.js");
    controls = getDrawnScreenControls().register("HeldTestScreen");
    fake.on("command", ev => {
        if (ev.id === TEST_COMMAND.openSubmenu) showChild();
        if (ev.id === TEST_COMMAND.openScreen) {
            screenOpening = controls.open({
                onMove: direction => screenCalls.push(`move ${direction}`),
                onChoose: () => screenCalls.push("choose"),
                onExit: () => screenCalls.push("exit"),
                close: () => screenCalls.push("close"),
            });
            screenOpening.ready();
        }
    });
});

test("a held Select or Launch chooses nothing, the press swallowed and the menu left open", () => {
    showParent();
    for (const button of ["Select", "Launch"]) {
        const commandsBefore = fake.executedCommands().length;
        assert.ok(hold(button).defaultPrevented, button);
        assert.ok(isDrawnMenuShown(fake), button);
        assert.equal(fake.executedCommands().length, commandsBefore, button);
    }
    press(fake, "Exit");
});

test("a held Select after the press that opened a submenu chooses nothing in it", () => {
    showParent();
    press(fake, "Select");
    assert.deepEqual(drawnMenuLines(fake), CHILD_LINES);
    const commandsBefore = fake.executedCommands().length;

    assert.ok(hold("Select").defaultPrevented);
    assert.ok(hold("Launch").defaultPrevented);
    assert.deepEqual(drawnMenuLines(fake), CHILD_LINES, "still the submenu");
    assert.equal(highlightedEntry(fake), CHILD_LINES[0]);
    assert.equal(fake.executedCommands().length, commandsBefore);
    drawnMenus().close();
});

test("a held Exit goes back one menu only", () => {
    showParent();
    press(fake, "Select");
    press(fake, "Exit");
    assert.deepEqual(drawnMenuLines(fake), PARENT_LINES, "back to the parent");

    assert.ok(hold("Exit").defaultPrevented);
    assert.ok(isDrawnMenuShown(fake), "the parent stays open");
    assert.deepEqual(drawnMenuLines(fake), PARENT_LINES);
    drawnMenus().close();
});

test("a held Exit closes a menu with nothing to go back to once", () => {
    showParent();
    press(fake, "Exit");
    assert.ok(!isDrawnMenuShown(fake));

    assert.ok(!hold("Exit").defaultPrevented, "the held press reaches the wheel, no menu to swallow it");
    assert.ok(!isDrawnMenuShown(fake));
});

test("a held Select after the press that opened a Drawn Screen chooses nothing on it", () => {
    showParent();
    press(fake, "Next");
    press(fake, "Select");
    assert.ok(!isDrawnMenuShown(fake));
    screenCalls.length = 0;

    hold("Select");
    hold("Exit");
    assert.deepEqual(screenCalls, []);
    screenOpening.close();
});

test("held Next, Prev, NextPage and PrevPage keep moving", () => {
    showParent();
    hold("Next");
    hold("Next");
    assert.equal(highlightedEntry(fake), PARENT_LINES[2]);
    assert.ok(hold("Prev").defaultPrevented);
    assert.equal(highlightedEntry(fake), PARENT_LINES[1]);
    assert.ok(hold("NextPage").defaultPrevented);
    assert.notEqual(highlightedEntry(fake), PARENT_LINES[1]);
    assert.ok(hold("PrevPage").defaultPrevented);
    assert.equal(highlightedEntry(fake), PARENT_LINES[0]);
    press(fake, "Exit");
});

// The press itself is drawn_menu_pause.test.js's; here, what its repeats add.
test("a held Exit over the pause menu kept open resumes the game no more than once, every repeat swallowed", async () => {
    fake.gameStarted(TABLE);
    openPauseMenu(fake);
    const resumedBefore = runCount(COMMAND.ResumeGame);
    const exit = fake.fire("commandbuttondown", { command: "Exit", repeat: false });
    const exitGame = fake.fire("commandbuttondown", { command: "ExitGame", repeat: false });
    const heldExit = hold("Exit");
    const heldExitGame = hold("ExitGame");

    assert.ok([exit, exitGame, heldExit, heldExitGame].every(ev => ev.defaultPrevented));
    await settle();
    assert.equal(runCount(COMMAND.ResumeGame), resumedBefore + 1);
    assert.equal(fake.currentMenu(), null);
    assert.ok(!isAnythingDrawn(fake));
});

test("no error was logged", () => {
    assertNoErrorLogged(fake);
});
