// ============================================================
// Welcome Screen through main.js at 5 h: opens on its turn at startup,
// greets by the hour, loops through its choices with the navigation sound,
// names the table on the wheel, leaves the wheel still, and closes on Stay
// leaving no layer nor timer.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    WELCOME_SCREEN_OPEN_MS, press, isWelcomeScreenOpen, greeting, periodCards, headerImages, bottomRowLabels, highlighted, readChoices, choose,
    welcomeScreenLayerCount,
} from "./welcome_screen_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const NAVIGATION_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";

const table = (id, title, configId) => ({ id, configId, title, playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false });
const MEDIEVAL = table(1, "Medieval Madness (Williams 1997)", "Medieval Madness (Williams 1997)");
// A lost "™" read as Windows-1252, then a parenthetical suffix.
const MARS = table(2, "Attack from Mars\u00EF\u00BF\u00BD  Special (Bally 1995)", "Attack from Mars (Bally 1995)");

test("the Welcome Screen opens on its turn at startup, greets the Profile and loops through its choices", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 5, 0, 0), tables: [MEDIEVAL, MARS] });
    fake.addFolder(`${PROFILES}\\Bob`);
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({
        version: 1, notified: [],
        plays: {
            [MEDIEVAL.configId]: { count: 3, seconds: 900, lastPlayed: "2026-09-22T21:00:00" },
            [MARS.configId]: { count: 1, seconds: 120, lastPlayed: "2026-09-20T21:00:00" },
        },
    }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(NAVIGATION_SOUND);
    // The wheel is not on the Last Played Table (Medieval Madness).
    fake.setWheelTables([MARS.configId, MEDIEVAL.configId]);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["startupChoicePrompt", "profilePicker"].includes(key);
    config.language = "en";
    config.startupScreen = "welcome";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.welcomeScreen;
    await import("../../main.js");
    const intervalsBefore = fake.runningIntervalCount();
    await settle();
    assert.ok(welcomeScreenLayerCount(fake) > 0, "drawn on its turn, without a pause");
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    assert.equal(fake.currentMenu(), null, "no native menu");

    assert.equal(greeting(fake), TEXT.greetingWithName(TEXT.greetings.morning, "Alice").join(""));
    assert.deepEqual(headerImages(fake), [getProfileStore().getActiveProfile().avatarPath], "the active Profile's Avatar");
    assert.deepEqual(bottomRowLabels(fake), [TEXT.randomTable, TEXT.stayOn("Attack from Mars Special")]);
    assert.deepEqual(highlighted(fake), { label: null, tooltip: lang.profiles.menuEntry }, "the Avatar is selected on opening");

    const CARDS = TEXT.periodCards;
    assert.deepEqual(periodCards(fake).map(card => card.line), [null, null], "no grey line without a Streak, nor a Play this Period");
    assert.deepEqual(readChoices(fake), [
        lang.profiles.menuEntry, lang.buttonHints.close, CARDS.day.period, CARDS.week.period, TEXT.randomTable, TEXT.stayOn("Attack from Mars Special"),
    ]);
    assert.deepEqual(fake.soundsPlayed(), Array(6).fill(NAVIGATION_SOUND), "each move plays the navigation sound");
    press(fake, "Prev");
    assert.deepEqual(highlighted(fake), { label: TEXT.stayOn("Attack from Mars Special"), tooltip: null }, "Prev loops back to the last choice");
    assert.equal(fake.getCurrentTable().configId, MARS.configId, "the wheel never moved");

    choose(fake, TEXT.stayOn("Attack from Mars Special"));
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.equal(welcomeScreenLayerCount(fake), 0, "its layers are removed");
    assert.equal(fake.runningIntervalCount(), intervalsBefore, "no timer of its Selection Marker keeps running");
    assert.equal(press(fake, "Next").defaultPrevented, false, "the buttons drive the wheel again");
    assert.deepEqual(fake.launches(), []);
    assertNoErrorLogged(fake);
});
