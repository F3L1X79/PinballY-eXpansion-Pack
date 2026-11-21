// ============================================================
// The History Import with the Drawn Menus Add-on off, through main.js on
// the fake PinballY globals: the same lines in PinballY's own menus, the
// greyed one as "<label> (<reason>)"; a save that fails leaves the Profile
// unchanged and shows a failure line with "OK", the cause in the log only;
// once it works, the line is greyed on every Profile.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

const MEDIEVAL = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", isHidden: false,
    playCount: 7, playTime: 7200, lastPlayed: new Date(2026, 5, 1, 21, 30, 0),
};

test("the History Import shows natively, fails without writing, then works once", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 21, 20, 0, 0), tables: [MEDIEVAL] });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "customMenuCommands";
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    await import("../../main.js");
    await settle();
    const store = getProfileStore();
    store.switchTo("Alice");
    const shownMessage = () => {
        const menu = fake.currentMenu();
        return {
            titles: menu.items.map(item => item.title ?? ""),
            selected: menu.items.filter(item => item.selected).map(item => item.title),
            dialogStyle: menu.options.dialogStyle,
        };
    };
    const openProfileMenu = name => {
        fake.openOperatorMenu();
        fake.selectMenuItem(TEXT.menuEntry);
        fake.selectMenuItem(name);
    };
    const greyed = reason => lang.drawnMenu.disabledLine(TEXT.historyLine, reason);

    openProfileMenu(lang.profiles.guestName);
    assert.ok(fake.currentMenu().items.some(item => item.title === greyed(TEXT.historyRefusals.guest)), "greyed on Guest");
    fake.selectMenuItem(TEXT.back);

    const bobBefore = fake.readFile(profileFile("Bob"));
    fake.lockFile(profileFile("Bob"));
    openProfileMenu("Bob");
    fake.selectMenuItem(TEXT.historyLine);
    assert.deepEqual(shownMessage(), {
        titles: [TEXT.historyConfirm("Bob", 7, 2, 1), "", TEXT.historyYes, TEXT.no], selected: [TEXT.no], dialogStyle: true,
    });
    fake.selectMenuItem(TEXT.historyYes);
    assert.deepEqual(shownMessage(), { titles: [TEXT.historyFailed("Bob"), "", TEXT.ok], selected: [TEXT.ok], dialogStyle: true });
    assert.equal(fake.readFile(profileFile("Bob")), bobBefore, "nothing is written");
    assert.deepEqual(store.getPlaysOf("Bob"), {});
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^\[HistoryImport\] .*Permission denied: .*\\Bob\\/s, "the cause is logged");
    fake.selectMenuItem(TEXT.ok);
    assert.equal(fake.currentMenu(), null);

    fake.unlockFile(profileFile("Bob"));
    openProfileMenu("Bob");
    fake.selectMenuItem(TEXT.historyLine);
    fake.selectMenuItem(TEXT.historyYes);
    assert.deepEqual(shownMessage(), { titles: [TEXT.historyDone("Bob", 7, 2, 1), "", TEXT.ok], selected: [TEXT.ok], dialogStyle: true });
    assert.deepEqual(store.getPlaysOf("Bob"), { [MEDIEVAL.configId]: { count: 7, seconds: 7200, lastPlayed: "2026-06-01T21:30:00" } });
    fake.selectMenuItem(TEXT.ok);

    for (const name of ["Alice", "Bob"]) {
        openProfileMenu(name);
        const line = greyed(TEXT.historyRefusals.done("Bob"));
        assert.ok(fake.currentMenu().items.some(item => item.title === line), `greyed on ${name}`);
        fake.selectMenuItem(line);
        assert.ok(fake.currentMenu().items.some(item => item.title === line), "choosing it shows the same menu again");
        fake.selectMenuItem(TEXT.back);
    }
    assert.equal(errorLines(fake).length, 1, "no other error");
});
