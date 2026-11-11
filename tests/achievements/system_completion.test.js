// ============================================================
// System Achievements through main.js on the fake PinballY globals: none
// while the tables the Profile can see use a single System (hidden,
// unconfigured, Untracked and System-less tables left out); one per System,
// sorted by name, unlocked from past plays and announced, once a second
// System has tables.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, table, PROFILES_FOLDER } from "./achievement_progress_scenario.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import { setUntrackedTables } from "../../common/core/untracked_tables.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const VPX = { displayName: "Visual Pinball X" };
const PINBALL_FX = { displayName: "Pinball FX" };
const onSystem = (game, system, more = {}) => ({ ...game, system, ...more });

const MEDIEVAL = onSystem(table(1, "Medieval Madness", "Williams", 1997), VPX);
const TWILIGHT = onSystem(table(2, "Twilight Zone", "Williams", 1993), VPX);
const ADDAMS = onSystem(table(3, "Addams Family", "Williams", 1992), VPX);
const HIDDEN_VPX = onSystem(table(4, "Haunted House", "Gottlieb", 1982), VPX, { isHidden: true });
// Each on a System of its own, which must never count.
const HIDDEN_FUTURE = onSystem(table(5, "Hidden Future", "Gottlieb", 1978), { displayName: "Future Pinball" }, { isHidden: true });
const UNCONFIGURED_FX = onSystem(table(6, "Unconfigured FX", "Zen", 2020), PINBALL_FX, { isConfigured: false });
const MEDIA_PLAYER = onSystem(table(7, "Media Player", "", 0), { displayName: "PinUP Popper" });
const NO_SYSTEM = table(8, "Homebrew", "VPX Community", 2023);
const SINGLE_SYSTEM_TABLES = [MEDIEVAL, TWILIGHT, ADDAMS, HIDDEN_VPX, HIDDEN_FUTURE, UNCONFIGURED_FX, MEDIA_PLAYER, NO_SYSTEM];

const FX_ATTACK = onSystem(table(9, "FX Attack", "Zen", 2021), PINBALL_FX);
const FX_CASTLE = onSystem(table(10, "FX Castle", "Zen", 2022), PINBALL_FX);

const playedLongAgo = { count: 1, seconds: 600, lastPlayed: "2026-09-01T20:00:00" };
const GUEST_PROFILE = {
    version: 1,
    notified: [],
    plays: Object.fromEntries([MEDIEVAL, FX_ATTACK, FX_CASTLE].map(game => [game.configId, playedLongAgo])),
};

const SYSTEM_ID = /^systemCompletion:/;

setUntrackedTables(MEDIA_PLAYER.title);
const scenario = await startScenario({
    now: new Date(2026, 8, 23, 10, 0, 0),
    tables: SINGLE_SYSTEM_TABLES,
    files: { [`${PROFILES_FOLDER}\\guest\\profile.json`]: GUEST_PROFILE },
});
const { fake, lang, play, readShown, listedTitles, unlockedRow, missingRow } = scenario;
const ACHIEVEMENT = lang.achievements;
const { getAllAchievements } = await import("../../addons/achievements_engine.js");
const EVERY_SYSTEM_TITLE = ["Visual Pinball X", "Future Pinball", "Pinball FX", "PinUP Popper"]
    .map(name => ACHIEVEMENT.systemCompletionTitle(name));
const systemTitles = () => listedTitles().filter(title => EVERY_SYSTEM_TITLE.includes(title));

test("with a single System among the tables the Profile can see, there is no System Achievement", () => {
    assert.deepEqual(systemTitles(), []);
    assert.deepEqual(getAllAchievements().filter(({ id }) => SYSTEM_ID.test(id)), []);
    assertNoErrorLogged(fake);
});

test("with two Systems, one Achievement per System, unlocked from past plays and announced", async () => {
    fake.setTables([...SINGLE_SYSTEM_TABLES, FX_ATTACK, FX_CASTLE]);
    const fxMaster = ACHIEVEMENT.systemCompletionTitle("Pinball FX");
    const vpxMaster = ACHIEVEMENT.systemCompletionTitle("Visual Pinball X");

    await play(TWILIGHT);
    assert.equal(toastDrawings(fake).filter(drawing => drawing.texts.includes(fxMaster)).length, 1, "its toast showed");
    assert.equal(toastDrawings(fake).filter(drawing => drawing.texts.includes(vpxMaster)).length, 0);
    assert.deepEqual(readShown([fxMaster, vpxMaster]), [
        unlockedRow(fxMaster),
        missingRow(vpxMaster, "tables", 2, 3),
    ]);

    const achievements = getAllAchievements();
    const ids = achievements.map(({ id }) => id);
    const systemIds = ids.filter(id => SYSTEM_ID.test(id));
    assert.deepEqual(systemIds, ["systemCompletion:Pinball FX", "systemCompletion:Visual Pinball X"], "sorted by name");
    const lastManufacturer = ids.findLastIndex(id => id.startsWith("manufacturerCompletion:"));
    assert.equal(ids.indexOf(systemIds[0]), lastManufacturer + 1, "right after the manufacturer completions");
    const descriptionOf = id => achievements.find(achievement => achievement.id === id).getDescription();
    assert.equal(descriptionOf("systemCompletion:Pinball FX"), ACHIEVEMENT.systemCompletionDescription("Pinball FX", 2));
    assert.equal(descriptionOf("systemCompletion:Visual Pinball X"), ACHIEVEMENT.systemCompletionDescription("Visual Pinball X", 3));
    assertNoErrorLogged(fake);
});
