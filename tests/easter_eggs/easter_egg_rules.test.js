// ============================================================
// The Easter Egg rules alone, with an injected random source, on the fake
// PinballY host: the chance, the Profile's daily draw and win, its memory,
// the busy checks and the draw a scenario may replace.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createEasterEggRules, getEasterEggRules, setEasterEggDraw, EASTER_EGG } from "../../common/easter_eggs/easter_egg_rules.js";
import { createWheelDialogs } from "../../common/core/wheel_dialog.js";

const NOVEMBER_9 = new Date(2026, 10, 9, 20, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const LEFTOVER_DAILY_FILE = `${PROFILES}\\easter_egg_day.json`;
// Below 1 in 200: the draw wins.
const WINNING = () => 0;
const CROW = EASTER_EGG.CROW;
const OPEN_SCREEN = () => ({ isOpen: () => true, onClosed() {} });

function rulesOn(fake, { random = WINNING, busy = {} } = {}) {
    const store = createProfileStore(fake);
    const state = { dialogsIdle: true, overlayOpen: false, hasToasts: false, ...busy };
    const rules = createEasterEggRules(fake, {
        profileStore: store,
        wheelDialogs: { isIdle: () => state.dialogsIdle, isOverlayOpen: () => state.overlayOpen },
        achievementToasts: { hasToasts: () => state.hasToasts },
        // null: the host's own random source.
        ...(random ? { random } : {}),
    });
    return { rules, store, state };
}

function start(options = {}) {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    return { fake, ...rulesOn(fake, options) };
}

const ALL_FIVE = Object.values(EASTER_EGG);
const FUNNY_ONES = [EASTER_EGG.CROW, EASTER_EGG.MANEKI_NEKO, EASTER_EGG.ROCKET];
const JUST_BELOW = chance => chance - 1e-9;

function startAsChild(options = {}) {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFile(`${PROFILES}\\Kid\\profile.json`, JSON.stringify({ version: 1, isChild: true }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Kid" }));
    return { fake, ...rulesOn(fake, options) };
}

test("a draw wins any of the five 1 time in 200", () => {
    for (const name of ALL_FIVE) {
        assert.equal(start({ random: () => JUST_BELOW(1 / 200) }).rules.tryWin(name), true, name);
        assert.equal(start({ random: () => 1 / 200 }).rules.tryWin(name), false, name);
    }
});

test("a Child Profile wins the Crow, the Maneki-neko and the Rocket 3 times in 200, the other two 1 time in 200", () => {
    for (const name of ALL_FIVE) {
        const chance = FUNNY_ONES.includes(name) ? 3 / 200 : 1 / 200;
        assert.equal(startAsChild({ random: () => JUST_BELOW(chance) }).rules.tryWin(name), true, name);
        assert.equal(startAsChild({ random: () => chance }).rules.tryWin(name), false, name);
    }
});

test("a lost draw means no other draw of that Easter Egg for the Profile until the next local day, even after a restart", () => {
    let draws = 0;
    const random = () => { draws++; return 0.99; };
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    const { rules } = rulesOn(fake, { random });
    assert.equal(rules.tryWin(CROW), false);
    assert.equal(rules.tryWin(CROW), false);
    assert.equal(draws, 1, "a single draw that day");
    assert.equal(rules.tryWin(EASTER_EGG.ROCKET), false);
    assert.equal(draws, 2, "each Easter Egg has its own draw");
    assert.equal(rulesOn(fake, { random }).rules.tryWin(CROW), false);
    assert.equal(draws, 2, "a restart gives no second draw");
    fake.setNow(new Date(2026, 10, 10, 0, 1, 0));
    rules.tryWin(CROW);
    assert.equal(draws, 3, "a new local day");
});

test("another Profile gets its own draw of that Easter Egg the same day", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFolder(`${PROFILES}\\Alice`);
    const drawnFor = [];
    const { rules, store } = rulesOn(fake, { random: () => { drawnFor.push(store.getActiveProfile().name); return 0.99; } });
    rules.tryWin(CROW);
    store.switchTo("Alice");
    rules.tryWin(CROW);
    store.switchTo("guest");
    rules.tryWin(CROW);
    assert.deepEqual(drawnFor, ["guest", "Alice"]);
});

test("the day of each Easter Egg's last draw is kept for the Profile, next to its Easter Eggs", () => {
    const { rules, store } = start({ random: () => 0.99 });
    rules.tryWin(CROW);
    assert.deepEqual(store.getProfileData().surprises, { easterEggDraws: { crow: "2026-11-09" } });
});

test("after a Profile wins an Easter Egg, it wins no other that day; another Profile still can", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFolder(`${PROFILES}\\Alice`);
    let draws = 0;
    const { rules, store } = rulesOn(fake, { random: () => { draws++; return 0; } });
    assert.equal(rules.tryWin(CROW), true);
    assert.equal(rules.tryWin(EASTER_EGG.ROCKET), false);
    assert.equal(draws, 1, "its day taken: no draw at all");
    store.switchTo("Alice");
    assert.equal(rules.tryWin(EASTER_EGG.ROCKET), true, "Alice's own day");
    store.switchTo("guest");
    fake.setNow(new Date(2026, 10, 10, 0, 1, 0));
    assert.equal(rules.tryWin(EASTER_EGG.ROCKET), true, "a new local day");
});

test("a moment that stops before the draw does not use up the day's draw", () => {
    let draws = 0;
    const { rules, state } = start({ random: () => { draws++; return 0.99; }, busy: { hasToasts: true } });
    rules.tryWin(CROW);
    assert.equal(draws, 0);
    assert.equal(rules.isDrawDue(CROW), true, "still due");
    state.hasToasts = false;
    rules.tryWin(CROW);
    assert.equal(draws, 1, "the next moment draws instead");
    assert.equal(rules.isDrawDue(CROW), false);
});

test("no draw is due for an Easter Egg the Profile already has, nor on a day it already won one", () => {
    const { fake, rules } = start();
    assert.equal(rules.isDrawDue(CROW), true);
    rules.tryWin(CROW);
    assert.equal(rules.isDrawDue(EASTER_EGG.ROCKET), false, "its day is taken");
    fake.setNow(new Date(2026, 10, 10, 0, 1, 0));
    assert.equal(rules.isDrawDue(CROW), false, "already had");
    assert.equal(rules.isDrawDue(EASTER_EGG.ROCKET), true);
});

test("a leftover cabinet file of the former one a day changes nothing", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFile(LEFTOVER_DAILY_FILE, JSON.stringify({ version: 1, day: "2026-11-09" }));
    const { rules } = rulesOn(fake);
    assert.equal(rules.tryWin(CROW), true);
    assert.equal(fake.readFile(LEFTOVER_DAILY_FILE), JSON.stringify({ version: 1, day: "2026-11-09" }), "neither read nor written");
});

test("by default the draw comes from the host, whose fake never wins, so that no other scenario meets an Easter Egg", () => {
    assert.equal(start({ random: null }).rules.tryWin(CROW), false);
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.random = WINNING;
    assert.equal(rulesOn(fake, { random: null }).rules.tryWin(CROW), true);
});

test("the screen an Easter Egg plays over does not make the wheel busy, any other one does", () => {
    const menus = OPEN_SCREEN();
    function rulesWith(...otherScreens) {
        const fake = createFakePinballYHost({ now: NOVEMBER_9 });
        const wheelDialogs = createWheelDialogs(fake, menus);
        for (const screen of otherScreens) wheelDialogs.waitFor(screen);
        return createEasterEggRules(fake, { profileStore: createProfileStore(fake), wheelDialogs, achievementToasts: { hasToasts: () => false }, random: WINNING });
    }
    assert.equal(rulesWith().tryWin(CROW), false, "an open menu is busy for what does not play over it");
    assert.equal(rulesWith().tryWin(CROW, { over: menus }), true);
    assert.equal(rulesWith(OPEN_SCREEN()).tryWin(CROW, { over: menus }), false, "another screen is still open");
});

test("a won Easter Egg is recorded for the active Profile before it plays, and a Profile never gets it twice", () => {
    const { fake, rules, store } = start();
    assert.equal(rules.tryWin(CROW), true);
    assert.deepEqual(store.getProfileData().surprises.easterEggs, { crow: true }, "recorded as soon as it is won");
    fake.advanceTime(2 * 24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin(CROW), false, "never twice, even days later");
});

test("a Profile that already had an Easter Egg draws nothing", () => {
    let draws = 0;
    const { fake, rules } = start({ random: () => { draws++; return 0; } });
    rules.tryWin(CROW);
    const drawsAfterWin = draws;
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin(CROW), false);
    assert.equal(draws, drawsAfterWin, "no draw at all");
});

test("the day of the win survives a restart", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    rulesOn(fake).rules.tryWin(CROW);
    assert.equal(rulesOn(fake).rules.tryWin(EASTER_EGG.ROCKET), false);
});

test("Guest can win", () => {
    const { rules, store } = start();
    assert.equal(store.getActiveProfile().isGuest, true);
    assert.equal(rules.tryWin(CROW), true);
});

test("a Child Profile can win", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFile(`${PROFILES}\\Kid\\profile.json`, JSON.stringify({ version: 1, isChild: true }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Kid" }));
    const { rules, store } = rulesOn(fake);
    assert.equal(store.isChild("Kid"), true);
    assert.equal(rules.tryWin(CROW), true);
});

test("a Profile Reset gives the chance back", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFolder(`${PROFILES}\\Alice`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    const { rules, store } = rulesOn(fake);
    rules.tryWin(CROW);
    store.resetProfile("Alice");
    fake.setNow(new Date(2026, 10, 10, 20, 0, 0));
    assert.equal(rules.tryWin(CROW), true);
});

for (const [what, busy] of [
    ["a Dialog is shown or waiting", { dialogsIdle: false }],
    ["a screen is drawn over the wheel", { overlayOpen: true }],
    ["a toast is shown or waiting", { hasToasts: true }],
]) {
    test(`nothing is drawn while ${what}`, () => {
        const { rules, store, state } = start({ busy });
        assert.equal(rules.tryWin(CROW), false);
        assert.equal(store.getProfileData().surprises, undefined);
        Object.assign(state, { dialogsIdle: true, overlayOpen: false, hasToasts: false });
        assert.equal(rules.tryWin(CROW), true, "free again");
    });
}

test("nothing is drawn during a game", () => {
    const { fake, rules } = start();
    const table = { id: 1, configId: "Table", title: "Table" };
    fake.gameStarted(table);
    assert.equal(rules.tryWin(CROW), false);
});

test("the draw is told which Easter Egg it is for, so a scenario can make one win and leave the others to the chance", () => {
    const winsForTheCrow = name => (name === CROW ? 0 : 0.99);
    assert.equal(start({ random: winsForTheCrow }).rules.tryWin(CROW), true);
    assert.equal(start({ random: winsForTheCrow }).rules.tryWin(EASTER_EGG.ROCKET), false);
});

test("the shared rules draw from the host until a scenario replaces their draw, and nothing else wins them an Easter Egg", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    const rules = getEasterEggRules();
    assert.equal(rules.tryWin(CROW), false, "the fake host never wins");
    // The Crow's draw of the day is used up.
    fake.setNow(new Date(2026, 10, 10, 20, 0, 0));
    setEasterEggDraw(name => (name === CROW ? 0 : 0.99));
    assert.equal(rules.tryWin(EASTER_EGG.ROCKET), false);
    assert.equal(rules.tryWin(CROW), true);
    setEasterEggDraw(null);
});

test("an Easter Egg counts as played once it has finished, and the listeners are told", () => {
    const { rules } = start();
    const finished = [];
    rules.onFinished(name => finished.push(name));
    assert.equal(rules.hasPlayed(CROW), false, "not won yet");
    rules.tryWin(CROW);
    assert.equal(rules.hasPlayed(CROW), false, "not while it plays");
    rules.finish(CROW);
    assert.equal(rules.hasPlayed(CROW), true);
    assert.deepEqual(finished, [CROW]);
});

test("an Easter Egg goes on playing for its Achievement whichever check comes meanwhile, and a Surprises write keeps its flag", () => {
    const { rules, store } = start();
    rules.tryWin(CROW);
    store.updateProfileData(data => { data.surprises = { ...data.surprises, nightOwl: true }; });
    assert.equal(rules.hasPlayed(CROW), false);
    assert.deepEqual(store.getProfileData().surprises, {
        easterEggDraws: { crow: "2026-11-09" }, easterEggs: { crow: true }, easterEggWonDay: "2026-11-09", nightOwl: true,
    });
});

test("an Easter Egg won in an earlier session counts as played", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    rulesOn(fake).rules.tryWin(CROW);
    assert.equal(rulesOn(fake).rules.hasPlayed(CROW), true);
});

test("an Easter Egg that cannot play is neither won nor recorded", () => {
    const { rules, store, fake } = start();
    assert.equal(rules.tryWin(CROW, { canPlay: () => false }), false);
    assert.deepEqual(store.getProfileData().surprises, { easterEggDraws: { crow: "2026-11-09" } }, "only its draw is used up");
    fake.setNow(new Date(2026, 10, 10, 0, 1, 0));
    assert.equal(rules.tryWin(EASTER_EGG.ROCKET), true, "the day stayed free");
});
