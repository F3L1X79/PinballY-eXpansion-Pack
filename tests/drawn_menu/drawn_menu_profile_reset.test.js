// ============================================================
// The Profile Reset menus as Drawn Menus, through main.js on the fake
// PinballY globals: the list, its title as a heading, opened from the
// drawn Operator Menu; from a Profile's "Reset", the confirmation, its question above "Yes" and "No",
// the cursor on "No"; the outcome with "OK". The Profile is reset as
// before, and "No", "Cancel" and "OK" close the menus.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, drawnMenuLines, readDrawnMenu, highlightedEntry, squeezed, press, openOperatorMenu, chooseEntry } from "./drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "drawnMenus"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

const fake = createFakePinballYHost({ now: new Date(2026, 9, 10, 20, 0, 0) });
let TEXT;
let GUEST;


test("setup", async () => {
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1, randomGames: 3 }));
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

function openList() {
    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
}

test("the list is drawn from the Operator Menu, its title as a heading", () => {
    openList();

    assert.equal(fake.currentMenu(), null, "no native menu");
    assert.deepEqual(drawnMenuLines(fake), [
        `[${TEXT.listTitle.toUpperCase()}]`, "---", GUEST, "Alice", "Bob", "---", TEXT.everyProfile, "---", TEXT.cancel,
    ]);
    assert.equal(highlightedEntry(fake), GUEST, "the cursor skips the heading");
    chooseEntry(fake, TEXT.cancel);
    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu(), null);
});

test("the confirmation asks above Yes and No, the cursor on No, and No closes it", () => {
    openList();
    chooseEntry(fake, "Bob");
    chooseEntry(fake, TEXT.reset);

    assert.equal(fake.currentMenu(), null);
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.confirm("Bob")));
    assert.deepEqual(drawnMenuLines(fake), [TEXT.yes, TEXT.no]);
    assert.equal(highlightedEntry(fake), TEXT.no);
    press(fake, "Select");

    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu(), null);
    assert.equal(JSON.parse(fake.readFile(profileFile("Bob"))).randomGames, 3, "nothing is reset");
});

test("Yes resets the Profile and the outcome shows with OK", () => {
    openList();
    chooseEntry(fake, "Bob");
    chooseEntry(fake, TEXT.reset);
    chooseEntry(fake, TEXT.yes);

    assert.equal(JSON.parse(fake.readFile(profileFile("Bob"))).randomGames, 0);
    assert.equal(fake.currentMenu(), null);
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.done("Bob")));
    assert.deepEqual(drawnMenuLines(fake), [TEXT.ok]);
    press(fake, "Select");

    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu(), null);
    assertNoErrorLogged(fake);
});
