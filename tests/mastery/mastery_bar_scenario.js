// ============================================================
// Mastery Bar tests' scenario: main.js on the fake globals with earlier Plays
// seeded in profile.json. Reads the bar's texts, fill, light and place, the
// Mastery and Level Toasts, the kept Collection Tier and Confetti starts.
// Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { MASTERY_BAR_Z_INDEX } from "../../common/mastery/mastery_bar.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { TOP_EDGE } from "../../common/drawing/steamball_palette.js";
import config from "../../common/core/config.js";

export const NOW = new Date(2026, 8, 23, 10, 0, 0);
export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
// The startup over and every state drawn ahead.
export const DRAWN_AHEAD_MS = 10000;
// The reference height the bar's position is given in.
export const REFERENCE_HEIGHT = 1920;
const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
export const profileFile = name => `${PROFILES_FOLDER}\\${name}\\profile.json`;
// The Avatar Frame images, three per frame, as the pack ships them.
export const AVATAR_FRAMES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\avatar_frames";
export const AVATAR_FRAME_IMAGES = [...Array.from({ length: 10 }, (_, index) => String(index + 1).padStart(2, "0")),
    "newYear", "chineseNewYear", "valentine", "mardiGras", "stPatrick", "easter", "musicDay", "halloween", "deadDay", "thanksgiving", "christmas"]
    .map(id => `${AVATAR_FRAMES_FOLDER}\\frame_${id}`)
    .flatMap(base => [`${base}_384.png`, `${base}_192.png`, `${base}_192_locked.png`]);

const table = (id, title, manufacturer, year) => ({
    id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false,
});
export const TABLES = [
    table(1, "Medieval Madness", "Williams", 1997),
    table(2, "Attack from Mars", "Bally", 1995),
    table(3, "Theatre of Magic", "Bally", 1995),
    table(4, "Twilight Zone", "Bally", 1993),
];
// Adult Tables (category "NSFW") of other manufacturers and decades, which
// a Child Profile never sees.
const adultTable = (id, title, manufacturer, year) => ({ ...table(id, title, manufacturer, year), categories: ["NSFW"] });
export const ADULT_TABLES = [
    adultTable(11, "Playboy", "Bally", 1978),
    adultTable(12, "Party A", "Gottlieb", 1965),
    adultTable(13, "Party B", "Stern", 2005),
    adultTable(14, "Party C", "VPX Community", 2023),
    adultTable(15, "Party D", "Zaccaria", 1985),
];

// A Profile's earlier Plays on a table, as its profile.json keeps them.
export const playedFor = seconds => ({ count: 1, seconds, lastPlayed: "2026-09-01T20:00:00" });

// addOns: the Add-ons on; profiles: { name: { plays, isChild, isAdmin, collectionTier, notified, avatarFrame } }, Guest's
// under "guest"; active: the Profile in cabinet.json; challenge: the week's
// lock in cabinet.json (undefined lets the Challenges draw one); settings:
// config keys to change; soundFiles: the files that exist; frameImages:
// whether the Avatar Frame images exist; now: the clock at startup.
export async function startScenario({
    addOns = ["tableMastery"], profiles = {}, active = "guest", challenge, tables = TABLES, language = "en",
    settings = {}, soundFiles = [], frameImages = false, now = NOW,
} = {}) {
    const fake = createFakePinballYHost({ now, tables });
    for (const file of soundFiles) fake.addFile(file);
    if (frameImages) for (const file of AVATAR_FRAME_IMAGES) fake.addFile(file);
    for (const [name, { plays = {}, isChild = false, isAdmin = false, collectionTier, notified = [], ...rest }] of Object.entries(profiles)) {
        fake.addFile(profileFile(name), JSON.stringify({
            version: 1, plays, notified, ...(isChild ? { isChild } : {}), ...(isAdmin ? { isAdmin } : {}),
            ...(collectionTier ? { collectionTier } : {}),
            ...("avatarFrame" in rest ? { avatarFrame: rest.avatarFrame } : {}),
        }));
    }
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({
        version: 1, activeProfile: active, ...(challenge ? { challenge: { current: challenge, previous: null } } : {}),
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = language;
    config.startupScreen = "welcome";
    Object.assign(config, settings);

    await import("../../main.js");
    await settle();
    return fake;
}

const isMasteryLayer = layer => Object.values(MASTERY_BAR_Z_INDEX).includes(layer.zIndex);
export const masteryLayers = fake => fake.drawingLayers().filter(isMasteryLayer);
const shownLayers = fake => masteryLayers(fake).filter(layer => layer.alpha > 0);
const shownOn = (fake, zIndex) => shownLayers(fake).filter(layer => layer.zIndex === zIndex);

// Everything the resting Mastery Bar shows, null when it is hidden: the
// head of its panel, the number in its square (null without one) and how
// full its bar is, from 0 to 1. Not while it is lit.
export function shownMastery(fake) {
    if (shownLayers(fake).length === 0) return null;
    const [panel] = shownOn(fake, MASTERY_BAR_Z_INDEX.panel);
    const [bar] = shownOn(fake, MASTERY_BAR_Z_INDEX.bar);
    const squares = shownOn(fake, MASTERY_BAR_Z_INDEX.square);
    // The bar's track, then its filled part when there is one.
    const [track, filled] = bar.strokes().filter(stroke => "fill" in stroke);
    return {
        head: panel.texts().join(" "),
        number: squares.length > 0 ? squares[0].texts().join("") : null,
        fill: filled ? filled.rect.width / track.rect.width : 0,
    };
}

// The colour of the thin edge over the shown panel's top; null without one
// or when the bar is hidden.
export function shownTopEdge(fake) {
    const [panel] = shownOn(fake, MASTERY_BAR_Z_INDEX.panel);
    const edge = panel && panel.strokes().find(stroke => "fill" in stroke && stroke.rect.height === TOP_EDGE.thickness);
    return edge ? edge.fill : null;
}

// Whether the lit state shows over the bar.
export const isLit = fake => shownOn(fake, MASTERY_BAR_Z_INDEX.lit).length > 0;

// How far below the top of the window the bar's layers sit, in reference
// px; null when they don't all sit at the top right at the same height.
export function shownTop(fake) {
    const positions = shownLayers(fake).map(layer => layer.position());
    if (positions.some(({ x, y, align }) => x !== 0 || align !== "top right" || y !== positions[0].y)) return null;
    return Math.round(-positions[0].y * REFERENCE_HEIGHT);
}

// Every Mastery Toast drawn so far, its texts joined: number | header | title | description.
export const masteryToasts = fake => toastDrawings(fake)
    .map(drawing => drawing.texts.join(" | "))
    .filter(texts => texts.includes("TABLE MASTERY"));
// Every Level Toast drawn so far, its texts joined the same way.
export const levelToasts = fake => toastDrawings(fake)
    .map(drawing => drawing.texts.join(" | "))
    .filter(texts => texts.includes("LEVEL UP"));
// The Level Toast of this level, its texts joined the same way.
export const levelToastOf = level => `${level} | LEVEL UP | Level ${level} | Your Achievements took you to a new level.`;
// The Table of the Day and of the Week fall on Twilight Zone, the last
// table, so a test that never plays it never earns their Achievements.
export const pickLastTables = () => { Math.random = () => 0.999; };
// Every toast drawn so far, of any kind, its texts joined the same way.
export const allToasts = fake => toastDrawings(fake).map(drawing => drawing.texts.join(" | "));
// Every Collection Tier's Mastery Toast drawn so far, its texts joined the same way.
export const collectionToasts = fake => toastDrawings(fake)
    .map(drawing => drawing.texts.join(" | "))
    .filter(texts => texts.includes("COLLECTION MASTERY"));
// What the named Profile's profile.json keeps of its Collection Tier, undefined when nothing.
export const savedCollectionTier = (fake, name) => JSON.parse(fake.readFile(profileFile(name))).collectionTier;
export const showerStarts = fake => fake.logLines().filter(line => line.startsWith("[ConfettiShower] Started")).length;
// Longer than a toast's whole life (rise, hold, fade).
export const ONE_TOAST_MS = 6000;
// Long enough for every toast of a Play, shown five at a time.
export const ALL_TOASTS_MS = 3 * ONE_TOAST_MS;

export { errorLines } from "../support/error_log.js";

// How long the bar stays lit after a Play that moved it.
export const LIT_MS = 1200;

// A whole game on this table, back on the wheel when it ends, and once
// the bar is resting again unless watchLight.
export async function play(fake, game, seconds, { watchLight = false } = {}) {
    fake.playGame(game);
    fake.gameStarted(game);
    await settle();
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
    await settle();
    if (!watchLight) fake.advanceTime(LIT_MS);
}

// The player moves the wheel onto this table.
export function select(fake, game) {
    const offset = fake.getWheelTables().findIndex(candidate => candidate.configId === game.configId);
    fake.moveWheel(offset);
}
