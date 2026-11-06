// ============================================================
// The Admin line of Manage profiles as Drawn Menus, through main.js on the
// fake PinballY globals: an Admin Profile marks another Profile, which then
// gets the setup entries, and clears that mark; clearing its own mark with
// another admin left closes the menus. The line is greyed with its reason
// on a Child Profile, on Guest and on the last Admin Profile.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, drawnMenuLines, readDrawnMenu, highlightedEntry, press, openExitMenu, openOperatorMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "drawnMenus"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const OPERATOR_MENU = "Operator Menu";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const readProfile = name => JSON.parse(fake.readFile(profileFile(name)));

const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
let TEXT;
let GUEST;
let store;

test("setup", async () => {
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1 }));
    fake.addFile(profileFile("Kid"), JSON.stringify({ version: 1, isChild: true }));
    fake.addFile(profileFile("guest"), JSON.stringify({ version: 1 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
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

function menuLines(open) {
    open(fake);
    const lines = drawnMenuLines(fake);
    press(fake, "Exit");
    return lines;
}

const adminRow = () => readDrawnMenu(fake).rows.find(row => [TEXT.adminLine(false), TEXT.adminLine(true)].includes(row.title));

test("a Profile's menu shows the Admin line above the Child line", () => {
    openProfileMenu("Bob");
    assert.deepEqual(drawnMenuLines(fake), ["[BOB]", "---", TEXT.adminLine(false), TEXT.childLine(false), "---", TEXT.reset, TEXT.back]);
    assert.equal(highlightedEntry(fake), TEXT.adminLine(false));
});

test("choosing the Admin line marks the Profile at once, the cursor staying on it, and again clears it", () => {
    press(fake, "Select");
    assert.equal(readProfile("Bob").isAdmin, true);
    assert.ok(isDrawnMenuShown(fake), "the menu stays");
    assert.equal(highlightedEntry(fake), TEXT.adminLine(true));
    assert.equal(readDrawnMenu(fake).rows.find(row => row.title === TEXT.childLine(false)).reason, TEXT.refusals.removeAdminMarkFirst);

    press(fake, "Select");
    assert.ok(!("isAdmin" in readProfile("Bob")), "a cleared mark leaves no key");
    assert.equal(highlightedEntry(fake), TEXT.adminLine(false));

    press(fake, "Select");
    assert.equal(readProfile("Bob").isAdmin, true);
    closeProfileMenu();
});

test("the newly marked Admin Profile gets the setup entries and Manage profiles", () => {
    store.switchTo("Bob");
    assert.ok(menuLines(openExitMenu).includes(OPERATOR_MENU));
    assert.ok(menuLines(openOperatorMenu).includes(TEXT.menuEntry));
    store.switchTo("Alice");
});

test("the Admin line is greyed on a Child Profile and on Guest, and Select on it changes nothing", () => {
    openProfileMenu("Kid");
    assert.deepEqual(adminRow(), { kind: "entry", title: TEXT.adminLine(false), mark: null, reason: TEXT.refusals.removeChildMarkFirst });
    const kidBefore = fake.readFile(profileFile("Kid"));
    press(fake, "Select");
    assert.equal(fake.readFile(profileFile("Kid")), kidBefore);
    assert.equal(highlightedEntry(fake), TEXT.adminLine(false), "the menu stays as it was");
    press(fake, "Exit");

    chooseEntry(fake, GUEST);
    assert.deepEqual(adminRow(), { kind: "entry", title: TEXT.adminLine(false), mark: null, reason: TEXT.refusals.guestNeverMarked });
    press(fake, "Select");
    assert.ok(!("isAdmin" in readProfile("guest")));
    closeProfileMenu();
});

test("clearing its own Admin mark, with another admin left, closes the menus and takes the entries away", () => {
    openProfileMenu("Alice");
    assert.equal(highlightedEntry(fake), TEXT.adminLine(true));
    press(fake, "Select");

    assert.ok(!("isAdmin" in readProfile("Alice")));
    assert.ok(!isDrawnMenuShown(fake), "the menus close");
    assert.equal(fake.currentMenu(), null);
    assert.ok(!menuLines(openExitMenu).includes(OPERATOR_MENU));
    assert.ok(!menuLines(openOperatorMenu).includes(TEXT.menuEntry), "not even from the service button");
});

test("the last Admin Profile's Admin line is greyed, and Select on it changes nothing", () => {
    store.switchTo("Bob");
    openProfileMenu("Bob");
    assert.deepEqual(adminRow(), { kind: "entry", title: TEXT.adminLine(true), mark: null, reason: TEXT.refusals.lastAdmin });
    press(fake, "Select");
    assert.equal(readProfile("Bob").isAdmin, true);
    assert.ok(isDrawnMenuShown(fake));
    closeProfileMenu();
    assertNoErrorLogged(fake);
});
