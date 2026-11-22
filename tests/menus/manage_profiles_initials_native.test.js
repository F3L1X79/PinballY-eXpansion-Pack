// ============================================================
// A Profile's Initials with the Drawn Menus Add-on off, through main.js on
// the fake PinballY globals: the same line in PinballY's own menus, greyed on
// Guest as "<label> (<reason>)"; a save that fails writes nothing and shows a
// failure line with "OK" that closes, the cause in the log only; once it works, the
// Profile's menu shows the Initials.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";
import { NAME_ENTRY_OPEN_MS, press, isNameEntryOpen, moveTo, enterName } from "../profiles/name_entry_scenario.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

test("the Initials line shows natively, fails without writing, then saves", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 22, 20, 0, 0) });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "highScores"].includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    const OK = lang.profiles.nameEntry.ok;
    await import("../../main.js");
    await settle();
    const store = getProfileStore();
    store.switchTo("Alice");
    const titles = () => fake.currentMenu().items.map(item => item.title ?? "");
    const openProfileMenu = name => {
        fake.openOperatorMenu();
        fake.selectMenuItem(TEXT.menuEntry);
        fake.selectMenuItem(name);
    };
    const enterInitials = initials => {
        openProfileMenu("Bob");
        fake.selectMenuItem(TEXT.initialsLine(null));
        fake.advanceTime(NAME_ENTRY_OPEN_MS);
        assert.equal(isNameEntryOpen(fake), true, "Name Entry opens");
        enterName(fake, initials);
        moveTo(fake, OK);
        press(fake, "Select");
    };

    openProfileMenu(lang.profiles.guestName);
    assert.ok(titles().includes(lang.drawnMenu.disabledLine(TEXT.initialsLine(null), TEXT.initialsRefusals.guest)), "greyed on Guest");
    fake.selectMenuItem(TEXT.back);

    const bobBefore = fake.readFile(profileFile("Bob"));
    fake.lockFile(profileFile("Bob"));
    enterInitials("FEL");
    assert.deepEqual(titles(), [TEXT.initialsFailed("Bob"), "", TEXT.ok]);
    assert.equal(fake.readFile(profileFile("Bob")), bobBefore, "nothing is written");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^\[Initials\] .*Permission denied: .*\\Bob\\/s, "the cause is logged");
    fake.selectMenuItem(TEXT.ok);
    assert.equal(fake.currentMenu(), null, "natively, OK closes");

    fake.unlockFile(profileFile("Bob"));
    enterInitials("FEL");
    assert.ok(titles().includes(TEXT.initialsLine("FEL")), "the Profile's menu again, with its Initials");
    assert.equal(store.getInitialsOf("Bob"), "FEL");
    fake.selectMenuItem(TEXT.back);
    assert.equal(errorLines(fake).length, 1, "no other error");
});
