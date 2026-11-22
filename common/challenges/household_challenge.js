// ============================================================
// Household Challenge module: the week's goal the whole Household reaches
// together. Draws it (locked in cabinet.json, "householdChallenge") once the
// Household's Play Log covers 4 complete weeks, records every Profile's counted
// Plays there with their Profile, and gives the card its views and last week's
// verdict. Shared through getHouseholdChallenge().
// - Never the week's Challenge template, nor last week's Household Challenge one.
// - Progress and completion are recomputed from the records, never stored.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { getTableOfTheDay, getTableOfTheWeek, getWeekKey, shiftDateKey } from "../tables/period_table.js";
import { getRandomGame } from "../tables/random_game.js";
import { isVisibleTo } from "../tables/visible_tables.js";
import { createCalibration } from "./calibration.js";
import {
    NO_PLAY, NO_TEMPLATE, createStartedFacts, daysLeftInWeek, drawTemplate, isDrawnChallenge, meetsCondition, progressOf,
} from "./challenge_templates.js";

const SCRIPT_NAME = "HouseholdChallenge";

// Players' saved data: the cabinet.json key.
const CABINET_KEY = "householdChallenge";
const NO_LOCKS = Object.freeze({ current: null, previous: null });

// challenges: the Challenge module, null with the Challenges off.
export function createHouseholdChallenge(host, profileStore, { challenges, tableOfTheDay, tableOfTheWeek, randomGame, random = Math.random }) {
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

    // A template not excluded with a feasible option, its target drawn in
    // its range, capped by what the Household can reach together.
    function draw(week, previous) {
        const none = { week, template: NO_TEMPLATE, param: null, target: 0, games: [] };
        const now = host.now();
        if (!calibration.hasEnoughPlayLog(now)) return none;
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
        const drawn = drawTemplate(context, excluded, randomIndex);
        if (!drawn) return none;
        const { id, template: { range }, option } = drawn;
        return { week, template: id, param: option.param, target: randomInt(range.min, Math.min(range.max, option.max)), games: [] };
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
        if (!current) return [];
        const names = current.games.filter(game => meetsCondition(current, game)).map(game => game.profile);
        return [...new Set(names)];
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
        updateLocks(saved => ({ ...saved, [key]: { ...challenge, games } }));
    }));

    return { getCurrent, showUp, getActiveView, getContributors };
}

let sharedHouseholdChallenge = null;

// One instance for every Add-on. The Random Game module is created first,
// so its "gamestarted" listener has settled whether the game is a Random
// Game before this one notes it. challenges: the shared Challenge module,
// null with the Challenges off.
export function getHouseholdChallenge({ challenges }) {
    if (!sharedHouseholdChallenge) {
        const randomGame = getRandomGame();
        sharedHouseholdChallenge = createHouseholdChallenge(createPinballYHost(), getProfileStore(),
            { challenges, tableOfTheDay: getTableOfTheDay(), tableOfTheWeek: getTableOfTheWeek(), randomGame });
    }
    return sharedHouseholdChallenge;
}
