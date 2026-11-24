// ============================================================
// A Profile's Initials from Manage profiles as Drawn Menus, through main.js
// on the fake PinballY globals: the "Initials" line between the marks and the
// History Import's line, greyed on Guest; Name Entry in its Initials mode
// (A-Z, erase and OK, three letters then OK alone with erase, refusals, pre-filled); OK then "Yes"
// saves, OK on nothing clears, Exit changes nothing; the Profile's menu shown again after.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { OPEN_OVER_MS, readDrawnMenu, drawnMenuLines, highlightedEntry, press as pressMenu, openOperatorMenu, chooseEntry, isDrawnMenuShown } from "../drawn_menu/drawn_menu_reader.js";
import {
    NAME_ENTRY_OPEN_MS, press, isNameEntryOpen, nameEntryTexts, nameShown, reasonShown, ringShown, ringLayers, colorOf, moveTo, enterName, eraseName, currentCharacter,
} from "../profiles/name_entry_scenario.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const ERASE_ARROW = String.fromCharCode(0x2190);

const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0) });
let TEXT;
let GUEST;
let OK;
// Name Entry's texts in its Initials mode.
let INITIALS;
let store;

test("setup", async () => {
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1 }));
    for (const sound of ["Next", "Prev"]) fake.addFile(`C:\\PinballY\\Assets\\Button Sounds\\${sound}.wav`);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus", "highScores"].includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    TEXT = lang.profileReset;
    GUEST = lang.profiles.guestName;
    OK = lang.profiles.nameEntry.ok;
    INITIALS = lang.profiles.nameEntry.initials;
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    store = getProfileStore();
    store.switchTo("Alice");
});

function openProfileMenu(name) {
    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
    chooseEntry(fake, name);
}

function closeProfileMenu() {
    pressMenu(fake, "Exit");
    chooseEntry(fake, TEXT.cancel);
    assert.ok(!isDrawnMenuShown(fake));
}

// Chooses the Profile's "Initials" line and lets Name Entry open.
function openInitials(name, current = null) {
    openProfileMenu(name);
    chooseEntry(fake, TEXT.initialsLine(current));
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    assert.equal(isNameEntryOpen(fake), true, "Name Entry opens");
}

// Presses the button on Name Entry, then lets the Drawn Menu shown after it open.
function pressAndLeave(button) {
    press(fake, button);
    fake.advanceTime(OPEN_OVER_MS);
}

// A character's alpha on the strip, next to the current one (which fades it by a fifth only).
const letterAlpha = character => ringLayers(fake).find(layer => layer.texts()[0] === character).alpha;
const okAlpha = () => letterAlpha(OK);

function chooseOk() {
    moveTo(fake, OK);
    pressAndLeave("Select");
}

test("the line sits between the marks and the History Import's line, greyed on Guest with its reason", () => {
    openProfileMenu("Bob");
    assert.deepEqual(drawnMenuLines(fake).slice(-7), [TEXT.childLine(false), TEXT.initialsLine(null), "---", TEXT.historyLine, TEXT.reset, TEXT.remove, TEXT.back]);
    closeProfileMenu();

    openProfileMenu(GUEST);
    const row = readDrawnMenu(fake).rows.find(candidate => candidate.title === TEXT.initialsLine(null));
    assert.equal(row.reason, TEXT.initialsRefusals.guest);
    chooseEntry(fake, TEXT.initialsLine(null));
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    assert.equal(isNameEntryOpen(fake), false, "choosing it opens nothing");
    closeProfileMenu();
});

test("Name Entry's Initials mode: its own title and lines, a ring of A-Z with erase and OK", () => {
    openInitials("Bob");
    assert.deepEqual(nameEntryTexts(fake), [INITIALS.title("Bob"), ...INITIALS.lines]);
    assert.equal(nameShown(fake), "");
    assert.deepEqual(ringShown(fake), ["Z", ERASE_ARROW, OK, "A", "B", "C", "D"], "no lower case nor hyphen");
    assert.equal(colorOf(fake, OK) === STEAMBALL_COLORS.dim, false, "OK on nothing clears: not greyed");

    enterName(fake, "F");
    assert.equal(currentCharacter(fake), "F", "the cursor stays on the letter chosen");
    enterName(fake, "E");
    assert.equal(reasonShown(fake), INITIALS.refusals.threeLetters);
    moveTo(fake, OK);
    assert.equal(colorOf(fake, OK), STEAMBALL_COLORS.dim, "OK is greyed on two letters");
    press(fake, "Select");
    assert.equal(isNameEntryOpen(fake), true, "OK does nothing on two letters");

    enterName(fake, "L");
    assert.equal(nameShown(fake), "FEL");
    assert.equal(reasonShown(fake), "");
    assert.equal(currentCharacter(fake), OK, "the third letter puts the cursor on OK");
    assert.ok(letterAlpha("A") < okAlpha() / 2, "the letters are greyed");
    press(fake, "Next");
    assert.equal(currentCharacter(fake), ERASE_ARROW, "Next skips the letters, to the erase arrow");
    press(fake, "Next");
    assert.equal(currentCharacter(fake), OK);
    press(fake, "Prev");
    assert.equal(currentCharacter(fake), ERASE_ARROW, "so does Prev");
    press(fake, "Select");
    assert.equal(nameShown(fake), "FE", "erasing gives the letters back");
    assert.ok(letterAlpha("Z") > okAlpha() / 2, "no longer greyed");
    press(fake, "Prev");
    assert.equal(currentCharacter(fake), "Z");
    enterName(fake, "L");
    assert.equal(currentCharacter(fake), OK);
    press(fake, "Select");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(isNameEntryOpen(fake), false, "OK closes Name Entry");
    // The claim's confirmation and closing Dialog: tests/menus/manage_profiles_initials_claim.test.js.
    chooseEntry(fake, TEXT.initialsYes);
    chooseEntry(fake, TEXT.ok);
    assert.equal(store.getInitialsOf("Bob"), "FEL");
    assert.equal(JSON.parse(fake.readFile(profileFile("Bob"))).initials, "FEL");
    assert.equal(highlightedEntry(fake), TEXT.initialsLine("FEL"), "the Profile's menu again, on its line");
    closeProfileMenu();
});

test("Initials another Profile holds are refused, naming it", () => {
    openInitials("Alice");
    enterName(fake, "FEL");
    assert.equal(reasonShown(fake), INITIALS.refusals.taken("Bob"));
    moveTo(fake, OK);
    assert.equal(colorOf(fake, OK), STEAMBALL_COLORS.dim);
    press(fake, "Select");
    assert.equal(isNameEntryOpen(fake), true, "OK does nothing");
    pressAndLeave("Exit");
    assert.equal(store.getInitialsOf("Alice"), null);
    closeProfileMenu();
});

test("the current Initials are pre-filled, and Exit leaves them unchanged", () => {
    const before = fake.readFile(profileFile("Bob"));
    openInitials("Bob", "FEL");
    assert.equal(nameShown(fake), "FEL");
    assert.equal(reasonShown(fake), "", "its own Initials are not taken");
    assert.equal(currentCharacter(fake), OK, "full Initials open on OK");
    eraseName(fake);
    pressAndLeave("Exit");
    assert.equal(isNameEntryOpen(fake), false);
    assert.equal(fake.readFile(profileFile("Bob")), before);
    assert.equal(highlightedEntry(fake), TEXT.initialsLine("FEL"), "the Profile's menu again, on its line");
    closeProfileMenu();
});

test("OK with nothing entered clears the Initials", () => {
    openInitials("Bob", "FEL");
    eraseName(fake);
    chooseOk();
    // The confirmation and the places given back: tests/menus/manage_profiles_initials_release.test.js.
    chooseEntry(fake, TEXT.initialsClearYes);
    assert.equal(store.getInitialsOf("Bob"), null);
    assert.equal(highlightedEntry(fake), TEXT.initialsLine(null));
    closeProfileMenu();
    assertNoErrorLogged(fake);
});
