// ============================================================
// Profile Ratings and the Rating Prompt: it reads the active Profile's
// Ratings, so it asks Bob about a table Alice rated and he did not, and
// never asks Alice about a table she rated and he did not.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const MEDIEVAL = "Medieval Madness (Williams 1997)";
const MARS = "Attack from Mars (Bally 1995)";
// Rated by Alice alone, never played yet.
const TABLES = [
    { id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 4, isFavorite: false, playTime: 0 },
    { id: 2, configId: MARS, title: "Attack from Mars", rating: 3, isFavorite: false, playTime: 0 },
];
const PLAYED_SECONDS = 120;

test("the Rating Prompt asks each Profile about the tables it has not rated", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\ratings.json`, JSON.stringify({ version: 1, ratings: { [MEDIEVAL]: 4, [MARS]: 3 }, favorites: [] }));
    fake.addFolder(`${PROFILES}\\Bob`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["profilePicker", "profileRatings", "ratingPrompt"].includes(key);
    config.askToRateAfterMinutesPlayed = 1;
    // Straight on the wheel, where the prompt shows; the Profiles are switched by hand.
    config.startupScreen = "wheel";
    config.language = "en";

    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();

    const ratingPrompts = () => fake.shownMenus().filter(menu => menu.id === "ratingPrompt").length;
    async function play(configId) {
        const game = fake.getGameInfo(configId);
        fake.gameStarted(game);
        fake.advanceTime(PLAYED_SECONDS * 1000);
        game.playTime = PLAYED_SECONDS;
        fake.gameOver(game);
        fake.fire("wheelmode");
        await settle();
    }

    getProfileStore().switchTo("Bob");
    await play(MEDIEVAL);
    assert.equal(ratingPrompts(), 1, "Bob is asked about Medieval Madness, which Alice rated");
    fake.closeMenu();
    await settle();

    getProfileStore().switchTo("Alice");
    await play(MARS);
    assert.equal(ratingPrompts(), 1, "Alice is not asked about Attack from Mars, which she rated");
    assertNoErrorLogged(fake);
});
