// ============================================================
// The Easter Egg rules alone, with an injected random source, on the fake
// PinballY host: the chance, the daily limit of the cabinet, the per-Profile
// memory, the busy checks and the force option.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createEasterEggRules, EASTER_EGG } from "../../common/easter_eggs/easter_egg_rules.js";

const NOVEMBER_9 = new Date(2026, 10, 9, 20, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const DAILY_FILE = `${PROFILES}\\easter_egg_day.json`;
// Below 1 in 100: the draw wins.
const WINNING = () => 0;
const CROW = EASTER_EGG.CROW;

function rulesOn(fake, { random = WINNING, forced = "", busy = {} } = {}) {
    const store = createProfileStore(fake);
    const state = { dialogsIdle: true, overlayOpen: false, hasToasts: false, ...busy };
    const rules = createEasterEggRules(fake, {
        profileStore: store,
        wheelDialogs: { isIdle: () => state.dialogsIdle, isOverlayOpen: () => state.overlayOpen },
        achievementToasts: { hasToasts: () => state.hasToasts },
        // null: the host's own random source.
        ...(random ? { random } : {}),
        forced,
    });
    return { rules, store, state };
}

function start(options = {}) {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    return { fake, ...rulesOn(fake, options) };
}

test("a draw wins 1 time in 100", () => {
    assert.equal(start({ random: () => 0.0099 }).rules.tryWin(CROW), true);
    assert.equal(start({ random: () => 0.01 }).rules.tryWin(CROW), false);
});

test("by default the draw comes from the host, whose fake never wins, so that no other scenario meets an Easter Egg", () => {
    assert.equal(start({ random: null }).rules.tryWin(CROW), false);
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.random = WINNING;
    assert.equal(rulesOn(fake, { random: null }).rules.tryWin(CROW), true);
});

test("a won Easter Egg is recorded for the active Profile before it plays, and a Profile never gets it twice", () => {
    const { fake, rules, store } = start();
    assert.equal(rules.tryWin(CROW), true);
    assert.deepEqual(store.getProfileData().surprises.easterEggs, { crow: true }, "recorded as soon as it is won");
    fake.advanceTime(2 * 24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin(CROW), false, "never twice, even days later");
});

test("a Profile that already had an Easter Egg draws nothing, so the cabinet's one of the day stays free for another", () => {
    let draws = 0;
    const { fake, rules } = start({ random: () => { draws++; return 0; } });
    rules.tryWin(CROW);
    const drawsAfterWin = draws;
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin(CROW), false);
    assert.equal(draws, drawsAfterWin, "no draw at all");
    assert.equal(JSON.parse(fake.readFile(DAILY_FILE)).day, "2026-11-09", "the day stays the one of the win");
});

test("at most one Easter Egg a day for the whole cabinet, whichever Profile, until the next calendar day", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFolder(`${PROFILES}\\Alice`);
    const { rules, store } = rulesOn(fake);
    assert.equal(rules.tryWin(CROW), true, "Guest wins");
    store.switchTo("Alice");
    assert.equal(rules.tryWin(CROW), false, "Alice shares the cabinet's day");
    fake.setNow(new Date(2026, 10, 10, 0, 1, 0));
    assert.equal(rules.tryWin(CROW), true, "a new calendar day");
});

test("the daily limit survives a restart", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFolder(`${PROFILES}\\Alice`);
    const first = rulesOn(fake);
    first.rules.tryWin(CROW);
    first.store.switchTo("Alice");
    const restarted = rulesOn(fake);
    assert.equal(restarted.store.getActiveProfile().name, "Alice");
    assert.equal(restarted.rules.tryWin(CROW), false);
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

test("an unreadable daily file is logged, counts as no Easter Egg today, and the draw goes on", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    fake.addFile(DAILY_FILE, "{ cut short by a cra");
    const { rules, store } = rulesOn(fake);
    assert.equal(rules.tryWin(CROW), true);
    assert.deepEqual(store.getProfileData().surprises.easterEggs, { crow: true });
    assert.equal(JSON.parse(fake.readFile(DAILY_FILE)).day, "2026-11-09", "saved anew");
    assert.ok(fake.logLines().some(line => line.includes("easter_egg_day")), "logged");
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

test("the force option skips the chance and both limits for the named Easter Egg, never the busy checks", () => {
    const { fake, rules, state } = start({ random: () => 0.99, forced: CROW });
    assert.equal(rules.tryWin(CROW), true, "the chance skipped");
    assert.equal(rules.tryWin(CROW), true, "both limits skipped");
    state.hasToasts = true;
    assert.equal(rules.tryWin(CROW), false, "still not while busy");
    assert.equal(JSON.parse(fake.readFile(DAILY_FILE)).day, "2026-11-09");
});

test("the force option leaves the other Easter Eggs to the chance", () => {
    assert.equal(start({ random: () => 0.99, forced: "another" }).rules.tryWin(CROW), false);
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
    assert.deepEqual(store.getProfileData().surprises, { easterEggs: { crow: true }, nightOwl: true });
});

test("an Easter Egg won in an earlier session counts as played", () => {
    const fake = createFakePinballYHost({ now: NOVEMBER_9 });
    rulesOn(fake).rules.tryWin(CROW);
    assert.equal(rulesOn(fake).rules.hasPlayed(CROW), true);
});

test("an Easter Egg that cannot play is neither won nor recorded", () => {
    const { rules, store, fake } = start();
    assert.equal(rules.tryWin(CROW, { canPlay: () => false }), false);
    assert.equal(store.getProfileData().surprises, undefined);
    assert.equal(fake.files.fileExists(DAILY_FILE), false, "the day stays free");
});
