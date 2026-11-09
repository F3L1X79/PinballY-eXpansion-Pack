// ============================================================
// Profile Stats with Plays already saved on an Untracked Table, through
// main.js on the fake PinballY globals: neither first, last nor favourite
// table, nor in the totals the Household Stats read too; back once unlisted.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { setUntrackedTables } from "../../common/core/untracked_tables.js";
import { readOwnSection } from "./profile_stats_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const GUEST = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest";
const HOUR = 3600;
// Past every startup toast.
const ALL_TOASTS_MS = 600000;

const table = (id, title, manufacturer, year) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true,
});
const MEDIEVAL = table(1, "Medieval Madness", "Williams", 1997);
const MARS = table(2, "Attack from Mars", "Bally", 1995);
const PLAYER = table(3, "Media Player", "Homebrew", 2020);

const playLogJson = plays => JSON.stringify({ version: 1, plays });

async function start() {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: [MEDIEVAL, MARS, PLAYER] });
    fake.addFile(`${GUEST}\\profile.json`, JSON.stringify({
        version: 1,
        plays: {
            [MEDIEVAL.configId]: { count: 2, seconds: 1200, lastPlayed: "2026-09-20T20:00:00" },
            [MARS.configId]: { count: 1, seconds: 600, lastPlayed: "2026-09-21T20:00:00" },
            [PLAYER.configId]: { count: 10, seconds: 10 * HOUR, lastPlayed: "2026-09-22T20:00:00" },
        },
        notified: [],
    }));
    // The Media Player alone fills the oldest year, and starts 2026 too.
    fake.addFile(`${GUEST}\\play-log-2025.json`, playLogJson([
        { start: "2025-03-01T21:00:00", configId: PLAYER.configId, seconds: HOUR },
    ]));
    fake.addFile(`${GUEST}\\play-log-2026.json`, playLogJson([
        { start: "2026-01-02T21:00:00", configId: PLAYER.configId, seconds: HOUR },
        { start: "2026-09-01T21:00:00", configId: MEDIEVAL.configId, seconds: 600 },
        { start: "2026-09-05T21:00:00", configId: MARS.configId, seconds: 600 },
    ]));
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["achievements", "challenges", "tableMastery"].includes(key);
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { readProfileStats } = await import("../../addons/achievements_engine.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(ALL_TOASTS_MS);
    return { fake, lang, readProfileStats };
}

test("an Untracked Table's saved Plays leave the Profile Stats, and come back once unlisted", async () => {
    const { fake, lang, readProfileStats } = await start();
    const TEXT = lang.profileStats;
    const tastes = () => readOwnSection(fake, lang, TEXT.sections.tastes);
    const game = () => readOwnSection(fake, lang, TEXT.sections.game);

    setUntrackedTables("Media Player");
    const listed = tastes();
    assert.equal(listed[TEXT.stats.firstTablePlayed][0], "Medieval Madness", "the next table in the Play Log");
    assert.equal(listed[TEXT.stats.lastTablePlayed][0], "Attack from Mars", "the next table by last played");
    assert.equal(listed[TEXT.stats.favouriteTable][0], "Medieval Madness", "out of the Hall of Fame");
    assert.deepEqual(readProfileStats().plays, { count: 3, seconds: 1800 }, "the totals the Household Stats show");
    assert.deepEqual(game()[TEXT.stats.gamesPlayed], ["3"]);

    setUntrackedTables("");
    const unlisted = tastes();
    assert.equal(unlisted[TEXT.stats.firstTablePlayed][0], "Media Player");
    assert.equal(unlisted[TEXT.stats.lastTablePlayed][0], "Media Player");
    assert.equal(unlisted[TEXT.stats.favouriteTable][0], "Media Player");
    assert.deepEqual(readProfileStats().plays, { count: 13, seconds: 10 * HOUR + 1800 });
    assertNoErrorLogged(fake);
});
