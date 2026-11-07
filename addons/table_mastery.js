// ============================================================
// Table Mastery: shows the selected table's Mastery Bar for the active
// Profile (under the Challenge Card or the badge), from the Profile store's
// totals. After a Play, lights the bar up and submits a Mastery Toast for a
// new Mastery Level or Collection Tier, kept in profile.json ("collectionTier").
// Follows "gameselect", hides on "gamestarted", comes back on "wheelmode".
// - Plays come from onPlay (ADR 0008).
// - A Collection Tier toast names the Avatar Frames it unlocks, then the Reward Prompt for a first frame.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { getChallenges } from "../common/challenges/challenge.js";
import { challengeCardBottom } from "../common/challenges/challenge_card.js";
import { createMasteryBar } from "../common/mastery/mastery_bar.js";
import {
    masteryOf, movedByPlay, levelReachedByPlay, metalOf, collectionMasteryOfProfile, MAX_MASTERY_LEVEL,
} from "../common/mastery/table_mastery.js";
import { tablesVisibleTo } from "../common/tables/visible_tables.js";
import { getAchievementToasts, TOAST_KIND } from "../common/achievements/achievement_toast.js";
import { getProfileRewards } from "../common/avatar_frames/profile_rewards.js";
import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import config from "../common/core/config.js";

const SCRIPT_NAME = "TableMastery";

export default function init() {
    const host = createPinballYHost();
    const store = getProfileStore();
    const underBadge = config.addOns.profilePicker !== false;
    const challenges = config.addOns.challenges !== false ? getChallenges() : null;

    // The card has already followed the same events, since the Challenges
    // Add-on starts before this one.
    const topOf = () => challengeCardBottom(host, challenges, { underBadge });
    const bar = createMasteryBar(host, getDrawingAhead(), { topOf });
    // Got at startup, so the Confetti Shower its toasts start is drawn
    // ahead by then.
    const toasts = getAchievementToasts();
    let gameRunning = false;
    // The Play that moved its table's bar forward, until the next return
    // to the wheel: { profileName, configId }.
    let movedTable = null;

    function showTable(game) {
        if (gameRunning || !game) {
            bar.hide();
            return;
        }
        bar.show(masteryOf(store.getPlay(game.configId)));
    }

    const showCurrent = () => showTable(host.getCurrentTable());

    // Lit up only when the wheel comes back on the very table that moved,
    // for the Profile that played it.
    function showOnReturn() {
        const moved = movedTable;
        movedTable = null;
        const game = host.getCurrentTable();
        // A Profile Reset since the Play leaves no mastery to light up.
        const mastery = game && masteryOf(store.getPlay(game.configId));
        if (moved && mastery && game.configId === moved.configId && store.getActiveProfile().name === moved.profileName) {
            bar.lightUp(mastery);
        } else {
            showTable(game);
        }
    }

    // Profile Resets so far, by Profile name in lower case (Profile names
    // ignore case): a toast submitted before its Profile's reset is stale.
    const resetCounts = new Map();
    const resetCountOf = profileKey => resetCounts.get(profileKey) || 0;
    store.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
        if (isReset) resetCounts.set(profileName.toLowerCase(), resetCountOf(profileName.toLowerCase()) + 1);
    }));

    // toast: what a Mastery Toast shows, submitted for the named Profile and
    // dropped when that Profile is reset or no longer active at its turn.
    // unlocksFrames: the Reward Prompt of a first frame follows it.
    function submitFor(profileName, toast, { unlocksFrames = false } = {}) {
        const profileKey = profileName.toLowerCase();
        const resetCount = resetCountOf(profileKey);
        const isStale = () => resetCountOf(profileKey) !== resetCount
            || store.getActiveProfile().name.toLowerCase() !== profileKey;
        toasts.submit({
            kind: TOAST_KIND.MASTERY,
            ...toast,
            onShown: unlocksFrames ? getProfileRewards().promptAfterToast(profileName, isStale) : () => {},
            isStale,
        });
    }

    function announceLevel(profileName, configId, level) {
        const table = host.getGameInfo(configId);
        const TEXT = lang.tableMastery;
        submitFor(profileName, {
            accent: metalOf(level),
            tileNumber: level,
            title: TEXT.toastTitle(TEXT.levelNames[level - 1], level),
            description: table ? table.title : configId,
            celebrate: level === MAX_MASTERY_LEVEL,
        });
    }

    // celebrate is false when a Mastery Level 10 toast of the same Play
    // already brings the Confetti Shower: one shower per return to the wheel.
    function announceTier(profileName, keptTier, tier, needed, celebrate) {
        const TEXT = lang.tableMastery;
        const levelName = TEXT.levelNames[tier - 1];
        const frameNames = getProfileRewards().framesUnlockedBetween(keptTier, tier).map(frame => frame.name);
        submitFor(profileName, {
            header: TEXT.collectionToastHeader,
            accent: metalOf(tier),
            tileNumber: tier,
            title: TEXT.collectionToastTitle(tier, levelName),
            description: TEXT.collectionToastDescription(needed, levelName),
            extraLine: frameNames.length > 0 ? lang.profileRewards.toastLine(frameNames) : undefined,
            celebrate,
        }, { unlocksFrames: frameNames.length > 0 });
    }

    // Kept only once a tier is reached: a Profile Reset drops the key.
    function raiseCollectionTier(profileName, celebrate) {
        const tables = tablesVisibleTo(host.getVisibleTables(), store, profileName);
        const data = store.getProfileDataOf(profileName);
        const keptTier = data.collectionTier || 0;
        const { tier, needed } = collectionMasteryOfProfile(tables, data);
        if (tier <= keptTier) return;
        store.updateProfileData(data => { data.collectionTier = tier; }, profileName);
        announceTier(profileName, keptTier, tier, needed, celebrate);
    }

    // The totals already count the Play when it is announced.
    store.onPlay(safeHandler(SCRIPT_NAME, ({ profileName, configId, seconds }) => {
        const play = store.getPlaysOf(profileName)[configId];
        if (movedByPlay(play, seconds)) movedTable = { profileName, configId };
        const level = levelReachedByPlay(play, seconds);
        if (level !== null) announceLevel(profileName, configId, level);
        raiseCollectionTier(profileName, level !== MAX_MASTERY_LEVEL);
    }));

    // Fires on every wheel move, the player's and attract mode's alike.
    host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, ev => showTable(ev.game)));
    // Never over a game, like the Challenge Card.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        gameRunning = true;
        bar.hide();
    }));
    // Back on the wheel after a game, a menu or a dialog.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        gameRunning = false;
        showOnReturn();
    }));
    store.onSwitch(safeHandler(SCRIPT_NAME, showCurrent));

    showCurrent();
}
