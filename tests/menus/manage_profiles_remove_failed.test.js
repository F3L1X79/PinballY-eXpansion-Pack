// ============================================================
// A Profile Removal whose folder cannot be renamed, through main.js on the
// fake PinballY globals with Drawn Menus: a one-line message with "OK" names
// the Profile and points to the log, the cause is logged, the folder stays,
// and OK shows the list of Profiles, the Profile still in it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, readDrawnMenu, squeezed, press, openOperatorMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { errorLines } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

test("a folder that cannot be renamed is told with OK, and the Profile stays", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    const bobFile = JSON.stringify({ version: 1, plays: {}, notified: [] });
    fake.addFile(profileFile("Bob"), bobFile);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");

    fake.failNextFolderRename();
    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
    chooseEntry(fake, "Bob");
    chooseEntry(fake, TEXT.remove);
    chooseEntry(fake, TEXT.removeYes);

    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.removeFailed("Bob")));
    assert.equal(TEXT.removeFailed("Bob"), "Bob could not be removed. See the log for details.");
    assert.deepEqual(drawnMenuLines(fake), [TEXT.ok]);
    assert.equal(fake.readFile(profileFile("Bob")), bobFile, "the folder stays");
    assert.deepEqual(fake.files.listFolders(PROFILES).filter(name => name.startsWith("_")), [], "nothing set aside");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^\[ProfileRemoval\] .*Permission denied: .*\\Bob/s, "the cause is logged");

    press(fake, "Select");
    assert.ok(drawnMenuLines(fake).includes("Bob"), "the list still shows Bob");
});
