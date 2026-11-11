// ============================================================
// The whole pack keeps the hidden layer rule, through main.js on the fake
// PinballY globals with the default Add-ons: at each rest point, every live
// main window layer that is hidden is a point and every visible one is not.
// - No layer is excused: a future screen breaking the rule fails here.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { installVpxtool } from "../support/vpxtool.js";
import { AVATAR_FRAME_IMAGES } from "../mastery/mastery_bar_scenario.js";
import { WELCOME_SCREEN_Z_INDEX } from "../../common/welcome_screen/welcome_screen_painter.js";
import { ACHIEVEMENT_LIST_Z_INDEX } from "../../common/achievements/achievement_list.js";
import { PROFILE_STATS_Z_INDEX } from "../../common/stats/profile_stats_painter.js";
import { HOUSEHOLD_STATS_Z_INDEX } from "../../common/stats/household_stats_painter.js";
import { AVATAR_FRAME_LIST_Z_INDEX } from "../../common/avatar_frames/avatar_frame_list_painter.js";
import { HIGH_SCORE_BOARD_Z_INDEX } from "../../common/high_scores/high_score_board_painter.js";
import { NAME_ENTRY_Z_INDEX } from "../../common/profiles/name_entry_painter.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import { untilFadedIn } from "../support/opening_reader.js";
import { shownLayers } from "../support/shown_layers.js";
import { isDrawnMenuShown, isAnythingDrawn, openMainMenu, chooseEntry, press as pressInMenu } from "../drawn_menu/drawn_menu_reader.js";
import { choose as chooseInProfileStats } from "../stats/profile_stats_reader.js";
import { step, highlighted, openNameEntry, createThroughNameEntry, keepDefaultAvatar, isAvatarChoiceOpen, portraitOf, PORTRAIT_COUNT } from "../profiles/name_entry_scenario.js";

const NOW = new Date(2026, 8, 23, 10, 0, 0);
const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const DEFAULT_AVATAR = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\default_avatar.png";
const NAVIGATION_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";
// Past the drawing ahead and every startup toast.
const DRAWING_AHEAD_OVER_MS = 10 * 60 * 1000;
// Past a screen's closing fade, a greeting, or every toast of a batch.
const SETTLED_MS = 3000;
const ALL_TOASTS_MS = 60000;
const GAME_MS = 2 * 60 * 1000;
const TABLE_COUNT = 26;

// Williams tables of the 1990s, all played by Ann but the last: playing it
// unlocks Platinums, whose toasts come with a Confetti Shower.
const TABLES = Array.from({ length: TABLE_COUNT }, (_, index) => ({
    id: index + 1, configId: `Table ${index + 1} (Williams 1995)`, title: `Table ${index + 1}`,
    manufacturer: "Williams", year: 1995, categories: [], rom: `rom_${index + 1}`,
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true,
}));
const LAST_TABLE = TABLES[TABLE_COUNT - 1];
const PLAYED = { count: 1, seconds: 600, lastPlayed: "2026-09-01T20:00:00" };
const BOARD = ["GRAND CHAMPION", "SLL      52.000.000", "", "HIGHEST SCORES", "1) BRE      40.000.000", "2) LFS      30.000.000", ""];

async function startPack() {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    const profile = data => JSON.stringify({ version: 1, plays: {}, notified: [], ...data });
    fake.addFile(`${PROFILES_FOLDER}\\Ann\\profile.json`, profile({
        plays: Object.fromEntries(TABLES.slice(0, -1).map(table => [table.configId, PLAYED])), collectionTier: 3,
    }));
    for (const name of ["Ben", "Cat"]) fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, profile({ plays: { [TABLES[0].configId]: PLAYED } }));
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Ann" }));
    for (const file of AVATAR_FRAME_IMAGES) fake.addFile(file);
    for (let number = 1; number <= PORTRAIT_COUNT; number++) fake.addFile(portraitOf(number), `portrait ${number}`);
    fake.addFile(DEFAULT_AVATAR, "png");
    for (const path of [NAVIGATION_SOUND, NAVIGATION_SOUND.replace("Next.wav", "Prev.wav")]) fake.addFile(path);
    fake.setNvramBoard(TABLES[0].configId, BOARD);
    installVpxtool(fake);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    config.language = "en";
    config.startupScreen = "welcome";
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    return { fake, lang };
}

function assertRuleHeld(fake, where) {
    assert.deepEqual(layersBreakingTheRule(fake), [], where);
}

const isShown = (fake, zIndex) => shownLayers(fake, zIndex).length > 0;

// From the bare wheel: the main menu, then its entry.
async function openFromMainMenu(fake, entry, backdropZIndex) {
    openMainMenu(fake);
    chooseEntry(fake, entry);
    await settle();
    untilFadedIn(fake, backdropZIndex);
}

const press = (fake, command) => fake.fire("commandbuttondown", { command, repeat: false });

// Exit, then past the closing and any fade back.
async function exitAndSettle(fake) {
    press(fake, "Exit");
    await settle();
    fake.advanceTime(SETTLED_MS);
}

test("every layer of the pack at rest is a point when hidden and not a point when visible", async () => {
    const { fake, lang } = await startPack();

    untilFadedIn(fake, WELCOME_SCREEN_Z_INDEX.backdrop);
    assertRuleHeld(fake, "the Welcome Screen open at startup");
    await exitAndSettle(fake);
    fake.advanceTime(DRAWING_AHEAD_OVER_MS);
    await settle();
    assertRuleHeld(fake, "the bare wheel, drawn ahead and past the startup toasts");

    openMainMenu(fake);
    assert.ok(isDrawnMenuShown(fake), "the main menu is a Drawn Menu");
    assertRuleHeld(fake, "the Drawn Menu open");
    pressInMenu(fake, "Exit");
    fake.advanceTime(SETTLED_MS);
    assert.ok(!isAnythingDrawn(fake));
    assertRuleHeld(fake, "the Drawn Menu closed");

    await openFromMainMenu(fake, lang.achievementList.menuEntry, ACHIEVEMENT_LIST_Z_INDEX.backdrop);
    assertRuleHeld(fake, "the Achievement List open");
    await exitAndSettle(fake);
    assertRuleHeld(fake, "the Achievement List closed");

    await openFromMainMenu(fake, lang.profileStats.menuEntry, PROFILE_STATS_Z_INDEX.backdrop);
    assertRuleHeld(fake, "the Profile Stats open");
    chooseInProfileStats(fake, lang.profileStats.buttons.household);
    untilFadedIn(fake, HOUSEHOLD_STATS_Z_INDEX.backdrop);
    fake.advanceTime(SETTLED_MS);
    assertRuleHeld(fake, "the Household Stats open, the Profile Stats set aside under it");
    await exitAndSettle(fake);
    assert.ok(!isShown(fake, HOUSEHOLD_STATS_Z_INDEX.backdrop));
    assertRuleHeld(fake, "the Household Stats closed, the Profile Stats shown again");
    chooseInProfileStats(fake, lang.profileStats.buttons.frame);
    untilFadedIn(fake, AVATAR_FRAME_LIST_Z_INDEX.backdrop);
    assertRuleHeld(fake, "the Avatar Frame list open, the Profile Stats set aside under it");
    await exitAndSettle(fake);
    assertRuleHeld(fake, "the Avatar Frame list closed");
    await exitAndSettle(fake);
    assert.ok(!isShown(fake, PROFILE_STATS_Z_INDEX.backdrop));
    assertRuleHeld(fake, "the Profile Stats closed");

    await openFromMainMenu(fake, lang.highScores.board.menuEntry, HIGH_SCORE_BOARD_Z_INDEX.backdrop);
    for (let second = 0; second < 5; second++) {
        await settle();
        fake.advanceTime(1000);
    }
    assertRuleHeld(fake, "the High Score Board open");
    await exitAndSettle(fake);
    assertRuleHeld(fake, "the High Score Board closed");

    const game = fake.getGameInfo(LAST_TABLE.configId);
    fake.playGame(game);
    await settle();
    fake.gameStarted(game);
    await settle();
    fake.advanceTime(GAME_MS);
    assertRuleHeld(fake, "during a game");
    fake.gameOver(game);
    await settle();
    fake.advanceTime(ALL_TOASTS_MS);
    await settle();
    assert.ok(fake.logLines().some(line => line.startsWith("[ConfettiShower] Started")), "a Confetti Shower fell");
    assertRuleHeld(fake, "the wheel after the toasts and the Confetti Shower");

    openMainMenu(fake);
    chooseEntry(fake, lang.profiles.menuEntry);
    await settle();
    fake.advanceTime(SETTLED_MS);
    assertRuleHeld(fake, "the Profile Picker open");
    const slots = [lang.profiles.guestName, "Ann", "Ben", "Cat", lang.profiles.newProfile];
    for (let guard = 0; guard < slots.length && highlighted(fake, slots) !== lang.profiles.newProfile; guard++) step(fake, "Next");
    assertRuleHeld(fake, "the Profile Picker after a glide");
    openNameEntry(fake);
    assertRuleHeld(fake, "Name Entry open");
    createThroughNameEntry(fake, "ZED");
    assert.ok(isAvatarChoiceOpen(fake), "Avatar Choice opens after Name Entry");
    assertRuleHeld(fake, "Avatar Choice open");
    keepDefaultAvatar(fake);
    await settle();
    fake.advanceTime(SETTLED_MS);
    assert.ok(!isShown(fake, NAME_ENTRY_Z_INDEX.backdrop) && !isShown(fake, AVATAR_CHOICE_Z_INDEX.backdrop));
    assertRuleHeld(fake, "Name Entry and Avatar Choice closed, the new Profile greeted");
    assertNoErrorLogged(fake);
});
