// ============================================================
// The main menu's "Launch a random table" entry through main.js: it launches
// a table of the wheel selection, never the Last Played Table when another
// is there, each Play counts in the Random Games played, and the entry is
// gone while the wheel selection is empty.
// - Runs with the animation off: the launch comes at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { getRandomGame } from "../../common/tables/random_game.js";
import { mainMenuSection } from "../support/main_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const MENU_LAUNCH_COUNT = 50;
const GUEST_PROFILE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest\\profile.json";

const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness" },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars" },
    { id: 3, configId: "Theatre of Magic (Bally 1995)", title: "Theatre of Magic" },
    // Outside the wheel selection: never drawn.
    { id: 4, configId: "Twilight Zone (Bally 1993)", title: "Twilight Zone" },
];
const WHEEL_CONFIG_IDS = ["Theatre of Magic (Bally 1995)", "Medieval Madness (Williams 1997)", "Attack from Mars (Bally 1995)"];
// Guest's most recent play: its Last Played Table at startup.
const LAST_PLAYED_CONFIG_ID = "Theatre of Magic (Bally 1995)";

// The main menu read as a native one.
const ADD_ONS_UNDER_TEST = ["randomGame"];

const fake = createFakePinballYHost({ now: new Date(2026, 9, 29, 20, 0, 0), tables: TABLES });
let lang;

// A one-minute Play each, so each one is Guest's most recent one.
function playAndReturnToWheel(game) {
    fake.gameStarted(game);
    fake.advanceTime(60 * 1000);
    fake.gameOver(game);
}

test("setup", async () => {
    fake.setWheelTables(WHEEL_CONFIG_IDS);
    fake.addFile(GUEST_PROFILE_FILE, JSON.stringify({
        version: 1,
        plays: { [LAST_PLAYED_CONFIG_ID]: { count: 1, seconds: 60, lastPlayed: "2026-10-28T20:00:00" } },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    config.skipRandomGameAnimation = true;
    ({ default: lang } = await import("../../common/core/i18n.js"));
    await import("../../main.js");
    await settle();
});

test("the entry launches a table of the wheel selection, never the one played just before, and each Play counts", async () => {
    for (let i = 0; i < MENU_LAUNCH_COUNT; i++) {
        fake.openMainMenu();
        fake.selectMenuItem(lang.customMenuLabels.randomTable);
        await settle();
        assert.equal(fake.currentMenu(), null, "the menu closes");
        const launches = fake.launches();
        playAndReturnToWheel(launches[launches.length - 1]);
    }

    const launchedConfigIds = fake.launches().map(game => game.configId);
    assert.equal(launchedConfigIds.length, MENU_LAUNCH_COUNT);
    launchedConfigIds.forEach(configId => assert.ok(WHEEL_CONFIG_IDS.includes(configId), configId));
    const lastPlayedBefore = [LAST_PLAYED_CONFIG_ID, ...launchedConfigIds];
    launchedConfigIds.forEach((configId, i) => assert.notEqual(configId, lastPlayedBefore[i], `launch ${i}`));
    assert.equal(getRandomGame().getRandomGamesPlayed(), MENU_LAUNCH_COUNT);
});

test("the entry is gone while the wheel selection has no table, and back with one", () => {
    fake.setWheelTables([]);
    assert.equal(mainMenuSection(fake, lang.customMenuLabels.randomTable), null);
    fake.setWheelTables(WHEEL_CONFIG_IDS);
    assert.deepEqual(mainMenuSection(fake, lang.customMenuLabels.randomTable), ["Play", lang.customMenuLabels.randomTable]);
    assertNoErrorLogged(fake);
});
