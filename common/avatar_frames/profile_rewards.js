// ============================================================
// Profile Rewards: the only module that knows the Avatar Frames: one per
// Collection Tier (id 1 to 10, tier kept in profile.json), the Holiday Frames
// (read from the Play Log, never stored), then the Household frame (15
// credited Household Challenges). Writes the active Profile's choice
// ("avatarFrame"), toasts each new Holiday or Household frame, submits the Reward Prompt.
// - A frame never locks again short of a Profile Reset.
// - Each family exists only with its Add-on: Table Mastery, Profile picker, Household Challenge.
// - The prompt sets "avatarFrame" to null when shown, so it never comes back.
// ============================================================

import { createPinballYHost } from "../core/pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { getWheelDialogs, DIALOG_PRIORITY } from "../core/wheel_dialog.js";
import { TOAST_KIND } from "../achievements/achievement_toast.js";
import { safeHandler } from "../core/safe_handler.js";
import { chineseNewYear } from "./chinese_calendar.js";
import { householdCreditsIn } from "../challenges/household_challenge.js";
import lang from "../core/i18n.js";
import config from "../core/config.js";

const FRAME_COUNT = 10;
const FRAME_FAMILY = Object.freeze({ COLLECTION: "collection", HOLIDAY: "holiday", HOUSEHOLD: "household" });
// The Household frame's id, and the credited Household Challenges that unlock it.
const HOUSEHOLD_FRAME_ID = "household";
const HOUSEHOLD_FRAME_CREDITS = 15;
// Whether a local date is on one of those days of that month (1 to 12).
const onDays = (month, ...days) => date => date.getMonth() === month - 1 && days.includes(date.getDate());
// Whether a local date is the day holidayDateIn(year) gives, a Date at local midnight.
const onComputedDay = holidayDateIn => date => holidayDateIn(date.getFullYear()).getTime() === new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// Easter Sunday by the anonymous Gregorian algorithm (Meeus, Jones, Butcher).
function easterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - Math.floor(b / 4) - g + 15) % 30;
    const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const monthAndDay = h + l - 7 * m + 114;
    return new Date(year, Math.floor(monthAndDay / 31) - 1, (monthAndDay % 31) + 1);
}

// Date normalizes the negative day count into February or March.
const mardiGras = year => {
    const easter = easterSunday(year);
    return new Date(year, easter.getMonth(), easter.getDate() - 47);
};

// The fourth Thursday of November (Thursday is day 4 of getDay).
const NOVEMBER = 10;
const thanksgiving = year => new Date(year, NOVEMBER, 1 + ((4 - new Date(year, NOVEMBER, 1).getDay() + 7) % 7) + 21);

// The Holiday Frames in list order, each with whether a local date is on its holiday.
const HOLIDAYS = Object.freeze([
    { id: "newYear", isOn: onDays(1, 1) },
    { id: "chineseNewYear", isOn: onComputedDay(chineseNewYear) },
    { id: "valentine", isOn: onDays(2, 14) },
    { id: "mardiGras", isOn: onComputedDay(mardiGras) },
    { id: "stPatrick", isOn: onDays(3, 17) },
    { id: "easter", isOn: onComputedDay(easterSunday) },
    { id: "musicDay", isOn: onDays(6, 21) },
    { id: "halloween", isOn: onDays(10, 31) },
    { id: "deadDay", isOn: onDays(11, 1, 2) },
    { id: "thanksgiving", isOn: onComputedDay(thanksgiving) },
    { id: "christmas", isOn: onDays(12, 24, 25) },
]);
const LOCAL_ISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/;
// Frames drawn this wide or less take the 192 px image, wider ones the 384 px one.
const SMALL_IMAGE_MAX_WIDTH = 192;
const FRAMES_FOLDER = "assets\\images\\avatar_frames";
const SCRIPT_NAME = "ProfileRewards";
const REWARD_PROMPT_ID = "rewardPrompt";

// The holidays a Play from start (a Date) lasting seconds starts or ends on.
function holidaysOfPlay(start, seconds) {
    const end = new Date(start.getTime() + seconds * 1000);
    return HOLIDAYS.filter(holiday => holiday.isOn(start) || holiday.isOn(end)).map(holiday => holiday.id);
}

// A Play Log start, in local time; null when it is not one.
function localDateOf(text) {
    const match = LOCAL_ISO.exec(String(text));
    if (!match) return null;
    const [year, month, day, hours, minutes, seconds] = match.slice(1).map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
}

// withProfiles: whether the Profile picker is on, without which there are no
// Holiday Frames; withHousehold: whether the Household Challenge is on,
// without which there is no Household frame.
export function createProfileRewards(host, { profileStore, isEnabled = () => true, withProfiles = () => true, withHousehold = () => true, wheelDialogs = null }) {
    const projectFolder = host.getProjectFolder();
    // Each image's path, or null when its file is missing: checked once per session.
    const imagePaths = new Map();

    function existingImage(path) {
        if (!imagePaths.has(path)) {
            const exists = host.files.fileExists(path);
            if (!exists) host.log(`[${SCRIPT_NAME}] Avatar Frame image not found, showing the plain Avatar: ${path}`);
            imagePaths.set(path, exists ? path : null);
        }
        return imagePaths.get(path);
    }

    // Each family's texts for a frame of that id.
    const textsOf = (family, id) => {
        const TEXT = lang.profileRewards;
        if (family === FRAME_FAMILY.COLLECTION) return { name: TEXT.frameNames[id - 1], unlockCondition: lang.profileStats.frameList.unlockCondition(id) };
        if (family === FRAME_FAMILY.HOUSEHOLD) return { name: TEXT.household.name, unlockCondition: TEXT.household.condition(HOUSEHOLD_FRAME_CREDITS) };
        return { name: TEXT.holidays[id].name, unlockCondition: TEXT.holidays[id].condition };
    };

    // id: a tier from 1 to FRAME_COUNT, a holiday's, or the Household
    // frame's. The images are drawn by absolute path: drawImage resolves
    // relative paths from the PinballY folder.
    function frameOf(id) {
        const isTier = typeof id === "number";
        const family = isTier ? FRAME_FAMILY.COLLECTION : (id === HOUSEHOLD_FRAME_ID ? FRAME_FAMILY.HOUSEHOLD : FRAME_FAMILY.HOLIDAY);
        const base = `${projectFolder}\\${FRAMES_FOLDER}\\frame_${isTier ? String(id).padStart(2, "0") : id}`;
        return {
            id,
            family,
            ...(family === FRAME_FAMILY.HOLIDAY ? { holiday: id } : {}),
            ...textsOf(family, id),
            images: { large: `${base}_384.png`, small: `${base}_192.png`, locked: `${base}_192_locked.png` },
        };
    }

    const dataOf = profileName => (profileName === undefined ? profileStore.getProfileData() : profileStore.getProfileDataOf(profileName));
    const nameOf = profileName => (profileName === undefined ? profileStore.getActiveProfile().name : profileName);

    // How many Plays of each holiday the Profile's Play Log holds, by
    // Profile name in lower case: read again after any change or Play.
    // Registered here, before the announcing listener of enablePrompts,
    // which must count the Play just logged.
    const holidayCounts = new Map();
    const forgetHolidays = () => holidayCounts.clear();
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, forgetHolidays));
    profileStore.onRemove(safeHandler(SCRIPT_NAME, forgetHolidays));
    profileStore.onPlay(safeHandler(SCRIPT_NAME, forgetHolidays));

    function holidayCountsOf(profileName) {
        const name = nameOf(profileName);
        const profileKey = name.toLowerCase();
        if (!holidayCounts.has(profileKey)) {
            const counts = new Map();
            for (const year of profileStore.getPlayLogYearsOf(name)) {
                for (const play of profileStore.getPlayLogOf(name, year)) {
                    const start = localDateOf(play.start);
                    if (!start) continue;
                    for (const id of holidaysOfPlay(start, Number(play.seconds) || 0)) counts.set(id, (counts.get(id) || 0) + 1);
                }
            }
            holidayCounts.set(profileKey, counts);
        }
        return holidayCounts.get(profileKey);
    }

    // Every frame of the Profile (the active one by default) in list
    // order, each with whether it is unlocked.
    function framesOf(profileName) {
        const frames = [];
        if (isEnabled()) {
            const keptTier = dataOf(profileName).collectionTier || 0;
            for (let tier = 1; tier <= FRAME_COUNT; tier++) frames.push({ ...frameOf(tier), isUnlocked: keptTier >= tier });
        }
        if (withProfiles()) {
            const counts = holidayCountsOf(profileName);
            for (const { id } of HOLIDAYS) frames.push({ ...frameOf(id), isUnlocked: counts.has(id) });
        }
        if (withHousehold()) {
            frames.push({ ...frameOf(HOUSEHOLD_FRAME_ID), isUnlocked: householdCreditsIn(dataOf(profileName)) >= HOUSEHOLD_FRAME_CREDITS });
        }
        return frames;
    }

    const unlockedFrameOf = (id, profileName) => framesOf(profileName).find(frame => frame.isUnlocked && frame.id === id) || null;

    // The frame the Profile wears, null when none: a choice of a frame
    // that is not unlocked or unknown (a hand edit, a newer pack) wears none.
    const wornFrameOf = profileName => unlockedFrameOf(dataOf(profileName).avatarFrame, profileName);

    // Opens the frame list on that frame's row, then calls onClosed once it
    // closes; null until enablePrompts.
    let openFrameList = null;
    // Profile Resets so far, by Profile name in lower case (Profile names
    // ignore case): a prompt or toast submitted before its Profile's reset is stale.
    const resetCounts = new Map();
    const resetCountOf = profileKey => resetCounts.get(profileKey) || 0;

    const isPromptPending = profileName => openFrameList !== null
        && !("avatarFrame" in dataOf(profileName)) && framesOf(profileName).some(frame => frame.isUnlocked);

    // The Reward Prompt for the named Profile, dropped when that Profile is
    // reset, no longer active or already prompted at its turn; isBlocked
    // (optional) also drops it, isReady (optional) holds it; frameId
    // (optional) the frame it names, else the last one unlocked.
    function submitPrompt(profileName, { isBlocked = () => false, isReady, frameId } = {}) {
        if (!isPromptPending(profileName)) return;
        const profileKey = profileName.toLowerCase();
        const resetCount = resetCountOf(profileKey);
        const unlocked = framesOf(profileName).filter(candidate => candidate.isUnlocked);
        const frame = unlocked.find(candidate => candidate.id === frameId) || unlocked.pop();
        const TEXT = lang.profileRewards.prompt;
        wheelDialogs.submit({
            id: REWARD_PROMPT_ID,
            title: TEXT.title,
            message: TEXT.message(frame.name, lang.profileStats.menuEntry, lang.profileStats.buttons.frame),
            buttons: [
                // A drawn dialog of its own once the prompt closed: the queue
                // waits for the frame list, so no dialog opens over it.
                { label: TEXT.goEquip, action: () => wheelDialogs.submit({ priority: DIALOG_PRIORITY.REWARD_PROMPT, open: close => openFrameList(frame.id, close) }) },
                // No action: the dialog closing is all it must do.
                { label: TEXT.gotIt },
            ],
            priority: DIALOG_PRIORITY.REWARD_PROMPT,
            isReady,
            isStale: () => isBlocked() || resetCountOf(profileKey) !== resetCount
                || profileStore.getActiveProfile().name.toLowerCase() !== profileKey || !isPromptPending(profileName),
            onShown: safeHandler(SCRIPT_NAME, () => profileStore.updateProfileData(data => { data.avatarFrame = null; }, profileName)),
        });
    }

    const submitForActive = () => submitPrompt(profileStore.getActiveProfile().name);

    // For the toast of a new frame, isStale being the toast's: submits the
    // Profile's pending prompt now, so it holds its place ahead of the
    // rating prompt, and returns the toast's onShown, which lets it show.
    // A stale toast never shows, so neither does its prompt.
    function promptAfterToast(profileName, isStale, frameId) {
        let isToastShown = false;
        submitPrompt(profileName, { isBlocked: isStale, isReady: () => isToastShown, frameId });
        return () => {
            isToastShown = true;
            wheelDialogs.wake();
        };
    }

    // The toast of a Holiday or Household frame the Profile just unlocked,
    // dropped when that Profile is reset or no longer active at its turn;
    // header (optional) replaces the Holiday Frame one.
    function announceFrame(toasts, profileName, id, header) {
        const profileKey = profileName.toLowerCase();
        const resetCount = resetCountOf(profileKey);
        const isStale = () => resetCountOf(profileKey) !== resetCount
            || profileStore.getActiveProfile().name.toLowerCase() !== profileKey;
        const frame = frameOf(id);
        toasts.submit({
            kind: TOAST_KIND.FRAME,
            ...(header ? { header } : {}),
            imagePath: existingImage(frame.images.small),
            title: lang.profileRewards.toastLine([frame.name]),
            description: frame.unlockCondition,
            onShown: promptAfterToast(profileName, isStale, id),
            isStale,
        });
    }

    // The Achievement Toast module, once enablePrompts gave it.
    let frameToasts = null;

    return {
        framesOf,
        wornFrameOf,
        // The image of the frame the Profile wears, for a frame drawn
        // frameWidth pixels wide; null when it wears none or the file is missing.
        wornImageOf(profileName, frameWidth) {
            const frame = wornFrameOf(profileName);
            return frame ? existingImage(frame.images[frameWidth <= SMALL_IMAGE_MAX_WIDTH ? "small" : "large"]) : null;
        },
        // The image of that size ("large", "small" or "locked") of a frame
        // from framesOf, null when its file is missing.
        imageOf: (frame, size) => existingImage(frame.images[size]),
        // Makes the active Profile wear the frame of that id, or none for
        // null; false, changing nothing, when that frame is not unlocked.
        choose(id) {
            if (id !== null && !unlockedFrameOf(id)) return false;
            profileStore.updateProfileData(data => { data.avatarFrame = id; });
            return true;
        },
        // The frames a Collection Tier raised from keptTier to tier unlocks,
        // lowest first: none when it unlocks none.
        framesUnlockedBetween(keptTier, tier) {
            if (!isEnabled()) return [];
            const frames = [];
            for (let frameTier = Math.max(1, keptTier + 1); frameTier <= Math.min(tier, FRAME_COUNT); frameTier++) {
                frames.push(frameOf(frameTier));
            }
            return frames;
        },
        // opener(id, onClosed): opens the frame list on that frame's row,
        // calling onClosed once the list is closed; toasts: the Achievement
        // Toast module. Submits the active Profile's pending prompt now,
        // which waits for the Welcome Screen, and the new one's on each
        // Profile switch; toasts each Holiday Frame a Play newly unlocks.
        enablePrompts(opener, toasts) {
            openFrameList = opener;
            frameToasts = toasts;
            profileStore.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
                if (isReset) resetCounts.set(profileName.toLowerCase(), resetCountOf(profileName.toLowerCase()) + 1);
            }));
            profileStore.onSwitch(safeHandler(SCRIPT_NAME, submitForActive));
            // The Play is in the Play Log already: a holiday it unlocks is
            // one no other Play of the Profile touches.
            profileStore.onPlay(safeHandler(SCRIPT_NAME, ({ profileName, start, seconds }) => {
                if (!withProfiles()) return;
                const counts = holidayCountsOf(profileName);
                for (const id of holidaysOfPlay(start, seconds)) if (counts.get(id) === 1) announceFrame(toasts, profileName, id);
            }));
            submitForActive();
        },
        // For the Household Challenge module's credit: toasts the Household
        // frame when that Profile's credited count just reached it (credits
        // rise one at a time, one per toast); nothing before enablePrompts.
        householdCredited(profileName, count) {
            if (!frameToasts || !withHousehold() || count !== HOUSEHOLD_FRAME_CREDITS) return;
            announceFrame(frameToasts, profileName, HOUSEHOLD_FRAME_ID, lang.profileRewards.household.toastHeader);
        },
        // For the Mastery Toast of a Collection Tier that unlocks frames, as
        // for the Holiday Frame toasts.
        promptAfterToast,
    };
}

let shared = null;

export function getProfileRewards() {
    if (!shared) {
        shared = createProfileRewards(createPinballYHost(), {
            profileStore: getProfileStore(),
            isEnabled: () => config.addOns.tableMastery !== false,
            withProfiles: () => config.addOns.profilePicker !== false,
            withHousehold: () => config.addOns.householdChallenge !== false,
            wheelDialogs: getWheelDialogs(),
        });
    }
    return shared;
}
