// ============================================================
// Challenge templates, shared by the Challenge and the Household Challenge:
// each one's target range, feasible options, condition, progress over game
// records and tables to play; the draw of a template and option, and the
// facts of a started game. No side effects but the "gamestarted" listener
// of createStartedFacts().
// - Template ids are players' saved data (cabinet.json, history): never rename one.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { formatDateKey } from "../tables/period_table.js";
import { manufacturerOf, decadeOf } from "./calibration.js";
import config from "../core/config.js";

// Each template's target range: a casual play goal, never a trivial one.
const targetRange = (min, max) => Object.freeze({ min, max });
const MANY = targetRange(4, 8);
const SOME = targetRange(3, 6);
const FEW = targetRange(3, 5);
const ENDURANCE_MINUTES = targetRange(20, 45);
const MARATHON_MINUTES = targetRange(60, 120);
const DUSTY_DAYS = 183;
const DAY_MS = 24 * 60 * 60 * 1000;

// The week's lock when no template was feasible.
export const NO_TEMPLATE = "";

// Today included: 7 on Monday, 1 on Sunday.
export const daysLeftInWeek = date => 7 - (date.getDay() + 6) % 7;

export const NO_PLAY = Object.freeze({ count: 0, lastPlayed: "" });
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

// range: the target's { min, max }, counts, or minutes for endurance and marathon.
// calibrated: progress reads only a game's table, manufacturer, decade, day
// and seconds, which the Play Log can rebuild (calibration.js): the target
// follows the last weeks once there is enough of it.
// options(context): the { param, max } choices, max capping the target; an
// option whose cap is below range.min is not feasible. context.reachableCount(matches)
// is how many visible tables whose play record matches can be counted.
// matches(game, param): the condition a game meets to count, for the
// templates that have one; progress(games, param): the value compared with the target.
// tablesToPlay(context): the visible tables that would move the challenge
// forward; only for the templates where that makes sense.
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
        matches: (game, manufacturer) => game.manufacturer === manufacturer,
        progress: (games, manufacturer) => distinctTables(games.filter(game => game.manufacturer === manufacturer)),
        tablesToPlay: ({ visibleTables, games, param }) =>
            notCounted(visibleTables.filter(table => manufacturerOf(table) === param), games),
    },
    decadeTables: {
        range: SOME,
        calibrated: true,
        options: context => groupOptions(context.visibleTables, decadeOf),
        matches: (game, decade) => game.decade === decade,
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
        options: context => cappedOptions(context.reachableCount(wasNeverPlayed)),
        matches: game => game.wasNeverPlayed,
        progress: games => distinctTables(games.filter(game => game.wasNeverPlayed)),
        tablesToPlay: ({ visibleTables, playOf }) => visibleTables.filter(table => wasNeverPlayed(playOf(table))),
    },
    dustyTables: {
        range: FEW,
        options: context => cappedOptions(context.reachableCount(play => wasDusty(play, context.now))),
        matches: game => game.wasDusty,
        progress: games => distinctTables(games.filter(game => game.wasDusty)),
        tablesToPlay: ({ visibleTables, playOf, now }) => visibleTables.filter(table => wasDusty(playOf(table), now)),
    },
    tableOfTheDayDays: {
        range: FEW,
        options: context => optionsWhenPlayable(context, context.daysLeft),
        matches: game => game.isTableOfTheDay,
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
        matches: game => game.isTableOfTheWeek,
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
        matches: game => game.randomGame,
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
export const CHALLENGE_TEMPLATES = TEMPLATES;
export const CHALLENGE_TEMPLATE_IDS = Object.freeze(Object.keys(TEMPLATES));

export const isDrawnChallenge = challenge => Boolean(challenge && challenge.template in TEMPLATES);
export const progressOf = (challenge, games) => TEMPLATES[challenge.template].progress(games, challenge.param);
// Whether a game meets the challenge's condition: any game, for a template without one.
export function meetsCondition(challenge, game) {
    const { matches } = TEMPLATES[challenge.template];
    return matches ? Boolean(matches(game, challenge.param)) : true;
}

// One of the templates not excluded with a feasible option, and one of its
// feasible options: { id, template, option }, or null when none is feasible.
export function drawTemplate(context, excludedIds, randomIndex) {
    const candidates = Object.entries(TEMPLATES)
        .filter(([id]) => !excludedIds.includes(id))
        .map(([id, template]) => ({
            id,
            template,
            options: template.options(context).filter(option => option.max >= template.range.min),
        }))
        .filter(candidate => candidate.options.length > 0);
    if (candidates.length === 0) return null;
    const { id, template, options } = candidates[randomIndex(candidates.length)];
    return { id, template, option: options[randomIndex(options.length)] };
}

// The started game's facts, noted at "gamestarted" because by its Play the
// Profile store has recorded it (a never played table stops being one, for
// the Profile who plays) and the Period may have changed; by table, until
// its Play or its next start. take(configId) hands them over once.
export function createStartedFacts(host, profileStore, { tableOfTheDay, tableOfTheWeek, randomGame, scriptName }) {
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
    host.on("gamestarted", safeHandler(scriptName, ev => {
        if (!ev.game) return;
        // Forgotten first, so that a start whose facts cannot be read never
        // counts with an earlier short game's facts.
        startedFacts.delete(ev.game.configId);
        startedFacts.set(ev.game.configId, factsOf(ev.game, host.now()));
    }));

    return {
        take(configId) {
            const facts = startedFacts.get(configId);
            startedFacts.delete(configId);
            return facts || null;
        },
    };
}
