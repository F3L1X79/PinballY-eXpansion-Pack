// ============================================================
// Secret Achievements through main.js: while missing, their rows show "???"
// and their hint with a muted emblem, ordered and counted like any other;
// once Unlocked, the toast and row show the real title and description.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import { chromeTexts, headerRankCounts, press, readRows, untilListShown } from "./achievement_list_reader.js";
import { RANK_COLORS } from "../../common/drawing/steamball_palette.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 8, 23, 10, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// Only the muted emblems have their image: the header's are drawn, so its
// per-rank recap can be read from its colours.
const mutedEmblem = rank => `C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\rank_${rank}_missing.png`;
const avatarOf = name => `${PROFILES}\\${name}\\avatar.png`;
// Longer than an Achievement Toast's whole life (rise, hold, fade).
const TOAST_MS = 6000;
// Inside the rage quit's window of 30 seconds to under a minute.
const RAGE_QUIT_SECONDS = 40;

// No manufacturer and never replayed, so a play can't unlock the Day's
// Manufacturers or the grand return.
function table(id, title) {
    return {
        id, configId: title, title, manufacturer: "", year: 0, categories: [],
        playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false,
    };
}

const TABLE = table(1, "Homebrew Table");
// Kept as the Table of the Day and of the Week, so the play below never
// counts as a Period Table play.
const PERIOD_TABLE = table(2, "Period Table");

test("a Secret Achievement keeps its title and description out of sight until Unlocked", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [TABLE, PERIOD_TABLE] });
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({
        version: 1, activeProfile: "Alice",
        tableOfTheDay: { configId: PERIOD_TABLE.configId, period: "2026-09-23" },
        tableOfTheWeek: { configId: PERIOD_TABLE.configId, period: "2026-09-21" },
    }));
    // Bob has the Rage Quit and the Mini Marathon, defined before it.
    for (const [name, notified] of [["Alice", []], ["Bob", ["marathon:30", "rageQuit"]]]) {
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, notified }));
        fake.addFile(avatarOf(name), "PNG");
    }
    for (const rank of ["bronze", "silver", "gold", "platinum"]) fake.addFile(mutedEmblem(rank), "PNG");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["sessionStatsTracker", "achievements"].includes(key);
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { RAGE_QUIT_MIN_SECONDS, RAGE_QUIT_MAX_SECONDS, GRAND_RETURN_THRESHOLD_DAYS } = await import("../../addons/session_stats_tracker.js");
    const TEXT = lang.achievements;
    const LIST_TEXT = lang.achievementList;
    const SURPRISES_HINTS = [TEXT.nightOwlHint(), TEXT.fullMoonNightHint(), TEXT.fridayThe13thHint(), TEXT.fourSeasonsHint(), TEXT.oneMoreGameHint(), TEXT.lunchBreakHint(), TEXT.mirrorHourHint()];
    const rageQuit = { title: TEXT.rageQuitTitle(), description: TEXT.rageQuitDescription(RAGE_QUIT_MIN_SECONDS, RAGE_QUIT_MAX_SECONDS) };
    const grandReturn = { title: TEXT.grandReturnTitle(), description: TEXT.grandReturnDescription(GRAND_RETURN_THRESHOLD_DAYS) };
    await import("../../main.js");
    await settle();

    function openList() {
        fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
        fake.selectMenuItem(LIST_TEXT.menuEntry);
        untilListShown(fake);
        return readRows(fake, LIST_TEXT);
    }

    // Whether the header's total counts every row and its Bronze count every
    // Unlocked Bronze row (in Bronze's colour), Secret Achievements included.
    function headerCountsEvery(rows) {
        const unlocked = rows.filter(row => row.unlocked).length;
        const unlockedBronze = rows.filter(row => row.unlocked && row.fills.includes(RANK_COLORS.bronze)).length;
        return chromeTexts(fake).includes(LIST_TEXT.totalLine(unlocked, rows.length, Math.round(100 * unlocked / rows.length)))
            && headerRankCounts(fake).bronze === String(unlockedBronze);
    }

    // Missing: "???" and the hint, never the real texts.
    const rows = openList();
    const secretRows = rows.filter(row => row.title === LIST_TEXT.secretTitle);
    assert.deepEqual(secretRows.map(row => row.description), [TEXT.rageQuitHint(), TEXT.worldTourHint(), TEXT.grandReturnHint(), ...SURPRISES_HINTS, TEXT.corvusExMachinaHint()]);
    const shownTexts = rows.flatMap(row => [row.title, row.description]);
    for (const text of [rageQuit.title, rageQuit.description, grandReturn.title, grandReturn.description]) {
        assert.ok(!shownTexts.includes(text), `"${text}" stays out of sight`);
    }
    const [rageQuitRow, , grandReturnRow] = secretRows;
    for (const row of secretRows) assert.equal(row.unlocked, false);
    // Its own rank's muted emblem: Bronze for the Rage Quit, Silver for the
    // World Tour and the Grand Return, then the Surprises' own ranks.
    assert.deepEqual(secretRows.map(row => row.emblem),
        ["bronze", "silver", "silver", "gold", "gold", "platinum", "gold", "bronze", "silver", "silver", "platinum"].map(mutedEmblem));
    assert.deepEqual(rageQuitRow.owners.avatars, [avatarOf("Bob")], "the Avatars of the Profiles that have it");
    assert.deepEqual(grandReturnRow.owners.avatars, []);

    // Ordered by Unlock Rate, then in natural order, like any other.
    const missing = rows.filter(row => !row.unlocked);
    assert.deepEqual(missing.slice(0, 2).map(row => row.title), [TEXT.marathonTitles[30], LIST_TEXT.secretTitle]);
    assert.equal(missing[1].description, TEXT.rageQuitHint());

    // Counted in the header's total and per-rank recap.
    assert.ok(headerCountsEvery(rows));
    press(fake, "Exit");

    // A rage quit: the toast reveals the real title and description.
    const before = toastDrawings(fake).length;
    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    await settle();
    fake.advanceTime(RAGE_QUIT_SECONDS * 1000);
    fake.gameOver(TABLE);
    await settle();
    for (let guard = 0; guard < 100; guard++) {
        const shownCount = toastDrawings(fake).length;
        fake.advanceTime(TOAST_MS);
        if (toastDrawings(fake).length === shownCount) break;
    }
    const toast = toastDrawings(fake).slice(before).map(drawing => drawing.texts).find(texts => texts.includes(rageQuit.title));
    assert.ok(toast, "the Rage Quit is announced");
    assert.ok(toast.includes(rageQuit.description), toast.join(" | "));
    assert.ok(!toast.includes(LIST_TEXT.secretTitle) && !toast.includes(TEXT.rageQuitHint()), toast.join(" | "));

    // Unlocked: its row shows the real texts, and it counts as Unlocked Bronze.
    const rowsAfter = openList();
    const unlockedRageQuit = rowsAfter.find(row => row.title === rageQuit.title);
    assert.ok(unlockedRageQuit, "its row shows its real title");
    assert.equal(unlockedRageQuit.description, rageQuit.description);
    assert.equal(unlockedRageQuit.unlocked, true);
    assert.deepEqual(rowsAfter.filter(row => row.title === LIST_TEXT.secretTitle).map(row => row.description), [TEXT.worldTourHint(), TEXT.grandReturnHint(), ...SURPRISES_HINTS, TEXT.corvusExMachinaHint()]);
    assert.ok(headerCountsEvery(rowsAfter));

    assertNoErrorLogged(fake);
});
