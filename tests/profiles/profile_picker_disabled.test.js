// ============================================================
// Profile picker turned off in addOns, through main.js on the fake
// PinballY globals: neither the main menu nor the Welcome Screen has a
// "Change player" choice, and cabinet.json is not rewritten when Guest is
// already active.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, press, readChoices } from "../welcome_screen/welcome_screen_reader.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

test("turning the Profile picker off removes its main-menu entry and Welcome Screen choice", async () => {
    const fake = createFakePinballYHost();
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "guest" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    // Not the Challenges nor the Household Challenge either: they lock the
    // week's in cabinet.json at startup, for Guest too. Nor the Drawn Menus,
    // so the main menu is read natively.
    for (const key of Object.keys(config.addOns)) config.addOns[key] = !["profilePicker", "challenges", "householdChallenge", "drawnMenus"].includes(key);
    // Without vpxtool, the Script Reader Prompt would open first.
    config.offerVpxtool = false;
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();

    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    const choices = readChoices(fake);
    assert.ok(choices.includes(lang.buttonHints.close), "the Welcome Screen is open");
    assert.ok(!choices.includes(lang.profiles.menuEntry));
    press(fake, "Exit");

    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    const titles = fake.currentMenu().items.map(item => item.title);
    assert.ok(titles.length > 1, "the other Add-ons' entries are there");
    assert.ok(!titles.includes(lang.profiles.menuEntry));

    // Guest was already active: no switch to save.
    const cabinetWrites = fake.fileOperations().filter(({ path }) => path.startsWith(`${PROFILES_FOLDER}\\cabinet`));
    assert.deepEqual(cabinetWrites, []);
});
