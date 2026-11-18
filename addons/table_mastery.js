// ============================================================
// Table Mastery: shows the selected table's Mastery Bar for the active Profile
// (last of the top right stack), a Wheel Mark (common/core/wheel_marks.js).
// After a Play, lights the bar up on the return to the wheel, and submits
// a Mastery Toast for a new Mastery Level or
// Collection Tier, kept in profile.json ("collectionTier").
// - Plays come from onPlay (ADR 0008).
// - A Collection Tier toast names the Avatar Frames it unlocks, then the Reward Prompt for a first frame.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getDrawingAhead } from "../common/core/drawing_ahead.js";
import { createMasteryBar, MASTERY_BAR_PIECE } from "../common/mastery/mastery_bar.js";
import {
    masteryOf, movedByPlay, levelReachedByPlay, metalOf, collectionMasteryOfProfile, MAX_MASTERY_LEVEL,
} from "../common/mastery/table_mastery.js";
import { tablesVisibleTo } from "../common/tables/visible_tables.js";
import { getAchievementToasts, TOAST_KIND } from "../common/achievements/achievement_toast.js";
import { getProfileRewards } from "../common/avatar_frames/profile_rewards.js";
import lang from "../common/core/i18n.js";
import { getWheelMarks } from "../common/core/wheel_marks.js";
import { safeHandler } from "../common/core/safe_handler.js";

const SCRIPT_NAME = "TableMastery";

export default function init() {
    const host = createPinballYHost();
    const store = getProfileStore();
    // The Wheel Mark module tells the bar after the Challenge Card is redrawn,
    // so its top reads the card's new height; never asked before the registration below.
    const bar = createMasteryBar(host, getDrawingAhead(), { topOf: () => mark.top() });
    // Got at startup, so the Confetti Shower its toasts start is drawn
    // ahead by then.
    const toasts = getAchievementToasts();
    // The Play that moved its table's bar forward, until the next return
    // to the wheel: { profileName, configId }.
    let movedTable = null;

    // Lit up only when the wheel comes back on the very table that moved,
    // for the Profile that played it.
    function showTable(game, { returned }) {
        const moved = returned ? movedTable : null;
        if (returned) movedTable = null;
        const mastery = masteryOf(store.getPlay(game.configId));
        // A Profile Reset since the Play leaves no mastery to light up.
        if (moved && mastery && game.configId === moved.configId && store.getActiveProfile().name === moved.profileName) {
            bar.lightUp(mastery);
        } else {
            bar.show(mastery);
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

    const mark = getWheelMarks().register(SCRIPT_NAME, {
        topRight: MASTERY_BAR_PIECE,
        show: showTable,
        // A return with no table to show still ends the moved table's wait.
        hide: ({ returned }) => {
            if (returned) movedTable = null;
            bar.hide();
        },
    });
}
