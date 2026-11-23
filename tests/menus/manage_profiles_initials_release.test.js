// ============================================================
// Changing or clearing a Profile's Initials from Manage profiles gives back
// the places the former Initials took, through main.js on the fake globals
// with the High Scores on: the confirmation counts them ("No" changes
// nothing), "Yes" makes them Default Scores again before the new Initials
// claim theirs. A place won in a Play stays its winner's.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { OPEN_OVER_MS, readDrawnMenu, drawnMenuLines, highlightedEntry, squeezed, press as pressMenu, openOperatorMenu, chooseEntry, isDrawnMenuShown } from "../drawn_menu/drawn_menu_reader.js";
import { NAME_ENTRY_OPEN_MS, press, moveTo, enterName, eraseName } from "../profiles/name_entry_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const HIGH_SCORES_FILE = `${PROFILES}\\high_scores.json`;
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const table = (id, title, manufacturer, year) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false,
});
const MM = table(1, "Medieval Madness", "Williams", 1997);
const AFM = table(2, "Attack from Mars", "Bally", 1995);
const place = (rank, initials, score, owner) => ({ rank, initials, score, owner });
// Default Scores bearing FEL and ABC, and Bob's place won in a Play bearing FEL.
const BOARDS = {
    [MM.configId]: { board: [place(1, "FEL", 9000, null), place(2, "ABC", 8000, null), place(3, "FEL", 7000, "Bob")] },
    [AFM.configId]: { board: [place(1, "SLL", 6000, null), place(2, "fel ", 5000, null)] },
};
const BOB_PLAY = {
    profile: "Bob", configId: MM.configId, score: 7000, initials: "FEL", place: 3, date: "2026-11-20T20:00:00", tableRecord: false, takenFrom: null,
};

const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0), tables: [MM, AFM] });
let TEXT;
let OK;
let store;
let highScores;

test("setup", async () => {
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    for (const name of ["Bob", "Carol"]) fake.addFile(profileFile(name), JSON.stringify({ version: 1 }));
    fake.addFile(HIGH_SCORES_FILE, JSON.stringify({ version: 1, tables: BOARDS, highScores: [BOB_PLAY] }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus", "highScores"].includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    TEXT = lang.profileReset;
    OK = lang.profiles.nameEntry.ok;
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const { getHighScoreStore } = await import("../../common/high_scores/high_score_store.js");
    await import("../../main.js");
    await settle();
    store = getProfileStore();
    highScores = getHighScoreStore();
    store.switchTo("Alice");
    store.setInitials("Bob", "FEL");
    highScores.claimInitialsPlaces("Bob");
});

const ownersOn = configId => highScores.boardOf(configId).map(({ owner }) => (owner ? owner.name : null));
const savedFiles = () => [HIGH_SCORES_FILE, profileFile("Bob")].map(path => fake.readFile(path));

// From the Operator Menu to the Profile's Initials, replaced by these ("" clears them) and OK'd on Name Entry.
function enterInitials(name, current, initials) {
    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
    chooseEntry(fake, name);
    chooseEntry(fake, TEXT.initialsLine(current));
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    eraseName(fake);
    enterName(fake, initials);
    moveTo(fake, OK);
    press(fake, "Select");
    fake.advanceTime(OPEN_OVER_MS);
}

function closeProfileMenu() {
    pressMenu(fake, "Exit");
    chooseEntry(fake, TEXT.cancel);
    assert.ok(!isDrawnMenuShown(fake));
}

test("changing them, the confirmation also counts the places given back; No changes nothing", () => {
    const files = savedFiles();
    enterInitials("Bob", "FEL", "ABC");

    assert.equal(readDrawnMenu(fake).message, `${TEXT.initialsConfirm("Bob", "ABC", 1, 1, 2)}\n\n- Medieval Madness`);
    assert.deepEqual(drawnMenuLines(fake), [TEXT.initialsYes, TEXT.no]);
    pressMenu(fake, "Select");

    assert.equal(highlightedEntry(fake), TEXT.initialsLine("FEL"));
    assert.deepEqual(savedFiles(), files);
    closeProfileMenu();
});

test("Yes gives back the places the former Initials took, then claims for the new ones", () => {
    enterInitials("Bob", "FEL", "ABC");
    chooseEntry(fake, TEXT.initialsYes);

    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsDone("Bob", "ABC", 1, 1)));
    assert.equal(store.getInitialsOf("Bob"), "ABC");
    assert.deepEqual(ownersOn(MM.configId), [null, "Bob", "Bob"], "the Play's place bearing FEL stays Bob's");
    assert.deepEqual(ownersOn(AFM.configId), [null, null]);
    assert.ok(fake.logLines().some(line => line.includes(`"${MM.configId}": place 1, 9000 (FEL) given back by Bob's former Initials, a Default Score again.`)));
    chooseEntry(fake, TEXT.ok);
    closeProfileMenu();
});

test("clearing them asks first, counting the places given back, and Yes gives them back", () => {
    const files = savedFiles();
    enterInitials("Bob", "ABC", "");
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsClearConfirm("Bob", "ABC", 1)));
    assert.deepEqual(drawnMenuLines(fake), [TEXT.initialsClearYes, TEXT.no]);
    pressMenu(fake, "Select");
    assert.deepEqual(savedFiles(), files, "No changes nothing");
    closeProfileMenu();

    enterInitials("Bob", "ABC", "");
    chooseEntry(fake, TEXT.initialsClearYes);

    assert.equal(highlightedEntry(fake), TEXT.initialsLine(null), "the Profile's menu again, on its line");
    assert.equal(store.getInitialsOf("Bob"), null);
    assert.deepEqual(ownersOn(MM.configId), [null, null, "Bob"]);
    closeProfileMenu();
});

test("OK on nothing for a Profile without Initials asks nothing", () => {
    const files = savedFiles();
    enterInitials("Carol", null, "");
    assert.equal(highlightedEntry(fake), TEXT.initialsLine(null));
    assert.deepEqual(savedFiles(), files);
    closeProfileMenu();
    assertNoErrorLogged(fake);
});
