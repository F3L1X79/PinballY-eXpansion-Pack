// ============================================================
// The first Admin Profile, as Drawn Menus, through main.js on the fake
// PinballY globals: while no Profile is marked, an ordinary Profile finds
// "Manage profiles" with a single "Become admin" line, which marks it and
// opens the full list; Guest and a Child Profile never see the entry.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, drawnMenuLines, highlightedEntry, press, openExitMenu, openOperatorMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "drawnMenus"];
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const OPERATOR_MENU = "Operator Menu";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const readProfile = name => JSON.parse(fake.readFile(profileFile(name)));

const fake = createFakePinballYHost({ now: new Date(2026, 9, 30, 20, 0, 0) });
let TEXT;
let GUEST;
let store;

test("setup", async () => {
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1 }));
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
});

function menuLines(open) {
    open(fake);
    const lines = drawnMenuLines(fake);
    press(fake, "Exit");
    return lines;
}

test("with no Admin Profile, Manage profiles is absent for Guest and for a Child Profile", () => {
    store.switchTo("guest");
    assert.ok(!menuLines(openOperatorMenu).includes(TEXT.menuEntry));
    store.switchTo("Kid");
    assert.ok(!menuLines(openOperatorMenu).includes(TEXT.menuEntry));
});

test("an ordinary Profile finds Manage profiles, with Become admin as its only line", () => {
    store.switchTo("Bob");
    assert.ok(menuLines(openExitMenu).includes(OPERATOR_MENU), "the Operator Menu stays for everyone");
    assert.ok(menuLines(openOperatorMenu).includes(TEXT.menuEntry));

    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
    assert.deepEqual(drawnMenuLines(fake), [TEXT.becomeAdmin, "---", TEXT.cancel]);
    assert.equal(highlightedEntry(fake), TEXT.becomeAdmin);
});

test("Become admin marks the active Profile and opens the full list", () => {
    press(fake, "Select");
    assert.equal(readProfile("Bob").isAdmin, true);
    assert.ok(isDrawnMenuShown(fake));
    assert.deepEqual(drawnMenuLines(fake), [`[${TEXT.listTitle.toUpperCase()}]`, "---", GUEST, "Alice", "Bob", "Kid", "---", TEXT.everyProfile, "---", TEXT.cancel]);
    chooseEntry(fake, TEXT.cancel);
    assert.ok(!isDrawnMenuShown(fake));
});

test("afterwards, another Profile no longer sees the Operator Menu nor Manage profiles", () => {
    store.switchTo("Alice");
    assert.ok(!menuLines(openExitMenu).includes(OPERATOR_MENU));
    assert.ok(!menuLines(openOperatorMenu).includes(TEXT.menuEntry), "not even from the service button");
    assertNoErrorLogged(fake);
});
