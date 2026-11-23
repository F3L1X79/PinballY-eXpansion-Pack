// ============================================================
// Welcome Screen Period Table cards, through main.js on the fake PinballY
// globals, in French on a portrait window: the day's table played today
// reads "Jouée aujourd'hui"; a week Streak of 1 not played yet shows no
// grey line; a name too long for the card is cut with "…"; Select on the
// week's card launches the Table of the Week and locks it for the week.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, periodCards, choose } from "./welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET = `${PROFILES}\\cabinet.json`;

const table = (id, title, configId) => ({ id, configId, title, playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false });
const LONG_TITLE = "The Wizard of Oz and the Many Wonderful Adventures of Dorothy Gale Down the Yellow Brick Road";
const OZ = table(1, `${LONG_TITLE} (Jersey Jack 2013)`, "Wizard of Oz (Jersey Jack 2013)");
const MARS = table(2, "Attack from Mars (Bally 1995)", "Attack from Mars (Bally 1995)");

test("in French, the Welcome Screen says a Period Table was played, cuts a long name and launches the week's table", async () => {
    // Wednesday 23 September 2026: its week starts Monday 21.
    const fake = createFakePinballYHost({
        now: new Date(2026, 8, 23, 15, 0, 0), tables: [OZ, MARS], layoutSize: { width: 1080, height: 1920 },
    });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({
        version: 1, notified: [],
        plays: { [OZ.configId]: { count: 1, seconds: 600, lastPlayed: "2026-09-23T11:00:00" } },
        streaks: {
            tableOfTheDay: { current: 4, longest: 4, lastPeriod: "2026-09-23", periodsPlayed: 4 },
            tableOfTheWeek: { current: 1, longest: 1, lastPeriod: "2026-09-14", periodsPlayed: 1 },
        },
    }));
    // This week's table is not picked yet, and never repeats last week's.
    fake.addFile(CABINET, JSON.stringify({
        version: 1,
        activeProfile: "Alice",
        tableOfTheDay: { configId: OZ.configId, period: "2026-09-23" },
        tableOfTheWeek: { configId: OZ.configId, period: "2026-09-14" },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["startupChoicePrompt", "profilePicker"].includes(key);
    config.language = "fr";

    const { default: lang } = await import("../../common/core/i18n.js");
    const CARDS = lang.welcomeScreen.periodCards;
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);

    const [day, week] = periodCards(fake);
    assert.equal(day.period, "TABLE DU JOUR");
    assert.equal(day.mastery, lang.tableMastery.levelNames[0]);
    assert.equal(day.line, "Jouée aujourd'hui");
    assert.ok(day.name.endsWith("…") && LONG_TITLE.startsWith(day.name.slice(0, -1).trimEnd()), day.name);
    assert.deepEqual(week, { period: "TABLE DE LA SEMAINE", name: "Attack from Mars", mastery: "Table à découvrir", line: null });
    assert.equal(CARDS.day.streak, "jours d'affilée sur la table du jour : continue !");
    assert.equal(CARDS.week.streak, "semaines d'affilée sur la table de la semaine !");
    assert.equal(CARDS.week.played, "Jouée cette semaine");

    choose(fake, "TABLE DE LA SEMAINE");
    await settle();
    assert.deepEqual(fake.launches().map(game => game.configId), [MARS.configId]);
    assert.deepEqual(JSON.parse(fake.readFile(CABINET)).tableOfTheWeek, { configId: MARS.configId, period: "2026-09-21" });
    assertNoErrorLogged(fake);
});
