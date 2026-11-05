// ============================================================
// A completion Achievement whose group shrinks, through main.js on the fake
// PinballY globals: once the last table the Profile never played stops being
// configured, the Achievement unlocks at the next check and its toast shows
// on the return to the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import config from "../../common/core/config.js";
import { ACHIEVEMENT_RANK } from "../../common/achievements/achievements.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 8, 23, 10, 0, 0);
// Longer than a toast's whole life, so that the startup's toasts are over.
const ONE_TOAST_MS = 6000;
const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const GUEST_PROFILE_FILE = `${PACK}\\profiles\\guest\\profile.json`;

const table = (id, title, manufacturer, year) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true,
});

const PLAYED = table(1, "Played", "Williams", 1997);
const NEVER_PLAYED = table(2, "Never Played", "Williams", 1995);
const OTHER = table(3, "Other", "Bally", 1980);

test("a manufacturer's Achievement unlocks when its last unplayed table stops being configured", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [PLAYED, NEVER_PLAYED, OTHER] });
    fake.addFile(GUEST_PROFILE_FILE, JSON.stringify({
        version: 1,
        notified: [],
        plays: { [PLAYED.configId]: { count: 1, seconds: 600, lastPlayed: "2026-09-01T20:00:00" } },
    }));
    for (const rank of Object.values(ACHIEVEMENT_RANK)) fake.addFile(`${PACK}\\assets\\images\\rank_${rank}_tile.png`, "PNG");
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "achievements";
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const WILLIAMS_TITLE = lang.achievements.manufacturerCompletionTitle("Williams");
    const williamsToasts = () => toastDrawings(fake).filter(drawing => drawing.texts.includes(WILLIAMS_TITLE));

    await import("../../main.js");
    await settle();
    fake.advanceTime(5 * ONE_TOAST_MS);
    assert.equal(williamsToasts().length, 0, "a Williams table is left to play");

    fake.setTables([PLAYED, { ...NEVER_PLAYED, isConfigured: false }, OTHER]);
    fake.gameStarted(OTHER);
    await settle();
    fake.advanceTime(5 * ONE_TOAST_MS);
    assert.equal(williamsToasts().length, 0, "no toast during the game");

    fake.gameOver(OTHER);
    await settle();
    fake.advanceTime(5 * ONE_TOAST_MS);
    assert.equal(williamsToasts().length, 1, "its toast shows on the return to the wheel");
    assertNoErrorLogged(fake);
});
