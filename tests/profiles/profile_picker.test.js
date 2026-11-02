// ============================================================
// Profile picker through main.js: "Change Player" opens the carousel on the
// active Profile; flippers move and wrap without redrawing, every button is
// swallowed, Select switches, Exit or attract mode close it. Folders added
// while PinballY runs show up on the next open.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET_FILE = `${PROFILES_FOLDER}\\cabinet.json`;
// The carousel's background, its Avatars, then the gold frame and names.
const PICKER_Z_RANGE = [6500, 6502];
// Past the ~200 ms glide, past the pause before the greeting, and past the
// whole greeting.
const GLIDE_OVER_MS = 500;
const PAUSE_OVER_MS = 600;
const GREETING_OVER_MS = 2500;

async function start({ enabled = true, activeProfile = "Bob" } = {}) {
    const fake = createFakePinballYHost();
    for (const name of ["Alice", "Bob"]) fake.addFolder(`${PROFILES_FOLDER}\\${name}`);
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile }));
    // Alice is an Admin Profile, so the Profile active here has no "+" slot
    // (tests/profiles/new_profile_slot.test.js) and the carousel holds Profiles only.
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], isAdmin: true }));
    // Never uninstalled: node --test runs each test file in its own process,
    // and main.js is imported once per process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "profilePicker" && enabled;
    config.language = "en";
    config.startupScreen = "welcome";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    // The startup greeting (~1.5 s), out of the way: it shares the picker layer.
    fake.advanceTime(GREETING_OVER_MS);

    const openMainMenu = () => fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    return { fake, lang, store: getProfileStore(), openMainMenu };
}

// What the picker's layers show now; empty when the carousel is closed.
const pickerTexts = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= PICKER_Z_RANGE[0] && layer.zIndex <= PICKER_Z_RANGE[1] && layer.alpha > 0)
    .flatMap(layer => layer.texts());

// The one Profile name shown (only the highlighted Avatar is named).
function highlightedName(fake, names) {
    const shown = names.filter(name => pickerTexts(fake).includes(name));
    assert.equal(shown.length, 1, `exactly one name among ${names.join(", ")} is shown`);
    return shown[0];
}

const press = (fake, buttonCommand) => fake.fire("commandbuttondown", { command: buttonCommand, repeat: false });

test("the Profile picker moves, wraps, switches, cancels and sees new folders", async () => {
    const { fake, lang, store, openMainMenu } = await start();
    const menuEntry = lang.profiles.menuEntry;
    const guest = lang.profiles.guestName;
    const names = [guest, "Alice", "Bob", "Chloé"];

    openMainMenu();
    assert.equal(pickerTexts(fake).length, 0, "closed before the entry is chosen");
    fake.selectMenuItem(menuEntry);
    await settle();
    assert.ok(fake.executedCommands().includes(fake.getBuiltInCommand("MenuReturn")), "the main menu is closed first");
    assert.equal(highlightedName(fake, names), "Bob", "opens on the active Profile");

    const next = press(fake, "Next");
    assert.equal(next.defaultPrevented, true, "the wheel does not move");
    assert.deepEqual(names.filter(name => pickerTexts(fake).includes(name)), [], "no name while the Avatars glide");
    const drawingsBefore = fake.drawings().length;
    fake.advanceTime(GLIDE_OVER_MS);
    assert.equal(fake.drawings().length, drawingsBefore, "the Avatars glide and the name comes back without redraws");
    assert.equal(highlightedName(fake, names), guest, "Next wraps from the last Profile to Guest");
    press(fake, "Prev");
    press(fake, "Prev");
    fake.advanceTime(GLIDE_OVER_MS);
    assert.equal(highlightedName(fake, names), "Alice", "a press during a glide carries on");
    assert.equal(press(fake, "ExitGame").defaultPrevented, true, "every button is swallowed");

    assert.equal(press(fake, "Exit").defaultPrevented, true);
    assert.deepEqual(pickerTexts(fake), [], "Exit closes the carousel");
    assert.equal(store.getActiveProfile().name, "Bob", "Exit keeps the active Profile");
    assert.equal(press(fake, "Next").defaultPrevented, false, "buttons reach PinballY once it is closed");

    fake.addFolder(`${PROFILES_FOLDER}\\Chloé`);
    openMainMenu();
    fake.selectMenuItem(menuEntry);
    await settle();
    assert.equal(highlightedName(fake, names), "Bob", "opens on the active Profile again");
    press(fake, "Next");
    fake.advanceTime(GLIDE_OVER_MS);
    assert.equal(highlightedName(fake, names), "Chloé", "a folder added while PinballY runs shows up");

    press(fake, "Select");
    assert.ok(pickerTexts(fake).includes(lang.profiles.pickerTitle), "the carousel stays still for a moment");
    assert.equal(press(fake, "Next").defaultPrevented, false, "buttons reach PinballY once picked");
    fake.advanceTime(PAUSE_OVER_MS);
    assert.ok(!pickerTexts(fake).includes(lang.profiles.pickerTitle), "then the greeting replaces the carousel");
    assert.equal(store.getActiveProfile().name, "Chloé");
    assert.equal(JSON.parse(fake.readFile(CABINET_FILE)).activeProfile, "Chloé", "the switch is saved");

    openMainMenu();
    fake.selectMenuItem(menuEntry);
    await settle();
    press(fake, "Prev");
    press(fake, "Launch");
    assert.equal(store.getActiveProfile().name, "Bob", "Launch picks too");

    openMainMenu();
    fake.selectMenuItem(menuEntry);
    await settle();
    fake.fire("attractmodestart");
    assert.deepEqual(pickerTexts(fake), [], "attract mode closes the carousel");
    assert.equal(press(fake, "Next").defaultPrevented, false);
    assert.equal(store.getActiveProfile().name, "Bob");

    fake.openMenu("exit", [
        { title: "Quit", cmd: fake.getBuiltInCommand("Quit") },
        { title: "Cancel", cmd: fake.getBuiltInCommand("MenuReturn") },
    ]);
    assert.deepEqual(fake.currentMenu().items.map(item => item.title), ["Quit", menuEntry, "Cancel"]);
    fake.selectMenuItem(menuEntry);
    await settle();
    assert.equal(highlightedName(fake, names), "Bob", "the exit menu opens the carousel too");
    press(fake, "Exit");

    assertNoErrorLogged(fake);
});
