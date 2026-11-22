// ============================================================
// Challenge module: owns the Challenges' state. Draws the week's Challenge
// (locked in cabinet.json), follows each Profile's games in its profile.json
// ("challenge"), completes it with a celebrated Challenge Toast, judges the
// previous one, and selects the Challenge Tables. Shared through getChallenges().
// - The target is the same for every Profile, capped by what can be reached.
// - Progress is recomputed from the counted games, never stored.
// - Facts are noted on "gamestarted" and counted on the Play announcement.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { getProfileStore } from "../profiles/profile_store.js";
import { getTableOfTheDay, getTableOfTheWeek, getWeekKey } from "../tables/period_table.js";
import { getRandomGame } from "../tables/random_game.js";
import { isVisibleTo, tablesVisibleTo } from "../tables/visible_tables.js";
import { getAchievementToasts, TOAST_KIND } from "../achievements/achievement_toast.js";
import { createCalibration } from "./calibration.js";
import {
    CHALLENGE_TEMPLATES as TEMPLATES, NO_PLAY, NO_TEMPLATE, createStartedFacts, daysLeftInWeek, drawTemplate,
    isDrawnChallenge as isChallenge, progressOf, targetOfDrawn,
} from "./challenge_templates.js";
import config from "../core/config.js";
import lang from "../core/i18n.js";

export { CHALLENGE_TEMPLATE_IDS } from "./challenge_templates.js";

const SCRIPT_NAME = "Challenges";

// Players' saved data: the cabinet.json key.
const CABINET_KEY = "challenge";

// The Challenge's title, the same on its Card, its Toast and the Welcome Screen.
export const challengeTitleOf = challenge => lang.challenges.titles[challenge.template](challenge.target, challenge.param);

const NO_CHALLENGE = Object.freeze({ current: null, previous: null });
const emptyProfileChallenge = () => ({
    firstWeek: "", week: "", games: [], completed: false, completedCount: 0, judgedWeek: "", history: [],
});

export function createChallenges(host, profileStore, { tableOfTheDay, tableOfTheWeek, randomGame, toasts, random = Math.random }) {
    const randomIndex = length => Math.floor(random() * length);
    const randomInt = (min, max) => min + randomIndex(max - min + 1);
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    const calibration = createCalibration(host, profileStore);
    const startedFacts = createStartedFacts(host, profileStore, { tableOfTheDay, tableOfTheWeek, randomGame, scriptName: SCRIPT_NAME });

    const getLocks = () => ({ ...NO_CHALLENGE, ...profileStore.getCabinetData()[CABINET_KEY] });

    // Every template but the previous Challenge's with a feasible option;
    // one of them, then one of its feasible options, then its target.
    function draw(week, previous) {
        const profiles = profileStore.listProfiles();
        // Guest is the visitors' seat and may draw a target it cannot reach,
        // unless it is the only one playing: no other Profile, or no picker
        // to switch away from it.
        const guestSetsTheBar = profiles.every(profile => profile.isGuest) || config.addOns.profilePicker === false;
        const barSetters = profiles.filter(profile => guestSetsTheBar || !profile.isGuest).map(profile => profile.name);
        const profilePlays = barSetters.map(name => profileStore.getPlaysOf(name));
        const now = host.now();
        const visibleTables = host.getVisibleTables();
        const context = {
            visibleTables, now, daysLeft: daysLeftInWeek(now),
            // The least across the Profiles that set the bar: a target each of them can reach.
            reachableCount: matches => Math.min(...profilePlays.map(plays =>
                visibleTables.filter(table => matches(plays[table.configId] || NO_PLAY)).length)),
        };
        const drawn = drawTemplate(context, previous ? [previous.template] : [], randomIndex);
        if (!drawn) return { week, template: NO_TEMPLATE, param: null, target: 0 };
        // Calibrated on the bar-setting Profiles' last weeks.
        const target = targetOfDrawn(drawn, (valueOf, bounds) => calibration.targetFor(barSetters, valueOf, bounds, now), randomInt);
        return { week, template: drawn.id, param: drawn.option.param, target };
    }

    // The week's Challenge, drawn on its first need in the week; null when
    // no template was feasible that week.
    function getCurrent() {
        const week = getWeekKey(host.now());
        const locks = getLocks();
        if (!locks.current || locks.current.week !== week) {
            const current = draw(week, locks.current);
            profileStore.updateCabinetData(cabinet => {
                cabinet[CABINET_KEY] = { current, previous: locks.current };
            });
            log(`Week ${week}: ${current.template ? `"${current.template}" drawn, target ${current.target}` : "no feasible Challenge"}.`);
            return isChallenge(current) ? current : null;
        }
        return isChallenge(locks.current) ? locks.current : null;
    }

    const readProfileChallenge = data => ({ ...emptyProfileChallenge(), ...data.challenge });
    // Set by a counted game that moved the Challenge forward, until its
    // Profile shows up on the wheel.
    let progressedProfile = null;

    // The previous Challenge's verdict for this Profile record, or null when
    // it gets none: no previous Challenge, already judged, or drawn before
    // the Profile first saw a Challenge.
    function judge(state, previous) {
        if (!isChallenge(previous) || !state.firstWeek || previous.week < state.firstWeek) return null;
        if (state.judgedWeek === previous.week) return null;
        const followed = state.week === previous.week;
        return {
            challenge: previous,
            reached: followed ? Math.min(previous.target, progressOf(previous, state.games)) : 0,
            completed: followed && state.completed,
        };
    }

    // When the active Profile shows up on the wheel (startup, Profile
    // switch, back from a game): draws the week's Challenge if needed, judges
    // the previous one once and starts following the week's. Returns whether
    // the card has something new, and the verdict to show first, if any.
    function showUp({ switched = false } = {}) {
        const profile = profileStore.getActiveProfile();
        const progressed = progressedProfile === profile.name;
        progressedProfile = null;
        const current = getCurrent();
        const state = readProfileChallenge(profile.data);
        // Only the last Challenge before the week's is ever judged: after an
        // absence, the weeks in between leave no trace.
        const verdict = judge(state, getLocks().previous);
        const follows = !current || state.week === current.week;
        if (!verdict && follows) return { hasNews: Boolean(current) && (switched || progressed), verdict: null };

        profileStore.updateProfileData(data => {
            const next = { ...state };
            if (verdict) {
                const { week, template, param, target } = verdict.challenge;
                next.history = [...state.history, { week, template, param, target, reached: verdict.reached, completed: verdict.completed }];
                next.judgedWeek = week;
            }
            if (!follows) Object.assign(next, { firstWeek: state.firstWeek || current.week, week: current.week, games: [], completed: false });
            data.challenge = next;
        });
        if (verdict) log(`${profile.name}: week ${verdict.challenge.week} Challenge ${verdict.completed ? "completed" : "missed"} (${verdict.reached}/${verdict.challenge.target}).`);
        return { hasNews: Boolean(current), verdict };
    }

    // The active Profile's view of the week's Challenge, or null when it
    // has none to show (no Challenge, not followed yet).
    function getActiveView() {
        const profile = profileStore.getActiveProfile();
        const current = getCurrent();
        if (!current) return null;
        const state = readProfileChallenge(profile.data);
        if (state.week !== current.week) return null;
        return {
            challenge: current,
            value: Math.min(current.target, progressOf(current, state.games)),
            daysLeft: daysLeftInWeek(host.now()),
            completed: state.completed,
        };
    }

    // The named Profile's (the active one by default) completed Challenges
    // out of the weeks it took part in: a missed Challenge counts only with some progress toward it.
    // Completed ones are read from the completed count, not the verdicts,
    // so it agrees with the Challenges Achievements and counts this week's
    // Challenge as soon as it is completed.
    function getRecord(profileName = profileStore.getActiveProfile().name) {
        const state = readProfileChallenge(profileStore.getProfileDataOf(profileName));
        const missed = state.history.filter(verdict => !verdict.completed && verdict.reached > 0).length;
        return { completed: state.completedCount, total: state.completedCount + missed };
    }

    // The active Profile's Challenge Tables, in collection order; none
    // without a Challenge to follow, once it is completed, or for
    // the templates that have none.
    function getTablesToPlay() {
        const view = getActiveView();
        if (!view || view.completed) return [];
        const { tablesToPlay } = TEMPLATES[view.challenge.template];
        if (!tablesToPlay) return [];
        return tablesToPlay({
            visibleTables: tablesVisibleTo(host.getVisibleTables(), profileStore),
            games: readProfileChallenge(profileStore.getActiveProfile().data).games,
            param: view.challenge.param,
            playOf: table => profileStore.getPlay(table.configId),
            now: host.now(),
            // Only when needed: getTable() locks a new period's table in cabinet.json.
            getDayTable: () => tableOfTheDay.getTable(),
            getWeekTable: () => tableOfTheWeek.getTable(),
        });
    }

    // Fires on "gameover" for a Play only (ADR 0008); the first Play to reach
    // the target of its week's Challenge completes it.
    profileStore.onPlay(safeHandler(SCRIPT_NAME, ({ profileName, configId, start, seconds }) => {
        const facts = startedFacts.take(configId);
        if (!facts) return;
        const table = host.getGameInfo(configId);
        if (!table || !isVisibleTo(table, profileStore, profileName)) return;

        const week = getWeekKey(start);
        const { current, previous } = getLocks();
        const challenge = [current, previous].find(candidate => isChallenge(candidate) && candidate.week === week);
        if (!challenge) return;
        let completedCount = 0;
        profileStore.updateProfileData(data => {
            const state = readProfileChallenge(data);
            if (state.week !== week || state.judgedWeek === week) return;
            const before = progressOf(challenge, state.games);
            const games = [...state.games, { ...facts, seconds }];
            const progress = progressOf(challenge, games);
            data.challenge = { ...state, games };
            if (progress > before) progressedProfile = profileName;
            if (!state.completed && progress >= challenge.target) {
                completedCount = state.completedCount + 1;
                data.challenge = { ...data.challenge, completed: true, completedCount };
            }
        }, profileName);
        if (completedCount === 0) return;
        log(`${profileName} completed the week ${week} Challenge.`);
        toasts.submit({
            kind: TOAST_KIND.CHALLENGE,
            title: challengeTitleOf(challenge),
            description: lang.challenges.toastDescription(completedCount),
            celebrate: true,
            onShown() {},
        });
    }));

    return { getCurrent, showUp, getActiveView, getTablesToPlay, getRecord };
}

let sharedChallenges = null;

// One instance for every Add-on, sharing the Achievement Toasts' queue.
// The Random Game module is created first, so its "gamestarted" listener
// has settled whether the game is a Random Game before this one notes it.
export function getChallenges() {
    if (!sharedChallenges) {
        const randomGame = getRandomGame();
        sharedChallenges = createChallenges(createPinballYHost(), getProfileStore(),
            { tableOfTheDay: getTableOfTheDay(), tableOfTheWeek: getTableOfTheWeek(), randomGame,
                toasts: getAchievementToasts() });
    }
    return sharedChallenges;
}
