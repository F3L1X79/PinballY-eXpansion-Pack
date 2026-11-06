// ============================================================
// Manage profiles as Drawn Menus, through main.js on the fake PinballY
// globals: an Admin Profile picks a Profile, flips its Child mark from that
// Profile's menu (file and value, the cursor kept), and goes back to the
// list on Exit or Back. The Child line is greyed with its reason on an
// Admin Profile and on Guest, and Select on it changes nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, drawnMenuLines, readDrawnMenu, highlightedEntry, press, openOperatorMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "drawnMenus"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const readProfile = name => JSON.parse(fake.readFile(profileFile(name)));

const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
let TEXT;
let GUEST;

test("setup", async () => {
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1, randomGames: 3 }));
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
    getProfileStore().switchTo("Alice");
});

function openProfileMenu(name) {
    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
    chooseEntry(fake, name);
}

const childRow = () => readDrawnMenu(fake).rows.find(row => [TEXT.childLine(false), TEXT.childLine(true)].includes(row.title));

test("Manage profiles opens the list, then the Profile's menu with its name as a heading", () => {
    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
    assert.deepEqual(drawnMenuLines(fake), [
        `[${TEXT.listTitle.toUpperCase()}]`, "---", GUEST, "Alice", "Bob", "---", TEXT.everyProfile, "---", TEXT.cancel,
    ]);
    chooseEntry(fake, "Bob");

    assert.equal(fake.currentMenu(), null, "no native menu");
    assert.deepEqual(drawnMenuLines(fake), ["[BOB]", "---", TEXT.adminLine(false), TEXT.childLine(false), "---", TEXT.reset, TEXT.back]);
    assert.equal(highlightedEntry(fake), TEXT.adminLine(false));
});

test("choosing the Child line marks the Profile at once, the cursor staying on it, and again clears it", () => {
    press(fake, "Next");
    press(fake, "Select");

    assert.equal(readProfile("Bob").isChild, true);
    assert.equal(readProfile("Bob").randomGames, 3, "nothing else changes");
    assert.ok(isDrawnMenuShown(fake), "the menu stays");
    assert.deepEqual(drawnMenuLines(fake), ["[BOB]", "---", TEXT.adminLine(false), TEXT.childLine(true), "---", TEXT.reset, TEXT.back]);
    assert.equal(highlightedEntry(fake), TEXT.childLine(true));

    press(fake, "Select");
    assert.ok(!("isChild" in readProfile("Bob")), "a cleared mark leaves no key");
    assert.equal(highlightedEntry(fake), TEXT.childLine(false));
});

test("Exit and Back in a Profile's menu go back to the list, on that Profile", () => {
    press(fake, "Exit");
    assert.equal(readDrawnMenu(fake).rows[0].title, TEXT.listTitle.toUpperCase());
    assert.equal(highlightedEntry(fake), "Bob");

    chooseEntry(fake, "Bob");
    chooseEntry(fake, TEXT.back);
    assert.equal(highlightedEntry(fake), "Bob");
    chooseEntry(fake, TEXT.cancel);
    assert.ok(!isDrawnMenuShown(fake));
});

test("the Child line is greyed on an Admin Profile and on Guest, and Select on it changes nothing", () => {
    openProfileMenu("Alice");
    assert.deepEqual(childRow(), { kind: "entry", title: TEXT.childLine(false), mark: null, reason: TEXT.refusals.removeAdminMarkFirst });
    const aliceBefore = fake.readFile(profileFile("Alice"));
    press(fake, "Next");
    press(fake, "Select");
    assert.equal(fake.readFile(profileFile("Alice")), aliceBefore);
    assert.equal(highlightedEntry(fake), TEXT.childLine(false), "the menu stays as it was");
    press(fake, "Exit");

    chooseEntry(fake, GUEST);
    assert.deepEqual(childRow(), { kind: "entry", title: TEXT.childLine(false), mark: null, reason: TEXT.refusals.guestNeverMarked });
    press(fake, "Next");
    press(fake, "Select");
    assert.ok(!("isChild" in readProfile("guest")));
    press(fake, "Exit");
    chooseEntry(fake, TEXT.cancel);
    assertNoErrorLogged(fake);
});
