// ============================================================
// Easter Egg rules: may this Easter Egg be drawn now, and does it win? Owns
// the 1 in 100, the cabinet's one a day (easter_egg_day.json), the active
// Profile's memory ("surprises" part, so a Profile Reset gives it back) and
// the busy checks. Each Easter Egg only says its moment and what it plays.
// - A win is recorded before it plays: a crash never gives a second one.
// - Only the draw wins one; the tests' scenarios replace it via setEasterEggDraw.
// ============================================================

import { formatDateKey } from "../tables/period_table.js";
import { surprisesOf } from "../achievements/surprises.js";
import { getAchievementToasts } from "../achievements/achievement_toast.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { getWheelDialogs } from "../core/wheel_dialog.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { safeHandler } from "../core/safe_handler.js";

const SCRIPT_NAME = "EasterEggRules";

// The keys of the flags in the "surprises" part: never change them.
export const EASTER_EGG = Object.freeze({
    CROW: "crow", MENU_GLITCH: "menuGlitch", MANEKI_NEKO: "manekiNeko", ROCKET: "rocket", FAKE_BLUE_SCREEN: "fakeBlueScreen",
});

const CHANCE = 1 / 100;
// Cabinet-level file of the Profile store: the local day of the last Easter Egg.
const DAILY_FILE = "easter_egg_day";
const DAILY_FILE_VERSION = 1;

// wheelDialogs: { isIdle(), isOverlayOpen(except) }; achievementToasts: { hasToasts() };
// random(name): the draw for that Easter Egg, the host's by default.
export function createEasterEggRules(host, { profileStore, wheelDialogs, achievementToasts, random = () => host.random() }) {
    // Won and not finished yet: their Achievement waits for the end of the effect.
    const playing = new Set();
    const finishedListeners = [];

    const easterEggsOf = data => surprisesOf(data).easterEggs || {};
    const hasHad = name => easterEggsOf(profileStore.getProfileData())[name] === true;
    const today = () => formatDateKey(host.now());

    const isBusy = over => host.getFullUIMode().runMode !== undefined
        || !wheelDialogs.isIdle()
        || wheelDialogs.isOverlayOpen(over)
        || achievementToasts.hasToasts();

    // An unreadable file is logged and set aside by the store, and reads as null.
    function isTodayTaken() {
        const saved = profileStore.readCabinetFile(DAILY_FILE, DAILY_FILE_VERSION);
        return saved !== null && saved.day === today();
    }

    // The day first: a failed write then costs a free day, never an Easter Egg.
    function record(name) {
        profileStore.saveCabinetFile(DAILY_FILE, { version: DAILY_FILE_VERSION, day: today() });
        profileStore.updateProfileData(data => {
            data.surprises = { ...surprisesOf(data), easterEggs: { ...easterEggsOf(data), [name]: true } };
        });
    }

    // canPlay: asked once the draw is won, so an Easter Egg that cannot play costs
    // nothing; over: the screen it plays on, which does not make the wheel busy.
    function tryWin(name, { canPlay = () => true, over = null } = {}) {
        if (isBusy(over)) return false;
        if (hasHad(name)) return false;
        if (random(name) >= CHANCE) return false;
        if (!canPlay()) return false;
        if (isTodayTaken()) return false;
        record(name);
        playing.add(name);
        return true;
    }

    // The effect is over (or was cut short): its Achievement may be announced.
    function finish(name) {
        playing.delete(name);
        for (const listener of finishedListeners) listener(name);
    }

    return {
        tryWin,
        finish,
        // True for the active Profile once the Easter Egg has finished playing.
        hasPlayed: name => hasHad(name) && !playing.has(name),
        // listener(name): runs, guarded, each time an Easter Egg finishes.
        onFinished: listener => { finishedListeners.push(safeHandler(SCRIPT_NAME, listener)); },
    };
}

let sharedRules = null;
let sharedDraw = null;

// Only for the tests' scenarios, which reach the shared rules through main.js:
// source(name) replaces their draw, so one Easter Egg can win and no other
// random of the pack changes; null gives the host's draw back.
export function setEasterEggDraw(source) {
    sharedDraw = source;
}

export function getEasterEggRules() {
    if (!sharedRules) {
        const host = createPinballYHost();
        sharedRules = createEasterEggRules(host, {
            profileStore: getProfileStore(),
            wheelDialogs: getWheelDialogs(),
            achievementToasts: getAchievementToasts(),
            random: name => (sharedDraw ? sharedDraw(name) : host.random()),
        });
    }
    return sharedRules;
}
