// ============================================================
// Household Challenge module: the week's goal the whole Household reaches
// together. Draws it (cabinet.json, "householdChallenge") once the Play Log
// covers 4 complete weeks, records every Profile's counted Plays there, gives
// the card its views and last week's verdict, and on completion a Household
// Challenge Toast to each helper on arrival, credited in its profile.json.
// - Never the week's Challenge template, nor last week's Household Challenge one.
// - Helpers are frozen on completion (toCredit); a Profile Reset leaves cabinet.json alone.
// - Progress and completion are recomputed from the records, never stored.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { getTableOfTheDay, getTableOfTheWeek, getWeekKey, shiftDateKey } from "../tables/period_table.js";
import { getRandomGame } from "../tables/random_game.js";
import { isVisibleTo } from "../tables/visible_tables.js";
import { sameName } from "../profiles/profile_name_rules.js";
import { getAchievementToasts, TOAST_KIND } from "../achievements/achievement_toast.js";
import lang from "../core/i18n.js";
import { createCalibration } from "./calibration.js";
import { challengeTitleOf, getChallenges } from "./challenge.js";
import config from "../core/config.js";
import {
    NO_PLAY, NO_TEMPLATE, createStartedFacts, tablesToPlayOf, daysLeftInWeek, drawTemplate, isDrawnChallenge, meetsCondition, progressOf, targetOfDrawn,
} from "./challenge_templates.js";

const SCRIPT_NAME = "HouseholdChallenge";

// Players' saved data: the cabinet.json key.
const CABINET_KEY = "householdChallenge";
// Players' saved data: the profile.json key, holding the credited count.
const PROFILE_KEY = "householdChallenge";
const NO_LOCKS = Object.freeze({ current: null, previous: null });

// The Household Challenges a Profile was credited for, from its profile.json data.
export const householdCreditsIn = data => (data[PROFILE_KEY] && data[PROFILE_KEY].creditedCount > 0 ? data[PROFILE_KEY].creditedCount : 0);

// challenges: the Challenge module, null with the Challenges off.
export function createHouseholdChallenge(host, profileStore, { challenges, tableOfTheDay, tableOfTheWeek, randomGame, toasts, random = Math.random }) {
    const randomIndex = length => Math.floor(random() * length);
    const randomInt = (min, max) => min + randomIndex(max - min + 1);
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    const calibration = createCalibration(host, profileStore);
    const startedFacts = createStartedFacts(host, profileStore, { tableOfTheDay, tableOfTheWeek, randomGame, scriptName: SCRIPT_NAME });

    const getLocks = () => ({ ...NO_LOCKS, ...profileStore.getCabinetData()[CABINET_KEY] });
    const updateLocks = change => profileStore.updateCabinetData(cabinet => {
        cabinet[CABINET_KEY] = change({ ...NO_LOCKS, ...cabinet[CABINET_KEY] });
    });
    const isCompleted = challenge => progressOf(challenge, challenge.games) >= challenge.target;
    // The Profiles whose counted Plays meet the template's condition, in
    // the order of their first contribution.
    const contributorsOf = (challenge, games) =>
        [...new Set(games.filter(game => meetsCondition(challenge, game)).map(game => game.profile))];

    const creditedListeners = [];

    // Whether the named Profile helped complete that lock's week and was not credited yet.
    const awaitsCredit = (challenge, name) => isDrawnChallenge(challenge) && Array.isArray(challenge.toCredit)
        && challenge.toCredit.some(helper => sameName(helper, name));
    const lockOfWeek = week => Object.values(getLocks()).find(challenge => challenge && challenge.week === week);

    // Takes the named Profile off the toCredit of that week, or of every week (null).
    function forgetHelper(name, week) {
        if (!Object.values(getLocks()).some(challenge => awaitsCredit(challenge, name))) return;
        updateLocks(locks => {
            for (const key of Object.keys(locks)) {
                const challenge = locks[key];
                if (!awaitsCredit(challenge, name) || (week !== null && challenge.week !== week)) continue;
                locks[key] = { ...challenge, toCredit: challenge.toCredit.filter(helper => !sameName(helper, name)) };
            }
            return locks;
        });
    }

    // The weeks whose toast was submitted and has not shown yet, by lower-case
    // Profile name, so an arrival before it shows never submits it twice.
    const waitingWeeks = new Map();
    const waitingWeeksOf = name => {
        if (!waitingWeeks.has(name.toLowerCase())) waitingWeeks.set(name.toLowerCase(), new Set());
        return waitingWeeks.get(name.toLowerCase());
    };

    // Shown to the active Profile for each completed week it helped and was
    // not credited for yet; credited when its toast starts, and only then
    // taken off the week's toCredit, so a toast dropped before (the Profile
    // switched away) comes again on its next arrival.
    function offerToasts() {
        const name = profileStore.getActiveProfile().name;
        const waiting = waitingWeeksOf(name);
        const locks = getLocks();
        for (const challenge of [locks.previous, locks.current]) {
            if (!awaitsCredit(challenge, name) || waiting.has(challenge.week)) continue;
            // The waiting toasts show first, each one credit more.
            const count = householdCreditsIn(profileStore.getProfileDataOf(name)) + waiting.size + 1;
            const { week } = challenge;
            waiting.add(week);
            toasts.submit({
                kind: TOAST_KIND.HOUSEHOLD_CHALLENGE,
                title: challengeTitleOf(challenge),
                description: lang.householdChallenge.toastDescription(count),
                celebrate: true,
                onShown: () => credit(name, week),
                // The toast module's only word on a dropped toast: forgotten as
                // waiting, so the next arrival offers it again if still due.
                isStale() {
                    const isStale = !sameName(profileStore.getActiveProfile().name, name) || !awaitsCredit(lockOfWeek(week), name);
                    if (isStale) waiting.delete(week);
                    return isStale;
                },
            });
        }
    }

    function credit(name, week) {
        waitingWeeksOf(name).delete(week);
        forgetHelper(name, week);
        profileStore.updateProfileData(data => {
            data[PROFILE_KEY] = { ...data[PROFILE_KEY], creditedCount: householdCreditsIn(data) + 1 };
        }, name);
        log(`${name} credited for the week ${week} Household Challenge.`);
        const count = householdCreditsIn(profileStore.getProfileDataOf(name));
        for (const listener of creditedListeners) listener(name, count);
    }

    // A template not excluded with a feasible option, its range the
    // Challenge's times the household factor; its target calibrated on the
    // Household's last weeks together, else drawn in that range; both capped
    // by what the Household can reach together.
    function draw(week, previous) {
        const none = { week, template: NO_TEMPLATE, param: null, target: 0, games: [] };
        const now = host.now();
        const household = calibration.householdCalibration(now);
        if (!household) return none;
        const challenge = challenges ? challenges.getCurrent() : null;
        const excluded = [previous, challenge].filter(isDrawnChallenge).map(drawn => drawn.template);
        const profilePlays = profileStore.listProfiles().map(profile => profileStore.getPlaysOf(profile.name));
        const visibleTables = host.getVisibleTables();
        const context = {
            visibleTables, now, daysLeft: daysLeftInWeek(now),
            // A table counts once one Profile, Guest included, can count it.
            reachableCount: matches => visibleTables.filter(table =>
                profilePlays.some(plays => matches(plays[table.configId] || NO_PLAY))).length,
        };
        const drawn = drawTemplate(context, excluded, randomIndex, household.factor);
        if (!drawn) return none;
        const target = targetOfDrawn(drawn, household.targetFor, randomInt);
        return { week, template: drawn.id, param: drawn.option.param, target, games: [] };
    }

    // Set by a drawn week or a counted Play that moved the Household
    // Challenge forward, until the card shows up again.
    let hasNews = false;

    // The week's Household Challenge, drawn on its first need in the week;
    // null in a week without one.
    function getCurrent() {
        const week = getWeekKey(host.now());
        const locks = getLocks();
        if (locks.current && locks.current.week === week) return isDrawnChallenge(locks.current) ? locks.current : null;
        const current = draw(week, locks.current);
        // A helper away for two weeks is never credited: only the last two weeks are kept.
        const dropped = locks.previous;
        if (dropped && Array.isArray(dropped.toCredit) && dropped.toCredit.length > 0) {
            log(`Week ${dropped.week} Household Challenge dropped before ${dropped.toCredit.join(", ")} came back to be credited.`);
        }
        updateLocks(() => ({ current, previous: locks.current }));
        log(`Week ${week}: ${current.template ? `"${current.template}" drawn, target ${current.target}` : "no Household Challenge"}.`);
        if (!isDrawnChallenge(current)) return null;
        hasNews = true;
        return current;
    }

    // When the active Profile shows up on the wheel: draws the week's
    // Household Challenge if needed and gives last week's verdict, once per
    // Profile. Returns whether the card has something new, and that verdict.
    function showUp({ switched = false } = {}) {
        const current = getCurrent();
        offerToasts();
        const name = profileStore.getActiveProfile().name;
        const news = Boolean(current) && (switched || hasNews);
        hasNews = false;
        const { previous } = getLocks();
        const lastWeek = shiftDateKey(getWeekKey(host.now()), -7);
        const seenBy = previous && Array.isArray(previous.verdictSeenBy) ? previous.verdictSeenBy : [];
        if (!isDrawnChallenge(previous) || previous.week !== lastWeek || seenBy.includes(name)) return { hasNews: news, verdict: null };

        updateLocks(locks => ({ ...locks, previous: { ...previous, verdictSeenBy: [...seenBy, name] } }));
        const verdict = {
            challenge: previous,
            reached: Math.min(previous.target, progressOf(previous, previous.games)),
            completed: isCompleted(previous),
        };
        return { hasNews: Boolean(current), verdict };
    }

    // The week's Household Challenge as the card shows it, the same for
    // every Profile; null in a week without one.
    function getActiveView() {
        const current = getCurrent();
        if (!current) return null;
        return {
            challenge: current,
            value: Math.min(current.target, progressOf(current, current.games)),
            daysLeft: daysLeftInWeek(host.now()),
            completed: isCompleted(current),
        };
    }

    // The Profiles that contributed to the week's Household Challenge, in
    // the order of their first contribution.
    function getContributors() {
        const current = getCurrent();
        return current ? contributorsOf(current, current.games) : [];
    }

    // The active Profile's Household Challenge Tables; none once it is completed.
    function getTablesToPlay() {
        const view = getActiveView();
        if (!view || view.completed) return [];
        return tablesToPlayOf(host, profileStore, view.challenge, view.challenge.games, { tableOfTheDay, tableOfTheWeek });
    }

    // Fires on "gameover" for a Play only (ADR 0008): recorded for the
    // week it started in, by whichever Profile played.
    profileStore.onPlay(safeHandler(SCRIPT_NAME, ({ profileName, configId, start, seconds }) => {
        const facts = startedFacts.take(configId);
        if (!facts) return;
        const table = host.getGameInfo(configId);
        if (!table || !isVisibleTo(table, profileStore, profileName)) return;

        // Drawn first if the week changed while PinballY ran.
        getCurrent();
        const week = getWeekKey(start);
        const locks = getLocks();
        const key = ["current", "previous"].find(candidate => isDrawnChallenge(locks[candidate]) && locks[candidate].week === week);
        if (!key) return;
        const challenge = locks[key];
        const games = [...challenge.games, { profile: profileName, ...facts, seconds }];
        if (progressOf(challenge, games) > progressOf(challenge, challenge.games)) hasNews = true;
        // The helpers are those of the completing Play: a later one did not help.
        const completes = !isCompleted(challenge) && progressOf(challenge, games) >= challenge.target;
        const helpers = completes ? contributorsOf(challenge, games) : null;
        updateLocks(saved => ({ ...saved, [key]: { ...challenge, games, ...(helpers ? { toCredit: helpers } : {}) } }));
        if (!helpers) return;
        log(`Week ${week} Household Challenge completed by ${profileName}'s Play; helpers: ${helpers.join(", ")}.`);
        offerToasts();
    }));

    // Fires after any change of a Profile's data: a reset Profile starts
    // over, so it is never credited for a week it helped before.
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
        if (isReset) forgetHelper(profileName, null);
    }));

    return {
        getCurrent, showUp, getActiveView, getContributors, getTablesToPlay,
        // The Household Challenges the active Profile was credited for.
        getCreditedCount: () => householdCreditsIn(profileStore.getProfileData()),
        // listener(profileName, count) runs once a Profile is credited, inside its toast's start.
        onCredited: listener => creditedListeners.push(listener),
    };
}

let sharedHouseholdChallenge = null;

// One instance for every Add-on. The Random Game module is created first,
// so its "gamestarted" listener has settled whether the game is a Random
// Game before this one notes it. The Challenge module is never created with
// the Challenges off: it would follow their games.
export function getHouseholdChallenge() {
    if (!sharedHouseholdChallenge) {
        const randomGame = getRandomGame();
        const challenges = config.addOns.challenges === false ? null : getChallenges();
        sharedHouseholdChallenge = createHouseholdChallenge(createPinballYHost(), getProfileStore(),
            { challenges, tableOfTheDay: getTableOfTheDay(), tableOfTheWeek: getTableOfTheWeek(), randomGame, toasts: getAchievementToasts() });
    }
    return sharedHouseholdChallenge;
}
