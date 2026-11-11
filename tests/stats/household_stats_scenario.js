// ============================================================
// Starts the pack through main.js on the fake PinballY globals with a
// Household for the Household Stats tests: Guest and the named Profiles,
// each with its own profile.json and Play Log, the Achievements,
// Challenges and Table Mastery Add-ons on unless told otherwise, English
// texts unless told otherwise, PinballY's navigation sound, every startup toast over. Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { AVATAR_FRAME_IMAGES } from "../mastery/mastery_bar_scenario.js";

export const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
export const HOUR = 3600;
export const NAVIGATION_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";
export const PREV_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Prev.wav";
export const DEFAULT_AVATAR = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\default_avatar.png";
// Past every startup toast.
const ALL_TOASTS_MS = 600000;

const table = (id, title, manufacturer, year, categories = []) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories,
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true,
});
export const MEDIEVAL = table(1, "Medieval Madness", "Williams", 1997);
export const MARS = table(2, "Attack from Mars", "Bally", 1995);
export const THEATRE = table(3, "Theatre of Magic", "Bally", 1995);
export const TWILIGHT = table(4, "Twilight Zone", "Bally", 1993);
// In the default adult category, left out of the cabinet unless asked for.
export const PLAYBOY = table(5, "Playboy", "Stern", 2002, ["NSFW"]);

export const played = (count, seconds) => ({ count, seconds, lastPlayed: "2026-09-22T20:00:00" });

const playLogJson = starts => JSON.stringify({
    version: 1, plays: starts.map(start => ({ start, configId: MEDIEVAL.configId, seconds: 600 })),
});

// profiles: { [name]: { plays, challenge, streaks, playLog (Play starts), isChild,
// avatar (true: its own avatar.png), collectionTier, avatarFrame (the worn
// frame's tier) } }, Guest always there; active: the
// Profile switched to once started (Guest otherwise); addOns: the Add-ons on;
// hasDefaultAvatar: false leaves the default Avatar image out of the install;
// hasAdultTable: the cabinet also has PLAYBOY; frameImages: whether the
// Avatar Frame images exist; files: { path: content } seeded before startup;
// drawMs: how long each layer draw takes on the clock; language: the texts'
// language, also to set before importing this file, whose imports read the texts.
export async function startHousehold({
    profiles = {}, active = null, addOns = ["achievements", "challenges", "tableMastery"], hasDefaultAvatar = true, hasAdultTable = false,
    frameImages = false, files = {}, drawMs = 0, language = "en",
} = {}) {
    const tables = [MEDIEVAL, MARS, THEATRE, TWILIGHT, ...(hasAdultTable ? [PLAYBOY] : [])];
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables, drawMs });
    const all = { guest: {}, ...profiles };
    for (const [name, profile] of Object.entries(all)) {
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({
            version: 1, plays: profile.plays || {}, notified: [], isChild: profile.isChild === true,
            ...(profile.challenge ? { challenge: profile.challenge } : {}),
            ...(profile.streaks ? { streaks: profile.streaks } : {}),
            ...(profile.collectionTier ? { collectionTier: profile.collectionTier } : {}),
            ...("avatarFrame" in profile ? { avatarFrame: profile.avatarFrame } : {}),
        }));
        if (profile.playLog) fake.addFile(`${PROFILES}\\${name}\\play-log-2026.json`, playLogJson(profile.playLog));
        if (profile.avatar) fake.addFile(`${PROFILES}\\${name}\\avatar.png`, "png");
    }
    if (hasDefaultAvatar) fake.addFile(DEFAULT_AVATAR, "png");
    if (frameImages) for (const file of AVATAR_FRAME_IMAGES) fake.addFile(file);
    for (const path of [NAVIGATION_SOUND, PREV_SOUND]) fake.addFile(path);
    for (const [path, content] of Object.entries(files)) fake.addFile(path, content);
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = language;

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const { readProfileStats } = await import("../../addons/achievements_engine.js");
    await import("../../main.js");
    await settle();
    if (active) getProfileStore().switchTo(active);
    fake.advanceTime(ALL_TOASTS_MS);
    return { fake, lang, profileStore: getProfileStore(), readProfileStats };
}

export { errorLines } from "../support/error_log.js";
