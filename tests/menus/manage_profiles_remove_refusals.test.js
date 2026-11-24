// ============================================================
// Profile Removal's limits, through main.js on the fake PinballY globals
// with Drawn Menus: "Remove" is greyed with its reason on Guest and on the
// active Profile; another Admin Profile can be removed; a dated folder name
// already taken that day gets "-2", then "-3".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, readDrawnMenu, press, openOperatorMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

test("Remove is refused to Guest and the active Profile, never to another admin, and never overwrites a set-aside folder", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Dan"), JSON.stringify({ version: 1, plays: {}, notified: [] }));
    // A Dan removed earlier that day, then brought back by hand once.
    fake.addFile(`${PROFILES}\\_Dan removed 2026-10-29\\profile.json`, "first");
    fake.addFile(`${PROFILES}\\_Dan removed 2026-10-29-2\\profile.json`, "second");
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.profileReset;
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");

    const openMenuOf = shownName => {
        openOperatorMenu(fake);
        chooseEntry(fake, TEXT.menuEntry);
        chooseEntry(fake, shownName);
    };
    const closeMenus = () => {
        for (let guard = 0; isDrawnMenuShown(fake); guard++) {
            if (guard > 5) throw new Error("The menus do not close.");
            press(fake, "Exit");
        }
    };
    const removeRow = () => readDrawnMenu(fake).rows.find(row => row.title === TEXT.remove);
    const removeThrough = shownName => {
        openMenuOf(shownName);
        chooseEntry(fake, TEXT.remove);
        chooseEntry(fake, TEXT.removeYes);
        press(fake, "Select");
        closeMenus();
    };

    openMenuOf(lang.profiles.guestName);
    assert.deepEqual(removeRow(), { kind: "entry", title: TEXT.remove, mark: null, reason: TEXT.removeRefusals.guest });
    assert.equal(TEXT.removeRefusals.guest, "Guest is never removed");
    closeMenus();

    openMenuOf("Alice");
    assert.deepEqual(removeRow(), { kind: "entry", title: TEXT.remove, mark: null, reason: TEXT.removeRefusals.active });
    assert.equal(TEXT.removeRefusals.active, "Active profile");
    closeMenus();

    removeThrough("Bob");
    assert.equal(fake.files.folderExists(`${PROFILES}\\Bob`), false, "another Admin Profile is removed");
    assert.ok(fake.readFile(`${PROFILES}\\_Bob removed 2026-10-29\\profile.json`));

    removeThrough("Dan");
    assert.equal(fake.readFile(`${PROFILES}\\_Dan removed 2026-10-29\\profile.json`), "first", "never overwritten");
    assert.equal(fake.readFile(`${PROFILES}\\_Dan removed 2026-10-29-2\\profile.json`), "second");
    assert.ok(JSON.parse(fake.readFile(`${PROFILES}\\_Dan removed 2026-10-29-3\\profile.json`)), "numbered past the taken names");
    assert.equal(fake.files.folderExists(`${PROFILES}\\Dan`), false);

    assertNoErrorLogged(fake);
});
