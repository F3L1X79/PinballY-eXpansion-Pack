// ============================================================
// Startup Screen pick and the startup check's toasts: Bob, active at the
// start, and Alice have both rated a table. Picking Alice shows her First
// Verdict only; Bob's, never shown, shows once he becomes active again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { toastDrawings } from "./achievement_toast_reader.js";
import { press } from "../welcome_screen/welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker, CAROUSEL_OPEN_MS, GLIDE_OVER_MS } from "../core/startup_picker_scenario.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// Longer than an Achievement Toast's whole life (rise, hold, fade).
const TOAST_MS = 6000;
const MEDIEVAL = {
    id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: 4, isFavorite: false, isHidden: false,
};

function seed(fake) {
    for (const name of ["Alice", "Bob"]) {
        fake.addFile(`${PROFILES}\\${name}\\ratings.json`, JSON.stringify({ version: 1, ratings: { "Medieval Madness": 4 }, favorites: [] }));
    }
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: "Bob" }));
}

test("the startup check's toasts are dropped when the Startup Screen picks another Profile, and shown at its next switch", async () => {
    const { fake, lang, store, settle } = await startOnProfilePicker({
        addOns: ["profilePicker", "achievements", "sessionStatsTracker", "profileRatings"], tables: [MEDIEVAL], seed,
    });
    const title = lang.achievements.ratingsTitles[1];
    let readCount = 0;
    // The First Verdict toasts shown since the last call, once every waiting toast has shown.
    async function newFirstVerdicts() {
        for (let guard = 0; guard < 100; guard++) {
            const shownCount = toastDrawings(fake).length;
            fake.advanceTime(TOAST_MS);
            await settle();
            if (toastDrawings(fake).length === shownCount) break;
        }
        const drawings = toastDrawings(fake);
        const count = drawings.slice(readCount).filter(drawing => drawing.texts.includes(title)).length;
        readCount = drawings.length;
        return count;
    }
    const isNotified = name => store.getNotifiedOf(name).includes("ratings:1");

    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS);
    press(fake, "Prev");
    fake.advanceTime(GLIDE_OVER_MS);
    press(fake, "Select");
    await settle();
    assert.equal(store.getActiveProfile().name, "Alice", "the pick switches");
    assert.equal(await newFirstVerdicts(), 1, "a single First Verdict, Alice's");
    assert.equal(isNotified("Alice"), true);
    assert.equal(isNotified("Bob"), false, "Bob's was never shown");

    store.switchTo("Bob");
    await settle();
    assert.equal(await newFirstVerdicts(), 1, "Bob's shows once he is active");
    assert.equal(isNotified("Bob"), true);
    assertNoErrorLogged(fake);
});
