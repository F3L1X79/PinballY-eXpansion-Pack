// ============================================================
// Easter Egg rules: may this Easter Egg be drawn now, and does it win? Owns
// the 1 in 200 (3 in 200 for a Child Profile's funny ones), one draw per
// Easter Egg and one win a day per Profile, kept in its "surprises" part (a
// Profile Reset gives them back), and the busy checks. Each Easter Egg only
// says its moment and what it plays.
// - The draw and the win are recorded before it plays: a crash never gives a second one.
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

const CHANCE = 1 / 200;
// A Child Profile's chance for the funny ones.
const CHILD_CHANCE = 3 / 200;
const FUNNY_ONES = [EASTER_EGG.CROW, EASTER_EGG.MANEKI_NEKO, EASTER_EGG.ROCKET];

// wheelDialogs: { isIdle(), isOverlayOpen(except) }; achievementToasts: { hasToasts() };
// random(name): the draw for that Easter Egg, the host's by default.
export function createEasterEggRules(host, { profileStore, wheelDialogs, achievementToasts, random = () => host.random() }) {
    // Won and not finished yet: their Achievement waits for the end of the effect.
    const playing = new Set();
    const finishedListeners = [];

    const easterEggsOf = data => surprisesOf(data).easterEggs || {};
    const drawsOf = data => surprisesOf(data).easterEggDraws || {};
    const active = () => profileStore.getProfileData();
    const today = () => formatDateKey(host.now());
    const hasHad = name => easterEggsOf(active())[name] === true;
    const isDayTaken = () => surprisesOf(active()).easterEggWonDay === today();
    const hasDrawnToday = name => drawsOf(active())[name] === today();
    const chanceOf = name => (FUNNY_ONES.includes(name) && profileStore.isChild() ? CHILD_CHANCE : CHANCE);

    const isBusy = over => host.getFullUIMode().runMode !== undefined
        || !wheelDialogs.isIdle()
        || wheelDialogs.isOverlayOpen(over)
        || achievementToasts.hasToasts();

    const isDrawDue = name => !hasHad(name) && !isDayTaken() && !hasDrawnToday(name);

    // fieldsOf(data): the fields to merge into the active Profile's "surprises" part.
    function mergeSurprises(fieldsOf) {
        profileStore.updateProfileData(data => {
            data.surprises = { ...surprisesOf(data), ...fieldsOf(data) };
        });
    }

    // Recorded before the draw: a crash never gives a second one that day.
    const recordDraw = (name, day) => mergeSurprises(data => ({ easterEggDraws: { ...drawsOf(data), [name]: day } }));
    const recordWin = (name, day) => mergeSurprises(data => ({ easterEggs: { ...easterEggsOf(data), [name]: true }, easterEggWonDay: day }));

    // canPlay: asked once the draw is won, so an Easter Egg that cannot play is
    // not won; over: the screen it plays on, which does not make the wheel busy.
    function tryWin(name, { canPlay = () => true, over = null } = {}) {
        if (isBusy(over)) return false;
        if (!isDrawDue(name)) return false;
        const day = today();
        recordDraw(name, day);
        if (random(name) >= chanceOf(name)) return false;
        if (!canPlay()) return false;
        recordWin(name, day);
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
        // True while the active Profile may still draw that Easter Egg today.
        isDrawDue,
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
