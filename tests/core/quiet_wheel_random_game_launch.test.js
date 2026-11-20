// ============================================================
// Quiet wheel and a Random Game launched from the Welcome Screen opened
// from the main menu: the selected table is back at its own volume before
// the Random Game launches.
// - Runs with the animation off: the launch comes at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { choose, openFromMainMenu } from "../welcome_screen/welcome_screen_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const MEDIEVAL = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", audioVolume: 75 };
const MARS = { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", audioVolume: 100 };
const GREETING_OVER_MS = 2500;

test("a Random Game launched from the Welcome Screen finds the selected table back at its volume", async () => {
    const fake = createFakePinballYHost({ tables: [MEDIEVAL, MARS] });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, notified: [] }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    // The selected table's volume as each launch starts.
    const volumesAtLaunch = [];
    const playGame = mainWindow.playGame;
    mainWindow.playGame = game => {
        volumesAtLaunch.push(fake.getGameInfo(MEDIEVAL.configId).audioVolume);
        playGame(game);
    };
    const launchEvents = [];
    for (const type of ["prelaunch", "launchoverlayshow", "launchoverlaymessage"]) {
        fake.on(type, ev => launchEvents.push(type === "launchoverlaymessage" ? `"${ev.id}"` : type));
    }
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["startupChoicePrompt", "profilePicker"].includes(key);
    config.language = "en";
    config.startupScreen = "wheel";
    config.skipRandomGameAnimation = true;

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(GREETING_OVER_MS);
    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    assert.deepEqual(fake.gameUpdates(), [{ configId: MEDIEVAL.configId, changes: { audioVolume: 50 } }]);

    choose(fake, lang.welcomeScreen.randomTable);
    await settle();
    assert.equal(fake.launches().length, 1);
    assert.deepEqual(volumesAtLaunch, [75], "back before the launch");
    assert.deepEqual(launchEvents, ["prelaunch", "launchoverlayshow", "\"init\""], "the same opening as playGame");
    assert.deepEqual(fake.gameUpdates().map(update => update.changes.audioVolume), [50, 75]);
    assertNoErrorLogged(fake);
});
