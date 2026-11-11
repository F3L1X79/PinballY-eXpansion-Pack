// ============================================================
// The "every System" Achievement (World Walker) through main.js on the fake
// PinballY globals: absent with a single System, missing with Systems played
// out of Systems seen as its progress, announced once Unlocked, and missing
// again when a new System with tables appears, with no second toast after.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, table, PROFILES_FOLDER } from "./achievement_progress_scenario.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const VPX = { displayName: "Visual Pinball X" };
const PINBALL_FX = { displayName: "Pinball FX" };
const FUTURE_PINBALL = { displayName: "Future Pinball" };
const onSystem = (game, system, more = {}) => ({ ...game, system, ...more });

const MEDIEVAL = onSystem(table(1, "Medieval Madness", "Williams", 1997), VPX);
const TWILIGHT = onSystem(table(2, "Twilight Zone", "Williams", 1993), VPX);
// A System seen only through a hidden table never counts.
const HIDDEN_FUTURE = onSystem(table(3, "Hidden Future", "Gottlieb", 1978), FUTURE_PINBALL, { isHidden: true });
const FX_ATTACK = onSystem(table(4, "FX Attack", "Zen", 2021), PINBALL_FX);
const FUTURE_SPACE = onSystem(table(5, "Future Space", "Gottlieb", 1979), FUTURE_PINBALL);

const GUEST_PROFILE = {
    version: 1,
    notified: [],
    plays: { [MEDIEVAL.configId]: { count: 1, seconds: 600, lastPlayed: "2026-09-01T20:00:00" } },
};

const scenario = await startScenario({
    now: new Date(2026, 8, 23, 10, 0, 0),
    tables: [MEDIEVAL, TWILIGHT, HIDDEN_FUTURE],
    files: { [`${PROFILES_FOLDER}\\guest\\profile.json`]: GUEST_PROFILE },
});
const { fake, lang, play, readShown, listedTitles, unlockedRow, missingRow } = scenario;
const WORLD_WALKER = lang.achievements.everySystemTitle();
const { getAllAchievements } = await import("../../addons/achievements_engine.js");
const toastsOfWorldWalker = () => toastDrawings(fake).filter(drawing => drawing.texts.includes(WORLD_WALKER)).length;
const everySystem = () => getAllAchievements().find(({ id }) => id === "everySystem");

test("with a single System among the tables the Profile can see, there is no World Walker", () => {
    assert.ok(!listedTitles().includes(WORLD_WALKER));
    assert.equal(everySystem(), undefined);
    assertNoErrorLogged(fake);
});

test("with two Systems, World Walker is a Bronze one with Systems played out of Systems seen as its progress", async () => {
    fake.setTables([MEDIEVAL, TWILIGHT, HIDDEN_FUTURE, FX_ATTACK]);
    await play(TWILIGHT);

    assert.deepEqual(readShown([WORLD_WALKER]), [missingRow(WORLD_WALKER, "systems", 1, 2)]);
    assert.equal(everySystem().rank, "bronze");
    assert.equal(everySystem().getDescription(), lang.achievements.everySystemDescription(2));
    assert.equal(toastsOfWorldWalker(), 0);
    assertNoErrorLogged(fake);
});

test("a table played on each System unlocks World Walker and announces it", async () => {
    await play(FX_ATTACK);

    assert.equal(toastsOfWorldWalker(), 1);
    assert.deepEqual(readShown([WORLD_WALKER]), [unlockedRow(WORLD_WALKER)]);
    assertNoErrorLogged(fake);
});

test("a third System makes it missing again, and playing one of its tables brings it back without a second toast", async () => {
    fake.setTables([MEDIEVAL, TWILIGHT, HIDDEN_FUTURE, FX_ATTACK, FUTURE_SPACE]);
    assert.deepEqual(readShown([WORLD_WALKER]), [missingRow(WORLD_WALKER, "systems", 2, 3)]);
    assert.equal(everySystem().getDescription(), lang.achievements.everySystemDescription(3));

    await play(FUTURE_SPACE);

    assert.deepEqual(readShown([WORLD_WALKER]), [unlockedRow(WORLD_WALKER)]);
    assert.equal(toastsOfWorldWalker(), 1, "announced only once");
    assertNoErrorLogged(fake);
});
