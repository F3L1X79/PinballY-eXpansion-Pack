// ============================================================
// The Achievement List through main.js on the fake globals: its entry in the
// player section after Profile Stats, the real Achievements in order, and
// Exit going back to the main menu or to the Profile Stats it came from.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { pressAndGlide, readRows, isListOpen, untilListShown } from "./achievement_list_reader.js";
import { openProfileStats, buttons, choose, isProfileStatsOpen } from "../stats/profile_stats_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { mainMenuSection } from "../support/main_menu_reader.js";

const NOW = new Date(2026, 8, 23, 10, 0, 0);
const SECONDS_PER_HOUR = 3600;

function table(id, title, manufacturer, year, categories, playCount) {
    return {
        id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories,
        playCount, playTime: playCount * SECONDS_PER_HOUR, lastPlayed: playCount > 0 ? new Date(2026, 8, id) : null,
        rating: -1, isHidden: false,
    };
}

// Listed out of order on purpose. Played: Williams, Gottlieb, Stern, so
// 3 of 5 tables and 9 hours of play.
const TABLES = [
    table(1, "Medieval Madness", "Williams", 1997, ["Fantasy"], 5),
    table(2, "Attack from Mars", "Bally", 1995, ["SciFi"], 0),
    table(3, "Close Encounters", "Gottlieb", 1978, ["SciFi"], 1),
    table(4, "Godzilla", "Stern", 2021, ["Monsters"], 3),
    table(5, "Space Shuttle", "Zaccaria", 1987, ["SciFi"], 0),
];

// Guest's play record matches PinballY's play stats above. Guest was
// Notified of the 10 % Collection Achievement, then of the first table.
const GUEST_PROFILE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest\\profile.json";
const GUEST_PLAYS = Object.fromEntries(TABLES.filter(game => game.playCount > 0).map(game =>
    [game.configId, { count: game.playCount, seconds: game.playTime, lastPlayed: "2026-09-01T20:00:00" }]));
const GUEST_NOTIFIED = ["collectionMilestone:10percent", "collectionMilestone:firstTable"];

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "achievements"];

test("the Achievement List entry sits in the player section, lists the real Achievements and Exit goes back one level", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFile(GUEST_PROFILE_FILE, JSON.stringify({ version: 1, plays: GUEST_PLAYS, notified: GUEST_NOTIFIED }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.achievementList;
    const ACHIEVEMENT = lang.achievements;
    const progress = (unit, current, target) => TEXT.progressUnits[unit].short(current, target);
    await import("../../main.js");
    await settle();

    const openMainMenu = () => fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }, { title: "Exit", cmd: 99 }]);
    assert.deepEqual(mainMenuSection(fake, TEXT.menuEntry, openMainMenu), [lang.profileStats.menuEntry, TEXT.menuEntry]);

    openMainMenu();
    fake.selectMenuItem(TEXT.menuEntry);
    untilListShown(fake);
    const rows = readRows(fake, TEXT);
    // A threshold without its title in lang/en.js would show as undefined.
    assert.ok(rows.every(row => typeof row.title === "string" && row.title !== "" && row.description !== ""), "every Achievement has its texts");
    const rowOf = title => rows.find(row => row.title === title);

    const unlocked = rows.filter(row => row.unlocked).map(row => row.title);
    // The ones whose toast still waits, in natural order, then from the most
    // recently Notified.
    assert.deepEqual(unlocked.slice(-2), [ACHIEVEMENT.firstTableTitle(), ACHIEVEMENT.collectionPercentTitles[10]]);
    assert.deepEqual(new Set(unlocked), new Set([
        ...["Gottlieb", "Stern", "Williams"].map(name => ACHIEVEMENT.manufacturerCompletionTitle(name)),
        ACHIEVEMENT.firstTableTitle(),
        ...[10, 25, 50].map(percent => ACHIEVEMENT.collectionPercentTitles[percent]),
        ...[1, 5].map(hours => ACHIEVEMENT.playTimeMilestoneTitles[hours]),
        ...[1970, 2020].map(year => ACHIEVEMENT.decadeCompletionTitle(year)),
    ]));
    assert.ok(rows.filter(row => row.unlocked).every(row => row.progress === null), "an Unlocked row shows no Achievement Progress");

    assert.equal(rowOf(ACHIEVEMENT.collectionPercentTitles[75]).progress, progress("tables", 3, 4));
    assert.equal(rowOf(ACHIEVEMENT.collectionPercentTitles[100]).progress, progress("tables", 3, 5));
    assert.equal(rowOf(ACHIEVEMENT.playTimeMilestoneTitles[10]).progress, progress("hours", 9, 10));
    assert.equal(rowOf(ACHIEVEMENT.decadeCompletionTitle(1990)).progress, progress("tables", 1, 2));
    assert.equal(rowOf(ACHIEVEMENT.manufacturerCompletionTitle("Bally")).progress, null, "a target of 1 shows none");
    // Guest alone has no Unlock Rate: the missing ones come by how far
    // along their Achievement Progress is, then in their natural order.
    const missing = rows.filter(row => !row.unlocked).map(row => row.title);
    const indexOf = title => missing.indexOf(title);
    assert.ok(indexOf(ACHIEVEMENT.playTimeMilestoneTitles[10]) < indexOf(ACHIEVEMENT.collectionPercentTitles[75]), "9/10 before 3/4");
    assert.ok(indexOf(ACHIEVEMENT.collectionPercentTitles[75]) < indexOf(ACHIEVEMENT.collectionPercentTitles[100]), "3/4 before 3/5");
    assert.ok(indexOf(ACHIEVEMENT.playTimeMilestoneTitles[50]) < indexOf(ACHIEVEMENT.playTimeMilestoneTitles[100]), "9/50 before 9/100");

    pressAndGlide(fake, "Exit");
    assert.equal(isListOpen(fake), false);
    assert.equal(fake.executedCommands().at(-1), globalThis.command.ShowMainMenu, "the main menu reopens");
    openMainMenu();
    assert.deepEqual(fake.currentMenu().items.filter(item => item.selected).map(item => item.title), [TEXT.menuEntry],
        "on the Achievement List entry");
    fake.closeMenu();
    openMainMenu();
    assert.deepEqual(fake.currentMenu().items.filter(item => item.selected), [], "only once");

    // From the Profile Stats' Achievements button, Exit shows them again.
    openProfileStats(fake, lang);
    assert.equal(buttons(fake)[0].count, lang.profileStats.fraction(unlocked.length, rows.length));
    choose(fake, lang.profileStats.buttons.achievements);
    untilListShown(fake);
    assert.ok(isListOpen(fake));
    pressAndGlide(fake, "Exit");
    assert.equal(isListOpen(fake), false);
    assert.equal(isProfileStatsOpen(fake), true);

    assertNoErrorLogged(fake);
});
