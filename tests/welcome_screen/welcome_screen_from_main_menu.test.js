// ============================================================
// Welcome Screen from the main menu: its entry closes the menu and
// brings the screen back once the wheel is free, without the startup veil
// or Loader, the cursor on the cross; Exit leaves the bare wheel. Toasts
// wait for it, and a second pick while it waits or shows adds nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readLoader } from "../support/loader_reader.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import {
    WELCOME_SCREEN_FADE_IN_MS, WELCOME_SCREEN_OPEN_MS, press, isWelcomeScreenOpen, startupVeil, highlighted, greeting, welcomeScreenLayerCount,
} from "./welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// Enough for a toast to start.
const TOAST_RISE_MS = 1000;

test("the main menu's Welcome Screen entry reopens the screen for the active Profile", async () => {
    const fake = createFakePinballYHost();
    for (const name of ["Alice", "Bob"]) fake.addFolder(`${PROFILES_FOLDER}\\${name}`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "startupChoicePrompt" || key === "profilePicker";
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getAchievementToasts } = await import("../../common/achievements/achievement_toast.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    press(fake, "Exit");
    await settle();
    const openMainMenu = () => fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);

    openMainMenu();
    fake.selectMenuItem(lang.welcomeScreen.menuEntry);
    assert.equal(fake.currentMenu(), null, "the menu closes");
    // Picked again while the screen waits its turn.
    openMainMenu();
    fake.selectMenuItem(lang.welcomeScreen.menuEntry);
    await settle();
    assert.ok(welcomeScreenLayerCount(fake) > 0, "drawn at its turn");
    assert.deepEqual(startupVeil(fake), { shown: false }, "no startup veil");
    assert.deepEqual(readLoader(fake), { shown: false }, "no Loader");
    fake.advanceTime(WELCOME_SCREEN_FADE_IN_MS / 2);
    assert.deepEqual(startupVeil(fake), { shown: false }, "no veil as it fades in either");
    fake.advanceTime(WELCOME_SCREEN_FADE_IN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    assert.ok(greeting(fake).includes("Bob"), "for the active Profile");
    assert.equal(highlighted(fake).tooltip, lang.buttonHints.close, "the cursor on the cross");

    // The toast reader also sees the Profile picker's own drawings.
    const drawingsBefore = toastDrawings(fake).length;
    getAchievementToasts().submit({ title: "Waiting", description: "", onShown() {} });
    fake.advanceTime(TOAST_RISE_MS);
    assert.equal(toastDrawings(fake).length, drawingsBefore, "a toast waits while the screen shows");

    press(fake, "Exit");
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.equal(fake.currentMenu(), null, "Exit leaves the bare wheel");
    assert.equal(fake.getUIMode(), "wheel");
    fake.advanceTime(TOAST_RISE_MS);
    assert.ok(toastDrawings(fake).length > drawingsBefore, "the toast shows once the screen closed");
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), false, "the second pick queued no second screen");
    assertNoErrorLogged(fake);
});
