// ============================================================
// A Hidden Guest that becomes the active Profile, through main.js on the
// fake PinballY globals: the active Profile's folder vanished by hand, Guest
// takes over and shows in the Profile Picker while active, cannot be shown
// or hidden meanwhile, and is left out again once another Profile is picked.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { press, openMainMenu, chooseEntry } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
// The carousel's background, its Avatars, then the gold frame and names.
const PICKER_Z_RANGE = [6500, 6502];
const GLIDE_OVER_MS = 500;
const DRAWN_AHEAD_MS = 3000;

const pickerTexts = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= PICKER_Z_RANGE[0] && layer.zIndex <= PICKER_Z_RANGE[1] && layer.alpha > 0)
    .flatMap(layer => layer.texts());

test("a Hidden Guest shows in the Profile Picker while it is the active Profile", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0) });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    // Zoe was active, then her folder was renamed by hand.
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "Zoe", hiddenGuest: true }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["customMenuCommands", "drawnMenus", "profilePicker"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const GUEST = lang.profiles.guestName;
    await import("../../main.js");
    await settle();
    const store = getProfileStore();

    const carouselNames = async () => {
        fake.advanceTime(DRAWN_AHEAD_MS);
        openMainMenu(fake);
        chooseEntry(fake, lang.profiles.menuEntry);
        await settle();
        const seen = new Set();
        for (let step = 0; step < 4; step++) {
            for (const text of pickerTexts(fake)) seen.add(text);
            press(fake, "Next");
            fake.advanceTime(GLIDE_OVER_MS);
        }
        press(fake, "Exit");
        fake.advanceTime(GLIDE_OVER_MS);
        return seen;
    };

    assert.ok(store.getActiveProfile().isGuest, "Guest took over");
    assert.ok((await carouselNames()).has(GUEST), "the active Hidden Guest shows");

    assert.throws(() => store.setGuestHidden(false), /active Profile/);
    assert.equal(JSON.parse(fake.readFile(CABINET_FILE)).hiddenGuest, true, "nothing written while Guest is active");

    store.switchTo("Alice");
    const seen = await carouselNames();
    assert.ok(seen.has("Alice"));
    assert.ok(!seen.has(GUEST), "hidden again once another Profile is active");

    assertNoErrorLogged(fake);
});
