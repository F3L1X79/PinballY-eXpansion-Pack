// ============================================================
// Steamball palette and typography, shared by the Achievement List, the
// Achievement Toast and the Challenge Card so that they look like one
// product. Colours are ARGB, validated on the cabinet. Only constants:
// no drawing, no event, no side effect.
// ============================================================

import { ACHIEVEMENT_RANK } from "../achievements/achievements.js";

export const STEAMBALL_COLORS = Object.freeze({
    panel: 0xFF171D27,
    // Top of the panel's gradients (toast card, list header).
    panelTop: 0xFF2A3547,
    // The Challenge Card's panel, lets the wheel show through a little.
    panelTranslucent: 0xEB171D27,
    rowUnlocked: 0xFF222A38,
    rowMissing: 0xFF1A1F29,
    border: 0xFF3E4C60,
    tile: 0xFF15181E,
    track: 0xFF2E3848,
    gold: 0xFFE8B84A,
    // The Loader's golds round the main one, from its head to its tail's end.
    gleam: 0xFFFFF6D8,
    lightGold: 0xFFFFD678,
    bronze: 0xFFA8661C,
    title: 0xFFFFFFFF,
    description: 0xFFA9B4C2,
    dim: 0xFF6E7887,
    challengeAccent: 0xFF4FD1B0,
    challengeAccentLit: 0xFFB8FFF0,
    // The High Score Toast's accent, apart from the Ranks' metals and the Challenges' teal.
    highScoreAccent: 0xFFB07CF0,
    // News the player would rather not hear, such as a Lost Record.
    alert: 0xFFE8644A,
    // The Error Toast's copper red, darker than the alert so a failure never
    // reads as a Lost Record.
    errorAccent: 0xFFC4452C,
    // The Warning Toast's amber, more orange than the gold of the Achievements.
    warningAccent: 0xFFF09A1E,
    // Provisional, the border's colour until the Achievement List's key caps
    // and pills are checked on the cabinet.
    // StyledText ignores a semi-transparent backgroundColor.
    keyCap: 0xFF3E4C60,
    pill: 0xFF3E4C60,
    transparent: 0x00000000,
});

export const RANK_COLORS = Object.freeze({
    [ACHIEVEMENT_RANK.BRONZE]: 0xFFCD7F32,
    [ACHIEVEMENT_RANK.SILVER]: 0xFFC0C8D0,
    [ACHIEVEMENT_RANK.GOLD]: 0xFFE8C14A,
    [ACHIEVEMENT_RANK.PLATINUM]: 0xFFB8D8F0,
});

export const STEAMBALL_FONTS = Object.freeze({
    body: "Segoe UI",
    // The Achievement List's footer and key caps.
    display: "Bahnschrift SemiCondensed",
    // The launch's step beneath the Loader; a calligraphic font Windows ships.
    script: "Gabriola",
});
