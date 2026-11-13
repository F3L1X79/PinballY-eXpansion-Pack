// ============================================================
// Returning greeting on the Welcome Screen in English, with Change Player:
// a Profile whose last Play is 7 to 30 days old is welcomed back, older
// than that it is told it has been a while; a fresher Play, no Play at all
// and Guest keep the greeting by the hour.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, press, isWelcomeScreenOpen, greeting } from "./welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Wednesday 7 October 2026, in the morning.
const NOW = new Date(2026, 9, 7, 10, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const MEDIEVAL = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness (Williams 1997)",
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false,
};

const entry = start => ({ start, configId: MEDIEVAL.configId, seconds: 600 });
const playLogJson = starts => JSON.stringify({ version: 1, plays: starts.map(entry) });

test("the Welcome Screen welcomes back a Profile after 7 days and tells it it has been a while after 30", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [MEDIEVAL] });
    const addPlays = (name, year, starts) => fake.addFile(`${PROFILES}\\${name}\\play-log-${year}.json`, playLogJson(starts));
    // Last Play 6 days ago, late in the evening.
    addPlays("Alice", 2026, ["2026-09-20T21:00:00", "2026-10-01T23:30:00"]);
    // 7 days ago, early in the morning: calendar days count, not hours.
    addPlays("Bob", 2026, ["2026-09-30T08:00:00"]);
    addPlays("Carol", 2026, ["2026-09-07T21:00:00"]);
    addPlays("Dave", 2026, ["2026-09-06T21:00:00", "2026-08-01T21:00:00"]);
    // Last played the year before.
    addPlays("Frank", 2025, ["2025-12-20T21:00:00"]);
    // Guest is the visitors' Profile once Change Player exists.
    addPlays("Guest", 2026, ["2026-08-01T21:00:00"]);
    fake.addFolder(`${PROFILES}\\Eve`);
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["startupChoicePrompt", "profilePicker"].includes(key);
    config.language = "en";
    config.startupScreen = "welcome";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.welcomeScreen;
    const store = getProfileStore();
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);

    assert.equal(TEXT.returning.week, "Welcome back");
    assert.equal(TEXT.returning.month, "Long time no see");
    const byTheHour = name => TEXT.greetingWithName(TEXT.greetings.morning, name).join("");
    const returning = (name, key) => TEXT.greetingWithName(TEXT.returning[key], name).join("");
    assert.equal(greeting(fake), byTheHour("Alice"), "6 days is not yet a return");
    press(fake, "Exit");

    async function greetingOf(name) {
        store.switchTo(name);
        await settle();
        fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
        const shown = greeting(fake);
        press(fake, "Exit");
        return shown;
    }

    assert.equal(await greetingOf("Bob"), returning("Bob", "week"), "7 days");
    assert.equal(await greetingOf("Carol"), returning("Carol", "week"), "30 days");
    assert.equal(await greetingOf("Dave"), returning("Dave", "month"), "31 days");
    assert.equal(await greetingOf("Frank"), returning("Frank", "month"), "a Play from the year before");
    assert.equal(await greetingOf("Eve"), byTheHour("Eve"), "no Play at all");
    assert.equal(await greetingOf("Guest"), byTheHour("Guest"), "Guest is anybody's Profile");
    assertNoErrorLogged(fake);
});
