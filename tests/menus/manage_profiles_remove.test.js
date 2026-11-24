// ============================================================
// Profile Removal from Manage profiles, through main.js on the fake PinballY
// globals with Drawn Menus: "Remove" under "Reset" asks once on "No"; "Yes"
// renames the Profile's folder to a dated "_" name, tells it, then shows the
// list without it. The Profile Picker forgets it and its Initials are free.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, readDrawnMenu, highlightedEntry, squeezed, press, openOperatorMenu, openMainMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const REMOVED_FOLDER = `${PROFILES}\\_Bob removed 2026-10-29`;
// The carousel's background, its Avatars, then the gold frame and names.
const PICKER_Z_RANGE = [6500, 6502];
const GLIDE_OVER_MS = 500;
const DRAWN_AHEAD_MS = 3000;

const pickerTexts = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= PICKER_Z_RANGE[0] && layer.zIndex <= PICKER_Z_RANGE[1] && layer.alpha > 0)
    .flatMap(layer => layer.texts());

test("an Admin Profile removes another Profile, which the cabinet forgets at once", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    const bobFile = JSON.stringify({ version: 1, initials: "BOB", plays: {}, notified: [] });
    fake.addFile(profileFile("Bob"), bobFile);
    fake.addFile(`${PROFILES}\\Bob\\avatar.png`, "png");
    fake.addFolder(`${PROFILES}\\Chloe`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus", "profilePicker"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    await import("../../main.js");
    await settle();
    fake.advanceTime(DRAWN_AHEAD_MS);
    const store = getProfileStore();

    const openBobsMenu = () => {
        openOperatorMenu(fake);
        chooseEntry(fake, TEXT.menuEntry);
        chooseEntry(fake, "Bob");
    };
    openBobsMenu();
    const lines = drawnMenuLines(fake);
    assert.deepEqual(lines.slice(lines.indexOf(TEXT.reset)), [TEXT.reset, TEXT.remove, TEXT.back], "Remove under Reset, before Back");

    chooseEntry(fake, TEXT.remove);
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.removeConfirm("Bob")), "the confirmation names the Profile");
    assert.equal(TEXT.removeConfirm("Bob"), "Remove Bob? The cabinet forgets this profile; its files are kept aside in the profiles folder.");
    assert.deepEqual(drawnMenuLines(fake), [TEXT.removeYes, TEXT.no]);
    assert.equal(highlightedEntry(fake), TEXT.no, "the cursor starts on No");
    press(fake, "Select");
    assert.equal(fake.readFile(profileFile("Bob")), bobFile, "No changes nothing");
    assert.equal(fake.files.folderExists(REMOVED_FOLDER), false);

    openBobsMenu();
    chooseEntry(fake, TEXT.remove);
    chooseEntry(fake, TEXT.removeYes);
    assert.equal(fake.files.folderExists(`${PROFILES}\\Bob`), false, "Bob's folder is set aside");
    assert.equal(fake.readFile(`${REMOVED_FOLDER}\\profile.json`), bobFile, "its files kept under the dated name");
    assert.equal(fake.readFile(`${REMOVED_FOLDER}\\avatar.png`), "png");
    assert.equal(squeezed(readDrawnMenu(fake).message), squeezed(TEXT.removeDone("Bob")));
    assert.deepEqual(drawnMenuLines(fake), [TEXT.ok]);

    press(fake, "Select");
    assert.deepEqual(drawnMenuLines(fake), [`[${TEXT.listTitle.toUpperCase()}]`, "---", lang.profiles.guestName, "Alice", "Chloe", "---", TEXT.everyProfile, "---", TEXT.cancel],
        "the list again, without Bob");
    assert.equal(highlightedEntry(fake), lang.profiles.guestName, "the cursor on the first line");
    press(fake, "Exit");

    assert.equal(store.findInitialsHolder("BOB"), null, "Bob's Initials are free again");
    store.setInitials("Chloe", "BOB");

    fake.advanceTime(DRAWN_AHEAD_MS);
    openMainMenu(fake);
    chooseEntry(fake, lang.profiles.menuEntry);
    await settle();
    const seen = new Set();
    for (let step = 0; step < 6; step++) {
        for (const text of pickerTexts(fake)) seen.add(text);
        press(fake, "Next");
        fake.advanceTime(GLIDE_OVER_MS);
    }
    assert.ok(seen.has("Chloe") && seen.has("Alice"), "the carousel shows the others");
    assert.ok(!seen.has("Bob"), "and never Bob");

    assertNoErrorLogged(fake);
});
