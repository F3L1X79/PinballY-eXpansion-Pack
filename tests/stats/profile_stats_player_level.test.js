// ============================================================
// The Player Level on the drawn Profile Stats' card, in French, through
// main.js on the fake PinballY globals: "NIVEAU", the level and the points
// toward the next one for 0, 45, 50 and 125 points; an Unlock later lost
// keeps its points, the level drops when the Challenges Add-on is turned
// off, and a Profile Reset brings the card back to level 1.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { openProfileStats, playerLevel, press } from "./profile_stats_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

const MEDIEVAL = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", manufacturer: "Williams", year: 1997, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true,
};

// Notified Achievements only: their Unlocks are all lost (no session nor
// Surprise recorded), which keeps their points.
const PROFILE_NOTIFIED = {
    // Bronze 10 + Bronze 10 + Silver 25.
    Alice: ["rageQuit", "oneMoreGame", "mirrorHour"],
    // Gold 50: level 2.
    Bob: ["fourSeasons"],
    // Platinum 100 + Silver 25: level 3.
    Carol: ["fridayThe13th", "grandReturn"],
    // A Platinum Challenge Achievement: level 2 while Challenges are on.
    Dave: ["challengesCompleted:100"],
};

test("the card shows the Player Level and the points toward the next one", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: [MEDIEVAL] });
    fake.addFile(`${PROFILES}\\guest\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [] }));
    for (const [name, notified] of Object.entries(PROFILE_NOTIFIED)) {
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified }));
    }
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["achievements", "challenges", "sessionStatsTracker"].includes(key);
    config.language = "fr";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileStats;
    await import("../../main.js");
    await settle();
    const levelOf = name => {
        getProfileStore().switchTo(name);
        openProfileStats(fake, lang);
        const shown = playerLevel(fake, TEXT);
        press(fake, "Exit");
        return shown;
    };

    assert.deepEqual(levelOf("guest"), { level: "1", current: "0 / 50 points pour le niveau 2" });
    assert.deepEqual(levelOf("Alice"), { level: "1", current: "45 / 50 points pour le niveau 2" });
    assert.deepEqual(levelOf("Bob"), { level: "2", current: "50 / 125 points pour le niveau 3" });
    assert.deepEqual(levelOf("Carol"), { level: "3", current: "125 / 225 points pour le niveau 4" });
    assert.deepEqual(levelOf("Dave"), { level: "2", current: "100 / 125 points pour le niveau 3" });

    config.addOns.challenges = false;
    assert.deepEqual(levelOf("Dave"), { level: "1", current: "0 / 50 points pour le niveau 2" }, "its Achievements are gone");

    getProfileStore().resetProfile("Carol");
    assert.deepEqual(levelOf("Carol"), { level: "1", current: "0 / 50 points pour le niveau 2" }, "a Profile Reset starts over");

    assertNoErrorLogged(fake);
});
