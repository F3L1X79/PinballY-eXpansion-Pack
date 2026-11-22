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
import { getTableOfTheDay, getTableOfTheWeek, formatDateKey, getWeekKey } from "../tables/period_table.js";
import { getRandomGame } from "../tables/random_game.js";
import { isVisibleTo, tablesVisibleTo } from "../tables/visible_tables.js";
import { getAchievementToasts, TOAST_KIND } from "../achievements/achievement_toast.js";
import { createCalibration, manufacturerOf, decadeOf } from "./calibration.js";
import config from "../core/config.js";
import lang from "../core/i18n.js";

const SCRIPT_NAME = "Challenges";

// Each template's target range: a casual play goal, never a trivial one.
const targetRange = (min, max) => Object.freeze({ min, max });
const MANY = targetRange(4, 8);
const SOME = targetRange(3, 6);
const FEW = targetRange(3, 5);
const ENDURANCE_MINUTES = targetRange(20, 45);
const MARATHON_MINUTES = targetRange(60, 120);
const DUSTY_DAYS = 183;
const DAY_MS = 24 * 60 * 60 * 1000;

// Players' saved data: the cabinet.json key and the week's lock when no
// template was feasible.
const CABINET_KEY = "challenge";
const NO_TEMPLATE = "";

// Today included: 7 on Monday, 1 on Sunday.
const daysLeftInWeek = date => 7 - (date.getDay() + 6) % 7;

const NO_PLAY = Object.freeze({ count: 0, lastPlayed: "" });
const wasNeverPlayed = play => play.count === 0;
// A never played table has no last play: it is never dusty.
const wasDusty = (play, date) =>
    play.count > 0 && date.getTime() - new Date(play.lastPlayed).getTime() > DUSTY_DAYS * DAY_MS;

const distinct = values => new Set(values).size;
const distinctTables = games => distinct(games.map(game => game.configId));
const onlyTable = (tables, periodTable) =>
    tables.filter(table => periodTable && table.configId === periodTable.configId);
const notCounted = (tables, games) => tables.filter(table => !games.some(game => game.configId === table.configId));
const distinctDays = games => distinct(games.map(game => game.day));
const totalSeconds = games => games.reduce((sum, game) => sum + game.seconds, 0);
// The highest of totalOf over each table's games, 0 without any.
function bestTableTotal(games, totalOf) {
    const byTable = new Map();
    for (const game of games) byTable.set(game.configId, [...(byTable.get(game.configId) || []), game]);
    return Math.max(0, ...[...byTable.values()].map(totalOf));
}
// Applied to summed seconds, so that no game's last partial minute is lost.
const wholeMinutes = seconds => Math.floor(seconds / 60);
// A table without a manufacturer or a year has no value to count.
const isKnown = value => value !== "" && value !== null;
const distinctKnown = values => distinct(values.filter(isKnown));
// A single option without a parameter, its target capped at max.
const cappedOptions = max => [{ param: null, max }];
// Without a visible table there is no Period Table and no game that counts.
const isPlayable = context => context.visibleTables.length > 0;
const optionsWhenPlayable = (context, max = Infinity) => cappedOptions(isPlayable(context) ? max : 0);

// One option per known value of keyOf, its target capped at that value's
// table count.
function groupOptions(tables, keyOf) {
    const counts = new Map();
    for (const table of tables) {
        const key = keyOf(table);
        if (isKnown(key)) counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts].map(([param, count]) => ({ param, max: count }));
}

// The least, across the Profiles that set the bar, of visible tables whose
// play record matches: a target each of them can reach.
function leastAcrossProfiles(context, matches) {
    const { visibleTables, profilePlays } = context;
    return Math.min(...profilePlays.map(plays =>
        visibleTables.filter(table => matches(plays[table.configId] || NO_PLAY)).length));
}

// Template ids are players' saved data (cabinet.json, history): never rename one.
// range: the target's { min, max }, counts, or minutes for endurance and marathon.
// calibrated: progress reads only a game's table, manufacturer, decade, day
// and seconds, which the Play Log can rebuild (calibration.js): the target
// follows the last weeks once there is enough of it.
// options(context): the { param, max } choices, max capping the target; an
// option whose cap is below range.min is not feasible.
// progress(games, param): the value compared with the target.
// tablesToPlay(context): the Challenge Tables, visible tables that would move
// the Challenge forward; only for the templates where that makes sense.
// differentTables stays first: a scripted draw of 0 picks it.
const TEMPLATES = Object.freeze({
    differentTables: {
        range: MANY,
        calibrated: true,
        options: context => cappedOptions(context.visibleTables.length),
        progress: games => distinctTables(games),
    },
    manufacturerTables: {
        range: SOME,
        calibrated: true,
        // The community tables' manufacturer is not a real one.
        options: context => groupOptions(
            context.visibleTables.filter(table => manufacturerOf(table) !== config.communityTablesManufacturer), manufacturerOf),
        progress: (games, manufacturer) => distinctTables(games.filter(game => game.manufacturer === manufacturer)),
        tablesToPlay: ({ visibleTables, games, param }) =>
            notCounted(visibleTables.filter(table => manufacturerOf(table) === param), games),
    },
    decadeTables: {
        range: SOME,
        calibrated: true,
        options: context => groupOptions(context.visibleTables, decadeOf),
        progress: (games, decade) => distinctTables(games.filter(game => game.decade === decade)),
        tablesToPlay: ({ visibleTables, games, param }) =>
            notCounted(visibleTables.filter(table => decadeOf(table) === param), games),
    },
    differentManufacturers: {
        range: SOME,
        calibrated: true,
        options: context => cappedOptions(distinctKnown(context.visibleTables.map(manufacturerOf))),
        progress: games => distinctKnown(games.map(game => game.manufacturer)),
    },
    differentDecades: {
        range: FEW,
        calibrated: true,
        options: context => cappedOptions(distinctKnown(context.visibleTables.map(decadeOf))),
        progress: games => distinctKnown(games.map(game => game.decade)),
    },
    neverPlayedTables: {
        range: FEW,
        options: context => cappedOptions(leastAcrossProfiles(context, wasNeverPlayed)),
        progress: games => distinctTables(games.filter(game => game.wasNeverPlayed)),
        tablesToPlay: ({ visibleTables, playOf }) => visibleTables.filter(table => wasNeverPlayed(playOf(table))),
    },
    dustyTables: {
        range: FEW,
        options: context => cappedOptions(leastAcrossProfiles(context, play => wasDusty(play, context.now))),
        progress: games => distinctTables(games.filter(game => game.wasDusty)),
        tablesToPlay: ({ visibleTables, playOf, now }) => visibleTables.filter(table => wasDusty(playOf(table), now)),
    },
    tableOfTheDayDays: {
        range: FEW,
        options: context => optionsWhenPlayable(context, context.daysLeft),
        progress: games => distinctDays(games.filter(game => game.isTableOfTheDay)),
        tablesToPlay: ({ visibleTables, games, now, getDayTable }) => {
            const today = formatDateKey(now);
            if (games.some(game => game.isTableOfTheDay && game.day === today)) return [];
            return onlyTable(visibleTables, getDayTable());
        },
    },
    tableOfTheWeekGames: {
        range: MANY,
        options: context => optionsWhenPlayable(context),
        progress: games => games.filter(game => game.isTableOfTheWeek).length,
        tablesToPlay: ({ visibleTables, getWeekTable }) => onlyTable(visibleTables, getWeekTable()),
    },
    activeDays: {
        range: FEW,
        calibrated: true,
        options: context => optionsWhenPlayable(context, context.daysLeft),
        progress: games => distinctDays(games),
    },
    // The table of the player's choice: the one with the most minutes.
    endurance: {
        range: ENDURANCE_MINUTES,
        calibrated: true,
        options: context => optionsWhenPlayable(context),
        progress: games => wholeMinutes(bestTableTotal(games, totalSeconds)),
    },
    marathon: {
        range: MARATHON_MINUTES,
        calibrated: true,
        options: context => optionsWhenPlayable(context),
        progress: games => wholeMinutes(totalSeconds(games)),
    },
    randomGames: {
        range: SOME,
        options: context => optionsWhenPlayable(context),
        progress: games => games.filter(game => game.randomGame).length,
    },
    // The table of the player's choice: the one with the most games.
    sameTableGames: {
        range: MANY,
        calibrated: true,
        options: context => optionsWhenPlayable(context),
        progress: games => bestTableTotal(games, tableGames => tableGames.length),
    },
});
export const CHALLENGE_TEMPLATE_IDS = Object.freeze(Object.keys(TEMPLATES));

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

    const getLocks = () => ({ ...NO_CHALLENGE, ...profileStore.getCabinetData()[CABINET_KEY] });
    const isChallenge = challenge => Boolean(challenge && challenge.template in TEMPLATES);
    const progressOf = (challenge, games) => TEMPLATES[challenge.template].progress(games, challenge.param);

    // The target of the drawn option: calibrated on the bar-setting
    // Profiles' last weeks, at least the range's minimum and at most the
    // option's cap; else drawn in the range.
    function targetOf(template, option, barSetters, now) {
        const { range } = template;
        const calibrated = template.calibrated
            ? calibration.targetFor(barSetters, games => template.progress(games, option.param), { range, cap: option.max }, now)
            : null;
        return calibrated === null ? randomInt(range.min, Math.min(range.max, option.max)) : calibrated;
    }

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
        const context = { visibleTables: host.getVisibleTables(), profilePlays, now, daysLeft: daysLeftInWeek(now) };
        const candidates = Object.entries(TEMPLATES)
            .filter(([id]) => !previous || previous.template !== id)
            .map(([id, template]) => ({
                id,
                options: template.options(context).filter(option => option.max >= template.range.min),
            }))
            .filter(candidate => candidate.options.length > 0);
        if (candidates.length === 0) return { week, template: NO_TEMPLATE, param: null, target: 0 };
        const { id, options } = candidates[randomIndex(candidates.length)];
        const option = options[randomIndex(options.length)];
        return { week, template: id, param: option.param, target: targetOf(TEMPLATES[id], option, barSetters, now) };
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

    // The started game's facts, noted at "gamestarted" because by its Play
    // the Profile store has recorded it (a never played table stops being
    // one) and the Period may have changed; by table, until its Play or its
    // next start.
    const startedFacts = new Map();

    function factsOf(game, start) {
        const play = profileStore.getPlay(game.configId);
        const dayTable = tableOfTheDay.getTable();
        const weekTable = tableOfTheWeek.getTable();
        return {
            configId: game.configId,
            manufacturer: manufacturerOf(game),
            decade: decadeOf(game),
            day: formatDateKey(start),
            seconds: 0,
            randomGame: randomGame.isStartedGameRandom(),
            isTableOfTheDay: Boolean(dayTable && dayTable.configId === game.configId),
            isTableOfTheWeek: Boolean(weekTable && weekTable.configId === game.configId),
            wasNeverPlayed: wasNeverPlayed(play),
            wasDusty: wasDusty(play, start),
        };
    }

    // Fires on table launch.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, ev => {
        if (!ev.game) return;
        // Forgotten first, so that a start whose facts cannot be read never
        // counts with an earlier short game's facts.
        startedFacts.delete(ev.game.configId);
        startedFacts.set(ev.game.configId, factsOf(ev.game, host.now()));
    }));

    // Fires on "gameover" for a Play only (ADR 0008); the first Play to reach
    // the target of its week's Challenge completes it.
    profileStore.onPlay(safeHandler(SCRIPT_NAME, ({ profileName, configId, start, seconds }) => {
        const facts = startedFacts.get(configId);
        if (!facts) return;
        startedFacts.delete(configId);
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
