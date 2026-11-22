// ============================================================
// The History Import from Manage profiles as Drawn Menus, through main.js on
// the fake PinballY globals: an Admin Profile hands PinballY's history to
// another Profile after a confirmation on "No", its warning in gold; the outcome names what was
// added. The line is greyed for Guest, when nothing is left, and once done
// on every Profile, even after a Profile Reset of the one that received it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, drawnMenuLines, readDrawnMenu, highlightedEntry, squeezed, press, openOperatorMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const readProfile = name => JSON.parse(fake.readFile(profileFile(name)));

const MEDIEVAL = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false,
    playCount: 12, playTime: 18000, lastPlayed: new Date(2026, 5, 1, 21, 30, 0),
};
const MARS = {
    id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", isHidden: false,
    playCount: 3, playTime: 3600, lastPlayed: new Date(2026, 4, 2, 10, 0, 0),
};

const fake = createFakePinballYHost({ now: new Date(2026, 10, 21, 20, 0, 0), tables: [MEDIEVAL, MARS] });
let TEXT;
let GUEST;
let store;

test("setup", async () => {
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({
        version: 1, plays: { [MEDIEVAL.configId]: { count: 2, seconds: 300, lastPlayed: "2026-11-20T21:00:00" } },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus"].includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    TEXT = lang.profileReset;
    GUEST = lang.profiles.guestName;
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
    press(fake, "Exit");
    chooseEntry(fake, TEXT.cancel);
    assert.ok(!isDrawnMenuShown(fake));
}

const historyRow = () => readDrawnMenu(fake).rows.find(row => row.title === TEXT.historyLine);

test("the line sits just before Reset, greyed on Guest with its reason", () => {
    openProfileMenu(GUEST);
    assert.deepEqual(drawnMenuLines(fake).slice(-3), [TEXT.historyLine, TEXT.reset, TEXT.back]);
    assert.equal(historyRow().reason, TEXT.historyRefusals.guest);
    assert.ok(!drawnMenuLines(fake).includes(TEXT.initialsLine(null)), "no Initials line with the High Scores Add-on off");
    closeProfileMenu();
});

test("the line is greyed when the Profiles already counted everything PinballY did", () => {
    fake.setTables([{ ...MEDIEVAL, playCount: 2, playTime: 300 }]);
    try {
        openProfileMenu("Bob");
        assert.equal(historyRow().reason, TEXT.historyRefusals.nothingLeft);
        chooseEntry(fake, TEXT.historyLine);
        assert.equal(readDrawnMenu(fake).rows[0].title, "Bob".toUpperCase(), "choosing it changes nothing");
        closeProfileMenu();
    } finally {
        fake.setTables([MEDIEVAL, MARS]);
    }
});

test("less than an hour left to take over counts as one hour, never zero", () => {
    fake.setTables([{ ...MEDIEVAL, playCount: 3, playTime: 1500 }]);
    try {
        openProfileMenu("Bob");
        chooseEntry(fake, TEXT.historyLine);
        assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.historyConfirm("Bob", 1, 1, 1) + TEXT.historyWarning));
        press(fake, "Select");
        assert.ok(!isDrawnMenuShown(fake), "No closes");
    } finally {
        fake.setTables([MEDIEVAL, MARS]);
    }
});

test("the confirmation names the Profile and what would be added, on No, which writes nothing", () => {
    const bobBefore = fake.readFile(profileFile("Bob"));
    openProfileMenu("Bob");
    assert.equal(historyRow().reason, undefined, "offered to Bob");
    chooseEntry(fake, TEXT.historyLine);
    const { message, messageGold } = readDrawnMenu(fake);
    assert.equal(message, `${TEXT.historyConfirm("Bob", 13, 6, 2)}\n${TEXT.historyWarning}`, "the warning on its own line");
    assert.deepEqual(messageGold, [TEXT.historyWarning], "in gold");
    assert.deepEqual(drawnMenuLines(fake), [TEXT.historyYes, TEXT.no]);
    assert.equal(highlightedEntry(fake), TEXT.no);
    press(fake, "Select");
    assert.ok(!isDrawnMenuShown(fake), "No closes");
    assert.equal(fake.readFile(profileFile("Bob")), bobBefore);
});

test("Yes adds the history to the Profile's totals and tells what was taken over", () => {
    openProfileMenu("Bob");
    chooseEntry(fake, TEXT.historyLine);
    chooseEntry(fake, TEXT.historyYes);

    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.historyDone("Bob", 13, 6, 2)));
    assert.deepEqual(drawnMenuLines(fake), [TEXT.ok]);
    assert.deepEqual(store.getPlaysOf("Bob"), {
        [MEDIEVAL.configId]: { count: 12, seconds: 18000, lastPlayed: "2026-11-20T21:00:00" },
        [MARS.configId]: { count: 3, seconds: 3600, lastPlayed: "2026-05-02T10:00:00" },
    });
    assert.match(readProfile("Bob").historyImport.date, /^2026-11-21T20:00:\d\d$/, "recorded with its date");
    press(fake, "Select");
    assert.ok(!isDrawnMenuShown(fake), "OK closes");
});

test("once done, the line is greyed on every Profile, naming the one that received it, even after its Profile Reset", () => {
    const done = TEXT.historyRefusals.done("Bob");
    for (const name of ["Bob", "Alice", GUEST]) {
        openProfileMenu(name);
        assert.equal(historyRow().reason, done, name);
        closeProfileMenu();
    }

    store.resetProfile("Bob");
    assert.deepEqual(store.getPlaysOf("Bob"), {});
    for (const name of ["Bob", "Alice"]) {
        openProfileMenu(name);
        assert.equal(historyRow().reason, done, `${name}, after Bob's Profile Reset`);
        const before = fake.readFile(profileFile(name));
        chooseEntry(fake, TEXT.historyLine);
        assert.equal(readDrawnMenu(fake).rows[0].title, name.toUpperCase(), "choosing it changes nothing");
        assert.equal(fake.readFile(profileFile(name)), before);
        closeProfileMenu();
    }
    assertNoErrorLogged(fake);
});
