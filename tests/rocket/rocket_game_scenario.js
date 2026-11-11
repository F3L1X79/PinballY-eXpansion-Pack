// ============================================================
// Rocket Game tests' scenario: main.js on the fake globals, Profiles that
// have had the Rocket Easter Egg or not (their Surprises part in the starting
// profile.json, never through the draw), the main menu's entry, the game and
// its score screen as the player sees them. Never loaded by PinballY; one
// start per test file, as main.js loads once per process.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { ROCKET_IMAGES, NAVIGATION_SOUND, TABLES, profileFile } from "../easter_eggs/rocket_scenario.js";
import { winTheDrawOf } from "../easter_eggs/winning_draw.js";

export { profileFile };
export const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// From the entry to the game: a tick, the backdrop's paint, then the 3.5 s intro.
export const BACKDROP_PAINT_MS = 50;
export const INTRO_MS = 3500;
export const LEAVING_MS = 120;
export const CLOSE_AFTER_MS = 10000;
export const GAME_Z_INDEX = { backdrop: 7500, last: 7591 };
export const SCORE_SCREEN_Z_INDEX = { backdrop: 7700, score: 7710, board: 7720 };
// The score screen's opening: its steps, then its fade in.
export const SCORE_SCREEN_OPEN_MS = 1000;

export const hadTheRocket = { surprises: { easterEggs: { rocket: true } } };

// profiles: { [name]: profile.json's extra data }, Guest included unless
// named; active: the Profile switched to once started; addOns: those on;
// files: which images exist; wins: the Easter Egg whose draw always wins ("" for none).
export async function startRocketGame({
    profiles = { guest: hadTheRocket }, active = null, addOns = ["rocketGame"], files = ROCKET_IMAGES, wins = "",
} = {}) {
    const fake = createFakePinballYHost({ tables: TABLES, now: new Date(2026, 10, 9, 20, 0, 0) });
    fake.setWheelTables(TABLES.map(table => table.configId));
    for (const path of [...files, NAVIGATION_SOUND]) fake.addFile(path);
    for (const [name, data] of Object.entries({ guest: {}, ...profiles })) {
        fake.addFile(profileFile(name), JSON.stringify({ version: 1, ...data }));
    }
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    config.startupScreen = "wheel";

    const { default: lang } = await import("../../common/core/i18n.js");
    await winTheDrawOf(wins);
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    if (active) getProfileStore().switchTo(active);
    fake.advanceTime(100);
    return { fake, lang, store: getProfileStore() };
}

// The main menu's titles, as PinballY opens it; the menu closed again.
export function mainMenuTitles(fake) {
    fake.openMainMenu();
    const titles = fake.currentMenu().items.map(item => (item.cmd === -1 ? "---" : item.title));
    fake.closeMenu();
    return titles;
}

// The entry chosen as the player does, then the game prepared.
export async function chooseRocketGame(fake, lang) {
    fake.openMainMenu();
    fake.selectMenuItem(lang.rocketGame.menuEntry);
    await settle();
    fake.advanceTime(BACKDROP_PAINT_MS);
}

const shownIn = (fake, from, to) => fake.drawingLayers().filter(layer => layer.zIndex >= from && layer.zIndex <= to && layer.alpha > 0);
export const isGameShown = fake => shownIn(fake, GAME_Z_INDEX.backdrop, GAME_Z_INDEX.last).length > 0;
export const gameTexts = fake => shownIn(fake, GAME_Z_INDEX.backdrop, GAME_Z_INDEX.last).flatMap(layer => layer.texts());
export const gameLayerCount = fake => fake.drawingLayers().filter(layer => layer.zIndex >= GAME_Z_INDEX.backdrop && layer.zIndex <= GAME_Z_INDEX.last).length;
export const isScoreScreenShown = fake => shownIn(fake, SCORE_SCREEN_Z_INDEX.backdrop, SCORE_SCREEN_Z_INDEX.backdrop).length > 0;
export const scoreScreenTexts = fake => shownIn(fake, SCORE_SCREEN_Z_INDEX.score, SCORE_SCREEN_Z_INDEX.score).flatMap(layer => layer.texts());
export const scoreScreenLayerCount = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= SCORE_SCREEN_Z_INDEX.backdrop - 2 && layer.zIndex <= SCORE_SCREEN_Z_INDEX.board).length;

// The Rocket Board's lines as shown, each { place, name, score, isHighlighted }:
// the highlighted line is the one drawn in gold.
export function boardLines(fake) {
    const texts = shownIn(fake, SCORE_SCREEN_Z_INDEX.board, SCORE_SCREEN_Z_INDEX.board)
        .flatMap(layer => layer.strokes()).filter(stroke => "text" in stroke);
    const lines = [];
    for (let index = 0; index + 2 < texts.length; index += 3) {
        const [place, name, score] = texts.slice(index, index + 3);
        lines.push({ place: place.text, name: name.text, score: score.text, isHighlighted: place.color === STEAMBALL_COLORS.gold });
    }
    return lines;
}

// Until the score screen has opened after the crash.
export function untilScoreScreen(fake) {
    for (let waitedMs = 0; !isScoreScreenShown(fake) && waitedMs < SCORE_SCREEN_OPEN_MS; waitedMs += 16) fake.advanceTime(16);
    fake.advanceTime(SCORE_SCREEN_OPEN_MS);
}

// The game's score line at the top: "SCORE  n".
export function gameScore(fake, lang) {
    const line = gameTexts(fake).find(text => text.startsWith(`${lang.rocket.score}  `));
    return line === undefined ? null : Number(line.slice(lang.rocket.score.length + 2));
}

// Until the score screen starts opening after the crash, at most maxMs of play;
// returns the last score the game showed.
export function untilCrash(fake, lang, maxMs = 120000) {
    let score = null;
    for (let elapsed = 0; elapsed < maxMs && scoreScreenLayerCount(fake) === 0; elapsed += 16) {
        score = gameScore(fake, lang) ?? score;
        fake.advanceTime(16);
    }
    return score;
}

// The main menu reopened by the pack, with the cursor on the entry titled title.
export function reopenedMainMenuSelection(fake) {
    fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
    const selected = fake.currentMenu().items.filter(item => item.selected).map(item => item.title);
    fake.closeMenu();
    return selected;
}
