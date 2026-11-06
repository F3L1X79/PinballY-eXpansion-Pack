// ============================================================
// Drawn Screen controls tests on the fake host: how a press is routed to
// the opening on top, held buttons, getting ready, children set aside and
// given up, attract mode, and each screen's isOpen() and onClosed().
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createDrawnScreenControls, isHeldSelectLaunchOrExit } from "../../common/core/drawn_screen_controls.js";

function setUp() {
    const fake = createFakePinballYHost({});
    const controls = createDrawnScreenControls(fake);
    return { fake, controls };
}

const press = (fake, command, repeat = false) => fake.fire("commandbuttondown", { command, repeat });

// A screen recording what each of its handlers was asked, as name lines.
function recordingScreen(controls, name, calls) {
    const screen = controls.register(name);
    return {
        screen,
        open(extra = {}, options = {}) {
            return screen.open({
                onMove: direction => calls.push(`${name} move ${direction}`),
                onChoose: () => calls.push(`${name} choose`),
                onExit: () => calls.push(`${name} exit`),
                close: () => calls.push(`${name} close`),
                setAside: () => calls.push(`${name} setAside`),
                showAgain: () => calls.push(`${name} showAgain`),
                ...extra,
            }, options);
        },
    };
}

test("a ready opening hears moves, choices and its exit; every press is swallowed", () => {
    const { fake, controls } = setUp();
    const calls = [];
    recordingScreen(controls, "A", calls).open().ready();
    const events = ["Next", "Prev", "Select", "Launch", "Exit", "NextPage"].map(command => press(fake, command));
    assert.deepEqual(calls, ["A move 1", "A move -1", "A choose", "A choose", "A exit"]);
    assert.ok(events.every(ev => ev.defaultPrevented), "nothing reaches the wheel");
});

test("with no opening, or a press already handled, nothing acts nor is swallowed", () => {
    const { fake, controls } = setUp();
    const calls = [];
    const a = recordingScreen(controls, "A", calls);
    assert.equal(press(fake, "Select").defaultPrevented, false);
    a.open().ready();
    // A Drawn Menu's Select, say, which opened the screen within the same press.
    fake.fire("commandbuttondown", { command: "Select", repeat: false, defaultPrevented: true });
    assert.deepEqual(calls, []);
});

test("a held Select, Launch or Exit counts once; held flippers repeat", () => {
    const { fake, controls } = setUp();
    const calls = [];
    recordingScreen(controls, "A", calls).open().ready();
    for (const command of ["Select", "Launch", "Exit"]) assert.ok(press(fake, command, true).defaultPrevented, `held ${command} swallowed`);
    press(fake, "Next", true);
    press(fake, "Prev", true);
    assert.deepEqual(calls, ["A move 1", "A move -1"]);
    assert.ok(isHeldSelectLaunchOrExit({ command: "Exit", repeat: true }));
    assert.ok(!isHeldSelectLaunchOrExit({ command: "Exit", repeat: false }));
    assert.ok(!isHeldSelectLaunchOrExit({ command: "Next", repeat: true }));
});

test("while getting ready, only Exit acts", () => {
    const { fake, controls } = setUp();
    const calls = [];
    const opening = recordingScreen(controls, "A", calls).open();
    for (const command of ["Next", "Prev", "Select", "Launch"]) assert.ok(press(fake, command).defaultPrevented);
    assert.deepEqual(calls, []);
    press(fake, "Exit");
    assert.deepEqual(calls, ["A exit"]);
    opening.ready();
    press(fake, "Select");
    assert.deepEqual(calls, ["A exit", "A choose"]);
});

test("a choice that throws still swallows the press, and the error is logged", async t => {
    const { fake, controls } = setUp();
    // The safe handler logs through PinballY's logfile.
    t.after(fake.installGlobals());
    const calls = [];
    const a = recordingScreen(controls, "A", calls);
    a.open({ onChoose: () => { throw new Error("broken choice"); } }).ready();
    assert.ok(press(fake, "Select").defaultPrevented);
    assert.ok(fake.logLines().some(line => line.startsWith("[A] ERROR") && line.includes("broken choice")), "logged under the screen's name");

    // B on top of A, now the one to choose.
    const b = recordingScreen(controls, "B", calls);
    b.open({ onChoose: () => Promise.reject(new Error("broken random game")) }).ready();
    press(fake, "Select");
    await new Promise(resolve => setTimeout(resolve, 0));
    const rejected = fake.logLines().filter(line => line.includes("broken random game"));
    assert.equal(rejected.length, 1, "a rejected choice logged too, once");
    assert.ok(rejected[0].startsWith("[B] ERROR"), "under the screen's name");
});

test("a press acts once, on the top opening only, also when it opens or closes one", () => {
    const { fake, controls } = setUp();
    const calls = [];
    const b = recordingScreen(controls, "B", calls);
    let bOpening = null;
    let aOpening = null;
    const a = recordingScreen(controls, "A", calls);
    aOpening = a.open({
        onChoose: () => {
            calls.push("A choose");
            aOpening.openChild(onExit => {
                bOpening = b.open({ onExit: () => { calls.push("B exit"); bOpening.close(); onExit(); } });
                bOpening.ready();
            });
        },
    });
    aOpening.ready();
    press(fake, "Select");
    assert.deepEqual(calls, ["A choose", "A setAside"], "the new top does not hear the press that opened it");
    press(fake, "Exit");
    assert.deepEqual(calls.slice(2), ["B exit", "B close", "A showAgain"], "nor does the screen shown again");
    press(fake, "Exit");
    assert.deepEqual(calls.slice(5), ["A exit"]);
});

test("an opening set aside under a child outside the module takes no press and swallows none", () => {
    const { fake, controls } = setUp();
    const calls = [];
    const opening = recordingScreen(controls, "A", calls).open();
    opening.ready();
    let showAgain = null;
    opening.openChild(onExit => { showAgain = onExit; });
    assert.equal(press(fake, "Select").defaultPrevented, false, "left to the child's own listener");
    assert.deepEqual(calls, ["A setAside"]);
    showAgain();
    press(fake, "Next");
    assert.deepEqual(calls, ["A setAside", "A showAgain", "A move 1"]);
});

// The Profile Stats, the Household Stats, another Profile's Profile Stats.
function openChain(controls, calls) {
    const stats = recordingScreen(controls, "Stats", calls);
    const household = recordingScreen(controls, "Household", calls);
    const failures = [];
    const first = stats.open({}, { onFailed: () => failures.push("first") });
    first.ready();
    let second = null;
    let third = null;
    let backToFirst = null;
    let backToSecond = null;
    let thirdFailed = null;
    first.openChild((onExit, onFailed) => {
        backToFirst = onExit;
        second = household.open({}, { onFailed });
        second.ready();
    });
    second.openChild((onExit, onFailed) => {
        backToSecond = onExit;
        thirdFailed = onFailed;
        third = stats.open({ onMove: direction => calls.push(`Stats(read-only) move ${direction}`) }, { onFailed });
    });
    return { stats, household, failures, first, second, third, backToFirst, backToSecond, thirdFailed };
}

test("a three-level chain with one screen twice comes back level by level", () => {
    const { fake, controls } = setUp();
    const calls = [];
    const chain = openChain(controls, calls);
    chain.third.ready();
    calls.length = 0;
    press(fake, "Next");
    assert.deepEqual(calls, ["Stats(read-only) move 1"], "the top opening of the screen opened twice");
    assert.equal(chain.stats.screen.isOpen(), true);
    chain.third.close();
    chain.backToSecond();
    press(fake, "Next");
    chain.second.close();
    chain.backToFirst();
    press(fake, "Next");
    assert.deepEqual(calls.slice(1), ["Stats close", "Household showAgain", "Household move 1", "Household close", "Stats showAgain", "Stats move 1"]);
    assert.equal(chain.household.screen.isOpen(), false);
    assert.equal(chain.stats.screen.isOpen(), true, "the first opening still on");
});

test("a child that fails gives up the chain under it, what it was opened over included", () => {
    const { controls } = setUp();
    const calls = [];
    const chain = openChain(controls, calls);
    calls.length = 0;
    chain.third.fail();
    assert.deepEqual(calls, ["Stats close", "Household close", "Stats close"]);
    assert.deepEqual(chain.failures, ["first"]);
    assert.equal(chain.stats.screen.isOpen(), false);
    assert.equal(chain.household.screen.isOpen(), false);
});

test("a child that throws at once gives up the opening and its chain; the error goes on", () => {
    const { controls } = setUp();
    const calls = [];
    const failures = [];
    const opening = recordingScreen(controls, "A", calls).open({}, { onFailed: () => failures.push("A") });
    opening.ready();
    assert.throws(() => opening.openChild(() => { throw new Error("child broke"); }), /child broke/);
    assert.deepEqual(calls, ["A setAside", "A close"]);
    assert.deepEqual(failures, ["A"]);
});

test("a child that throws after its own opening took the stack leaves no opening to take the buttons", () => {
    const { fake, controls } = setUp();
    const calls = [];
    const opening = recordingScreen(controls, "A", calls).open();
    opening.ready();
    const b = recordingScreen(controls, "B", calls);
    assert.throws(() => opening.openChild(() => {
        b.open();
        throw new Error("child broke while drawing");
    }), /child broke/);
    assert.deepEqual(calls, ["A setAside", "B close", "A close"]);
    assert.equal(b.screen.isOpen(), false);
    assert.equal(press(fake, "Select").defaultPrevented, false, "nothing left to take the buttons");
});

test("attract mode closes every opening from the top, bringing nothing back", () => {
    const { fake, controls } = setUp();
    const calls = [];
    const chain = openChain(controls, calls);
    chain.third.ready();
    calls.length = 0;
    fake.fire("attractmodestart", {});
    assert.deepEqual(calls, ["Stats close", "Household close", "Stats close"]);
    assert.deepEqual(chain.failures, []);
    assert.equal(press(fake, "Select").defaultPrevented, false, "nothing left to take the buttons");
});

test("isOpen() holds while an opening of the screen is on, set aside included; onClosed() is told at each close", () => {
    const { controls } = setUp();
    const calls = [];
    const a = recordingScreen(controls, "A", calls);
    let closes = 0;
    a.screen.onClosed(() => { closes++; });
    assert.equal(a.screen.isOpen(), false);
    const opening = a.open();
    assert.equal(a.screen.isOpen(), true, "getting ready");
    assert.equal(a.screen.isShown(), true);
    opening.ready();
    opening.openChild(() => {});
    assert.equal(a.screen.isOpen(), true, "set aside");
    assert.equal(a.screen.isShown(), false);
    assert.equal(closes, 0, "setting aside closes nothing");
    opening.close();
    opening.close();
    assert.equal(a.screen.isOpen(), false);
    assert.equal(closes, 1, "told once");
});
