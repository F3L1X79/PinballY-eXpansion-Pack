// ============================================================
// Welcome Screen Period Table cards in English: Day and Week cards with
// logo, period (gold, pastel blue), cleaned name, Mastery head and grey
// line, without a button; Next walks through the cards, chosen whole, and
// Select on the day's launches it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    WELCOME_SCREEN_OPEN_MS, isWelcomeScreenOpen, periodCards, periodColors, periodCardLogos, readChoices, choose,
} from "./welcome_screen_reader.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET = `${PROFILES}\\cabinet.json`;
const MEDIEVAL_LOGO = "C:\\PinballY\\Media\\Visual Pinball X\\Wheel Images\\Medieval Madness (Williams 1997).png";

const table = (id, title, configId, extra = {}) => ({
    id, configId, title, playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, ...extra,
});
const MEDIEVAL = table(1, "Medieval Madness (Williams 1997)", "Medieval Madness (Williams 1997)", { wheelImage: MEDIEVAL_LOGO });
// A lost "™", raw then read as Windows-1252, then a parenthetical suffix.
const MARS = table(2, "Attack from Mars\uFFFD \u00EF\u00BF\u00BD Special (Bally 1995)", "Attack from Mars (Bally 1995)");

test("the Welcome Screen shows a card per Period Table and launches the day's", async () => {
    // Wednesday 23 September 2026: its week starts Monday 21.
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: [MEDIEVAL, MARS] });
    fake.addFile(MEDIEVAL_LOGO);
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({
        version: 1, notified: [],
        // Level 2 on Medieval Madness; Attack from Mars never played.
        plays: { [MEDIEVAL.configId]: { count: 3, seconds: 2000, lastPlayed: "2026-09-22T21:00:00" } },
        streaks: {
            tableOfTheDay: { current: 3, longest: 3, lastPeriod: "2026-09-22", periodsPlayed: 3 },
            tableOfTheWeek: { current: 1, longest: 1, lastPeriod: "2026-09-21", periodsPlayed: 1 },
        },
    }));
    fake.addFile(CABINET, JSON.stringify({
        version: 1,
        activeProfile: "Alice",
        tableOfTheDay: { configId: MEDIEVAL.configId, period: "2026-09-23" },
        tableOfTheWeek: { configId: MARS.configId, period: "2026-09-21" },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["startupChoicePrompt", "profilePicker"].includes(key);
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.welcomeScreen;
    const CARDS = TEXT.periodCards;
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);

    assert.deepEqual(periodCards(fake), [
        { period: CARDS.day.period, name: "Medieval Madness", mastery: lang.tableMastery.levelNames[1], line: `3 ${CARDS.day.streak}` },
        { period: CARDS.week.period, name: "Attack from Mars Special", mastery: lang.tableMastery.toDiscover, line: CARDS.week.played },
    ]);
    assert.deepEqual(periodColors(fake), [STEAMBALL_COLORS.gold, STEAMBALL_COLORS.weekPeriod], "the day's period in gold, the week's in pastel blue");
    assert.equal(CARDS.day.streak, "days in a row on the Table of the Day: keep it going!", "the count is in the square before it");
    assert.deepEqual(periodCardLogos(fake), [MEDIEVAL_LOGO, "Attack from Mars Special"], "the title stands in for a missing logo");

    assert.deepEqual(readChoices(fake), [
        lang.profiles.menuEntry, lang.buttonHints.close, CARDS.day.period, CARDS.week.period, TEXT.randomTable, TEXT.stayOn("Medieval Madness"),
    ]);

    choose(fake, CARDS.day.period);
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.deepEqual(fake.launches().map(game => game.configId), [MEDIEVAL.configId]);
    assert.deepEqual(JSON.parse(fake.readFile(CABINET)).tableOfTheDay, { configId: MEDIEVAL.configId, period: "2026-09-23" }, "still today's table");
    assertNoErrorLogged(fake);
});
