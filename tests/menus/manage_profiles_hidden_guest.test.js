// ============================================================
// Hidden Guest from Manage profiles, through main.js on the fake PinballY
// globals with Drawn Menus: Guest's menu alone has the Hidden line, which
// flips at once and writes its key to cabinet.json only while Guest is
// hidden; the Profile Picker carousel leaves a Hidden Guest out.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, isDrawnMenuShown, highlightedEntry, press, openOperatorMenu, openMainMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
// The carousel's background, its Avatars, then the gold frame and names.
const PICKER_Z_RANGE = [6500, 6502];
const GLIDE_OVER_MS = 500;
const DRAWN_AHEAD_MS = 3000;

const pickerTexts = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= PICKER_Z_RANGE[0] && layer.zIndex <= PICKER_Z_RANGE[1] && layer.alpha > 0)
    .flatMap(layer => layer.texts());

test("an Admin Profile hides Guest from the Profile Picker, then shows it again", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFolder(`${PROFILES}\\Bob`);
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus", "profilePicker"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.profileReset;
    const GUEST = lang.profiles.guestName;
    await import("../../main.js");
    await settle();
    fake.advanceTime(DRAWN_AHEAD_MS);

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
    const carouselNames = async () => {
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
        press(fake, "Exit");
        fake.advanceTime(GLIDE_OVER_MS);
        return seen;
    };
    const savedCabinet = () => JSON.parse(fake.readFile(CABINET_FILE));

    openMenuOf("Bob");
    assert.ok(!drawnMenuLines(fake).some(line => [TEXT.hiddenLine(false), TEXT.hiddenLine(true)].includes(line)), "no Hidden line on another Profile");
    closeMenus();

    openMenuOf(GUEST);
    const lines = drawnMenuLines(fake);
    assert.equal(lines[lines.indexOf(TEXT.childLine(false)) + 1], TEXT.hiddenLine(false), "the Hidden line right under the mark lines");
    assert.equal(TEXT.hiddenLine(false), "Hidden: no");
    assert.ok(!("hiddenGuest" in savedCabinet()), "no key while Guest is shown");

    chooseEntry(fake, TEXT.hiddenLine(false));
    assert.ok(isDrawnMenuShown(fake), "the menu stays");
    assert.equal(highlightedEntry(fake), TEXT.hiddenLine(true), "flipped at once, the cursor on it");
    assert.equal(TEXT.hiddenLine(true), "Hidden: yes");
    assert.equal(savedCabinet().hiddenGuest, true);
    assert.equal(savedCabinet().activeProfile, "Alice", "the rest of cabinet.json kept");
    closeMenus();

    let seen = await carouselNames();
    assert.ok(seen.has("Alice") && seen.has("Bob"), "the carousel shows the household");
    assert.ok(!seen.has(GUEST), "and never a Hidden Guest");

    openMenuOf(GUEST);
    assert.ok(drawnMenuLines(fake).includes(TEXT.hiddenLine(true)), "a Hidden Guest stays in Manage profiles");
    chooseEntry(fake, TEXT.hiddenLine(true));
    assert.equal(highlightedEntry(fake), TEXT.hiddenLine(false));
    assert.ok(!("hiddenGuest" in savedCabinet()), "shown again, the key goes");
    closeMenus();

    seen = await carouselNames();
    assert.ok(seen.has(GUEST), "Guest is back in the carousel");

    assertNoErrorLogged(fake);
});
