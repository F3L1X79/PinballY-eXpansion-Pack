// ============================================================
// A mark that cannot be saved, through main.js on the fake PinballY
// globals with Drawn Menus: a one-line message with "OK" names the
// Profile and points to the log, the mark stays as it was, the cause is
// logged, and OK goes back to the Profile's menu on its Child line.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, readDrawnMenu, highlightedEntry, squeezed, press, openOperatorMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { errorLines } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

test("a mark that cannot be saved is told with OK and left unchanged", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(profileFile("Bob"), JSON.stringify({ version: 1 }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus"].includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    await import("../../main.js");
    await settle();
    const store = getProfileStore();
    store.switchTo("Alice");

    fake.lockFile(profileFile("Bob"));
    openOperatorMenu(fake);
    chooseEntry(fake, TEXT.menuEntry);
    chooseEntry(fake, "Bob");
    chooseEntry(fake, TEXT.childLine(false));

    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.marksFailed("Bob")));
    assert.equal(TEXT.marksFailed("Bob"), "Bob's marks could not be changed. See the log for details.");
    assert.deepEqual(drawnMenuLines(fake), [TEXT.ok]);
    assert.equal(store.isChild("Bob"), false, "the mark is unchanged");
    assert.ok(!("isChild" in JSON.parse(fake.readFile(profileFile("Bob")))));
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /^\[ManageProfiles\] .*Permission denied: .*\\Bob\\/s, "the cause is logged");

    press(fake, "Select");
    assert.equal(readDrawnMenu(fake).rows[0].title, "BOB", "back to the Profile's menu");
    assert.equal(highlightedEntry(fake), TEXT.childLine(false));
});
