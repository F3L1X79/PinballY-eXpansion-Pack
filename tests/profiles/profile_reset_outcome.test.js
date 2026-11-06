// ============================================================
// The message after a Profile Reset, started through main.js on the fake
// PinballY globals: after "Yes", a one-line dialog-style message with "OK"
// says the named Profile starts over, or, when the Profile Reset throws,
// names it and points to the log, the cause staying in the log only.
// "No" and "Cancel" close the menus without a word.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged, errorLines } from "../support/error_log.js";

const NOW = new Date(2026, 9, 1, 20, 15, 30);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

test("after Yes, a message with OK tells whether the Profile Reset worked", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1, randomGames: 3 }));
    fake.addFile(profileFile("Carol"), JSON.stringify({ version: 1, randomGames: 2 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "customMenuCommands";
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");

    const askToReset = name => {
        fake.openOperatorMenu();
        fake.selectMenuItem(TEXT.menuEntry);
        fake.selectMenuItem(name);
        fake.selectMenuItem(TEXT.reset);
    };
    const shownMessage = () => {
        const menu = fake.currentMenu();
        return {
            titles: menu.items.map(item => item.title ?? ""),
            selected: menu.items.filter(item => item.selected).map(item => item.title),
            dialogStyle: menu.options.dialogStyle,
        };
    };

    askToReset("Bob");
    fake.selectMenuItem(TEXT.no);
    assert.equal(fake.currentMenu(), null, "No closes the menus without a message");
    fake.openOperatorMenu();
    fake.selectMenuItem(TEXT.menuEntry);
    fake.selectMenuItem(TEXT.cancel);
    assert.equal(fake.currentMenu(), null, "Cancel closes the menus without a message");

    askToReset("Bob");
    fake.selectMenuItem(TEXT.yes);
    assert.deepEqual(shownMessage(), { titles: [TEXT.done("Bob"), "", TEXT.ok], selected: [TEXT.ok], dialogStyle: true },
        "the message names the Profile that starts over");
    assert.equal(JSON.parse(fake.readFile(profileFile("Bob"))).randomGames, 0);
    fake.selectMenuItem(TEXT.ok);
    assert.equal(fake.currentMenu(), null, "OK closes the message");
    assertNoErrorLogged(fake);

    fake.lockFile(profileFile("Carol"));
    askToReset("Carol");
    fake.selectMenuItem(TEXT.yes);
    assert.deepEqual(shownMessage(), { titles: [TEXT.failed("Carol"), "", TEXT.ok], selected: [TEXT.ok], dialogStyle: true },
        "the failure message names the Profile and points to the log");
    assert.ok(!TEXT.failed("Carol").includes("Permission denied"), "the cause stays out of the message");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^\[ProfileReset\] .*Permission denied: .*\\Carol\\/s, "the cause is logged");
    fake.selectMenuItem(TEXT.ok);
    assert.equal(fake.currentMenu(), null);
});
