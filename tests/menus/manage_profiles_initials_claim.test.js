// ============================================================
// Saving a Profile's Initials from Manage profiles claims the Default Scores
// bearing them, through main.js on the fake globals with the High Scores and
// the Achievements on: a confirmation counts the places and tables ("No"
// changes nothing), a closing Dialog gives the figures or that none bears
// them yet; no toast for the active Profile nor for another.
// - A claim that cannot be saved writes nothing, the Initials put back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { OPEN_OVER_MS, readDrawnMenu, drawnMenuLines, highlightedEntry, squeezed, press as pressMenu, openOperatorMenu, chooseEntry, isDrawnMenuShown } from "../drawn_menu/drawn_menu_reader.js";
import { NAME_ENTRY_OPEN_MS, press, moveTo, enterName } from "../profiles/name_entry_scenario.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";

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
// Default Scores bearing FEL on both tables (one a Table Record), SLL's
// Table Record on Attack from Mars, and a Play's place of Bob bearing FEL.
const BOARDS = {
    [MM.configId]: { board: [place(1, "FEL", 9000, null), place(2, "LED", 8000, null), place(3, "FEL", 7000, "Bob")] },
    [AFM.configId]: { board: [place(1, "SLL", 6000, null), place(2, "fel ", 5000, null)] },
};
// Every toast submitted so far has had its time on screen.
const ALL_TOASTS_MS = 18000;

const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0), tables: [MM, AFM] });
let TEXT;
let OK;
let store;
let highScores;

test("setup", async () => {
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    for (const name of ["Bob", "Carol"]) fake.addFile(profileFile(name), JSON.stringify({ version: 1 }));
    fake.addFile(HIGH_SCORES_FILE, JSON.stringify({ version: 1, tables: BOARDS, highScores: [] }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus", "highScores", "achievements"].includes(key);
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
    await waitForToasts();
});

async function waitForToasts() {
    await settle();
    fake.advanceTime(ALL_TOASTS_MS);
    await settle();
}

const allToasts = () => toastDrawings(fake).map(drawing => drawing.texts.join(" | "));
const ownersOn = configId => highScores.boardOf(configId).map(({ owner }) => (owner ? owner.name : null));

// From the Operator Menu to the Profile's Initials, entered and OK'd on Name Entry.
function enterInitials(name, initials) {
    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
    chooseEntry(fake, name);
    chooseEntry(fake, TEXT.initialsLine(null));
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
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

test("after OK, a confirmation counts the places and tables the Initials would take; No changes nothing", () => {
    const files = [HIGH_SCORES_FILE, profileFile("Bob")].map(path => fake.readFile(path));
    enterInitials("Bob", "FEL");

    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsConfirm("Bob", "FEL", 2, 2)));
    assert.deepEqual(drawnMenuLines(fake), [TEXT.initialsYes, TEXT.no]);
    assert.equal(highlightedEntry(fake), TEXT.no);
    pressMenu(fake, "Select");

    assert.equal(highlightedEntry(fake), TEXT.initialsLine(null), "the Profile's menu again, on its line");
    assert.equal(store.getInitialsOf("Bob"), null, "the Initials are not saved");
    assert.deepEqual([HIGH_SCORES_FILE, profileFile("Bob")].map(path => fake.readFile(path)), files);
    closeProfileMenu();
});

test("Yes saves and claims another Profile's places, says how many, and announces nothing until after its pick", async () => {
    enterInitials("Bob", "FEL");
    chooseEntry(fake, TEXT.initialsYes);

    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsDone("Bob", "FEL", 2, 2)));
    assert.deepEqual(drawnMenuLines(fake), [TEXT.ok]);
    assert.equal(store.getInitialsOf("Bob"), "FEL");
    assert.deepEqual(ownersOn(MM.configId), ["Bob", null, "Bob"]);
    assert.deepEqual(ownersOn(AFM.configId), [null, "Bob"]);
    assert.ok(fake.logLines().some(line => line.includes(`"${MM.configId}": place 1, 9000 (FEL) taken by the Initials FEL for Bob.`)), "each claim logged");
    chooseEntry(fake, TEXT.ok);
    assert.equal(highlightedEntry(fake), TEXT.initialsLine("FEL"), "OK goes back to the Profile's menu");
    closeProfileMenu();

    await waitForToasts();
    assert.deepEqual(allToasts(), [], "no toast while Alice is active");
    store.switchTo("Bob");
    await waitForToasts();
    assert.deepEqual(allToasts(), [], "no toast when Bob is picked");
    assert.ok(store.getNotifiedOf("Bob").includes("highScoreTables:1"), "what the claim reached is Notified");
    assert.ok(store.getNotifiedOf("Bob").includes("tableRecordTables:1"));
    store.switchTo("Alice");
    await waitForToasts();
});

test("the active Profile's own claim announces nothing either", async () => {
    enterInitials("Alice", "SLL");
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsConfirm("Alice", "SLL", 1, 1)));
    chooseEntry(fake, TEXT.initialsYes);
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsDone("Alice", "SLL", 1, 1)));
    chooseEntry(fake, TEXT.ok);
    closeProfileMenu();

    await waitForToasts();
    assert.deepEqual(allToasts(), []);
    assert.ok(store.getNotifiedOf("Alice").includes("tableRecordTables:1"), "unlocked, Notified without a toast");
    assert.equal(store.isUnannouncedCheckDue("Alice"), false);
});

test("Initials no place bears yet are saved, and the closing Dialog says so", () => {
    enterInitials("Carol", "XYZ");
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsConfirm("Carol", "XYZ", 0, 0)));
    chooseEntry(fake, TEXT.initialsYes);
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsDoneNone("Carol", "XYZ")));
    assert.equal(store.getInitialsOf("Carol"), "XYZ");
    chooseEntry(fake, TEXT.ok);
    closeProfileMenu();
    assertNoErrorLogged(fake);
});

test("a claim that cannot be saved shows the failure text and writes nothing", () => {
    const highScoresBefore = fake.readFile(HIGH_SCORES_FILE);
    store.clearInitials("Carol");
    const carolCleared = fake.readFile(profileFile("Carol"));
    fake.lockFile(HIGH_SCORES_FILE);
    try {
        enterInitials("Carol", "LED");
        chooseEntry(fake, TEXT.initialsYes);
        assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.initialsFailed("Carol")));
    } finally {
        fake.unlockFile(HIGH_SCORES_FILE);
    }
    assert.equal(store.getInitialsOf("Carol"), null, "the Initials are given back");
    assert.equal(fake.readFile(profileFile("Carol")), carolCleared);
    assert.equal(fake.readFile(HIGH_SCORES_FILE), highScoresBefore);
    assert.deepEqual(ownersOn(MM.configId), ["Bob", null, "Bob"]);
    assert.equal(errorLines(fake).length, 1, "the cause is logged");
    chooseEntry(fake, TEXT.ok);
    closeProfileMenu();
});
