// ============================================================
// The Easter Eggs' Achievements: standalone Secret Achievements, Platinum,
// of the Surprises family, Unlocked from what the Easter Egg rules recorded.
// Called by achievements_engine.js; no side effects.
// - Apart from buildSurprisesAchievements, whose IDs are pinned as they are.
// ============================================================

import { ACHIEVEMENT_FAMILY, ACHIEVEMENT_RANK, standaloneAchievement } from "../common/achievements/achievements.js";
import lang from "../common/core/i18n.js";
import { EASTER_EGG, getEasterEggRules } from "../common/easter_eggs/easter_egg_rules.js";

export function buildEasterEggAchievements() {
    const { achievements: TEXT } = lang;
    const rules = getEasterEggRules();
    return [
        standaloneAchievement({
            id: "corvusExMachina",
            family: ACHIEVEMENT_FAMILY.SURPRISES,
            rank: ACHIEVEMENT_RANK.PLATINUM,
            getTitle: () => TEXT.corvusExMachinaTitle(),
            getDescription: () => TEXT.corvusExMachinaDescription(),
            getHint: () => TEXT.corvusExMachinaHint(),
            checkUnlocked: () => rules.hasPlayed(EASTER_EGG.CROW),
        }),
        standaloneAchievement({
            id: "ghostInTheMachine",
            family: ACHIEVEMENT_FAMILY.SURPRISES,
            rank: ACHIEVEMENT_RANK.PLATINUM,
            isSilent: true,
            getTitle: () => TEXT.ghostInTheMachineTitle(),
            getDescription: () => TEXT.ghostInTheMachineDescription(),
            getHint: () => TEXT.ghostInTheMachineHint(),
            checkUnlocked: () => rules.hasPlayed(EASTER_EGG.MENU_GLITCH),
        }),
    ];
}
