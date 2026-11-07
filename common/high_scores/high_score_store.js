// ============================================================
// High Score store: the High Scores Add-on's memory in high_scores.json, next
// to cabinet.json. Per table: the last known board with each place's owner,
// and the learned board source of a table without ROM. Every High Score
// ever won, and every Play Score. Per Profile: the dates its Achievements and Lost Records count
// from. Settles each Play against the board read after it.
// - Saved through the Profile store, so no Profile Reset touches it.
// - A ROM reset (too many new places, a place gone unbeaten) gives Default Scores.
// - A board read outside a Play waits until the Play on that table is settled.
// ============================================================

import { hasUnbeatenGonePlace, newPlaces, placeKey } from "./board_reader.js";
import { getProfileStore, toLocalIsoString } from "../profiles/profile_store.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { safeHandler, logHandlerError } from "../core/safe_handler.js";

const RECORD_NAME = "high_scores";
const RECORD_VERSION = 1;
// More new places than a 4-player game can make: the ROM went back to its
// factory scores, which stay on the board as the scores to beat.
const MAX_NEW_PLACES_PER_PLAY = 4;
// The High Scores Add-on's name in logfile.log, for its shared modules too.
export const SCRIPT_NAME = "HighScores";

// Profile names ignore case.
const profileKeyOf = name => name.toLowerCase();
// Whether a board place belongs to the named Profile.
const isPlaceOf = profileName => place => typeof place.owner === "string" && profileKeyOf(place.owner) === profileKeyOf(profileName);
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const countPlaces = count => (count === 1 ? "1 new place" : `${count} new places`);
// On the Household and Personal Boards: the better score first, the older on equal scores.
const ranksBefore = (a, b) => Number(a.score) > Number(b.score) || (Number(a.score) === Number(b.score) && a.date < b.date);
const PERSONAL_BOARD_PLACES = 5;
// entries: { highScore, owner }; the places they make, ranked: { rank, score, date, owner }.
const rankedPlaces = entries => entries
    .sort((a, b) => (ranksBefore(a.highScore, b.highScore) ? -1 : ranksBefore(b.highScore, a.highScore) ? 1 : 0))
    .map(({ highScore, owner }, index) => ({ rank: index + 1, score: Number(highScore.score), date: highScore.date, owner }));

// The places with their owners: a place of the known board keeps its
// owner, any other one gets newOwner. A board never repeats a place, so
// its key finds it.
function withOwners(places, knownBoard, newOwner) {
    const owners = new Map(knownBoard.map(place => [placeKey(place), place.owner]));
    return places.map(({ rank, initials, score }) => {
        const key = placeKey({ initials, score });
        return { rank, initials, score, owner: owners.has(key) ? owners.get(key) : newOwner };
    });
}

export function createHighScoreStore(host, profileStore) {
    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    const saved = profileStore.readCabinetFile(RECORD_NAME);
    const data = isRecord(saved) && isRecord(saved.tables) && Array.isArray(saved.highScores)
        ? saved
        : { version: RECORD_VERSION, tables: {}, highScores: [] };
    // Called after every save, even a failed one: what the readers see
    // changed already (a board, a High Score or a reset).
    const savedListeners = [];
    const save = () => {
        try {
            profileStore.saveCabinetFile(RECORD_NAME, data);
        } finally {
            savedListeners.forEach(listener => listener());
        }
    };

    const knownBoardOf = (configId) => {
        const entry = data.tables[configId];
        return isRecord(entry) && Array.isArray(entry.board) ? entry.board : null;
    };
    const setBoard = (configId, board) => {
        data.tables[configId] = { ...(isRecord(data.tables[configId]) ? data.tables[configId] : {}), board };
    };
    const learnedSources = () => (isRecord(data.learnedSources) ? data.learnedSources : {});
    // The Profile store's Profile under that name, or null.
    const profileNamed = (name, profiles = profileStore.listProfiles()) => (typeof name === "string"
        && profiles.find(profile => profileKeyOf(profile.name) === profileKeyOf(name))) || null;
    // The date a Profile's High Scores count from: its last Profile Reset; "" without one.
    const countsFrom = profileKey => (isRecord(data.achievementsFrom) && data.achievementsFrom[profileKey]) || "";
    // The scores of the list ({ profile, configId, score, date }) made on
    // the table since their Profile's last Profile Reset.
    const countedOn = (list, configId) => list.filter(entry => isRecord(entry) && entry.configId === configId
        && typeof entry.profile === "string" && entry.date >= countsFrom(profileKeyOf(entry.profile)));
    const countedHighScoresOn = configId => countedOn(data.highScores, configId);
    // A file without the list has no Play Score.
    const countedPlayScoresOn = configId => countedOn(Array.isArray(data.playScores) ? data.playScores : [], configId);
    // What the Household and Personal Boards rank: High Scores and Play Scores together.
    const countedScoresOn = configId => [...countedHighScoresOn(configId), ...countedPlayScoresOn(configId)];
    const profileExists = name => profileStore.listProfileNames().some(candidate => profileKeyOf(candidate) === profileKeyOf(name));
    // The Household Board of the table: for each Household Profile
    // (Guest left out, Child Profiles in), its best High Score or Play
    // Score there since its last Profile Reset, best first, the older
    // first on equal scores: { rank, score, date, owner }, the owner the
    // Profile store's Profile. A removed Profile's scores are skipped,
    // nothing rewritten: a Profile re-created under its name gets them back.
    function householdBoardOf(configId) {
        const bestByProfile = new Map();
        for (const score of countedScoresOn(configId)) {
            const profileKey = profileKeyOf(score.profile);
            const best = bestByProfile.get(profileKey);
            if (!best || ranksBefore(score, best)) bestByProfile.set(profileKey, score);
        }
        return rankedPlaces(profileStore.listProfiles()
            .filter(profile => !profile.isGuest && bestByProfile.has(profileKeyOf(profile.name)))
            .map(owner => ({ highScore: bestByProfile.get(profileKeyOf(owner.name)), owner })));
    }
    // The Profile first on the table's Household Board, or null.
    const householdLeaderOf = (configId) => {
        const first = householdBoardOf(configId)[0];
        return first ? first.owner : null;
    };
    // Called with the Profile's name after a Play credited it High Scores.
    const creditedListeners = [];
    // The tables whose Play is being settled, by config ID: the board
    // reads outside a Play waiting for it.
    const heldBoards = new Map();

    // Fires after any change of a Profile's data: its High Score
    // Achievements count afresh from its Profile Reset. The key is written
    // only then, so a file without a reset keeps its first shape.
    profileStore.onUpdate(safeHandler(SCRIPT_NAME, (profileName, { isReset }) => {
        if (!isReset) return;
        if (!isRecord(data.achievementsFrom)) data.achievementsFrom = {};
        data.achievementsFrom[profileKeyOf(profileName)] = toLocalIsoString(host.now());
        save();
    }));

    // A table with no known board takes the places as its baseline, all Default Scores.
    function takeBaseline(configId, places, why) {
        setBoard(configId, withOwners(places, [], null));
        save();
        log(`"${configId}": ${why}`);
    }

    // A board read outside a Play: the places it did not know are Default
    // Scores, set outside the pack.
    function recordOutsidePlay(configId, places) {
        const known = knownBoardOf(configId);
        if (!known) {
            takeBaseline(configId, places, `first board read, ${places.length} places, all Default Scores.`);
            return;
        }
        const board = withOwners(places, known, null);
        if (JSON.stringify(board) === JSON.stringify(known)) return;
        setBoard(configId, board);
        save();
        log(`"${configId}": board changed outside a Play, ${countPlaces(newPlaces(known, places).length)} as Default Scores.`);
    }

    return {
        // A board read outside a Play (places from the board reader),
        // recorded at once or, while a Play on the table is being settled,
        // after it. Resolves once recorded.
        recordBoard(configId, places) {
            const waiting = heldBoards.get(configId);
            if (!waiting) {
                recordOutsidePlay(configId, places);
                return Promise.resolve();
            }
            // Resolved even when recording throws (logged by the release), so no reader waits forever.
            return new Promise(resolve => waiting.push(() => {
                try {
                    recordOutsidePlay(configId, places);
                } finally {
                    resolve();
                }
            }));
        },
        // The board a ROM-less table held before the Play (read from the
        // snapshot taken at launch), recorded as a board read outside a
        // Play while that Play is being settled: it never waits for it.
        recordBoardBeforePlay(configId, places) {
            recordOutsidePlay(configId, places);
        },
        // The source learned for the table, or null.
        sourceOf(configId) {
            const sources = learnedSources();
            return isRecord(sources[configId]) ? sources[configId] : null;
        },
        // The config IDs of every table with a learned source.
        learnedTables() {
            const sources = learnedSources();
            return Object.keys(sources).filter(configId => isRecord(sources[configId]));
        },
        // Remembers for good where the table keeps its board. The key is
        // written only then, so a file without one keeps its first shape.
        learnSource(configId, source) {
            if (!isRecord(data.learnedSources)) data.learnedSources = {};
            data.learnedSources[configId] = source;
            save();
        },
        // From the game's end until its Play is settled (or given up): the
        // board reads outside a Play on the table wait. Returns the
        // release, to call once.
        holdBoardForPlay(configId) {
            const waiting = [];
            heldBoards.set(configId, waiting);
            return () => {
                if (heldBoards.get(configId) === waiting) heldBoards.delete(configId);
                for (const record of waiting) {
                    try {
                        record();
                    } catch (error) {
                        logHandlerError(SCRIPT_NAME, error);
                    }
                }
            };
        },
        // The board read after a game, compared with the last known board;
        // play: the Play the Profile store announced ({ profileName, start, ... }),
        // or null for a game under a minute. The new places are Default
        // Scores after a game under a minute or a ROM reset. Returns the
        // best place credited ({ rank, initials, score, takenFromProfile }),
        // or null; takenFromProfile is the Profile store's Profile a Table
        // Record was taken from, else null.
        settlePlay(configId, places, play) {
            const known = knownBoardOf(configId);
            if (!known) {
                takeBaseline(configId, places, "no board known before the game; the board after it is the baseline, nothing credited.");
                return null;
            }
            const added = newPlaces(known, places);
            const tooManyNew = added.length > MAX_NEW_PLACES_PER_PLAY;
            const romReset = tooManyNew || hasUnbeatenGonePlace(known, places);
            const credited = play !== null && !romReset;
            const board = withOwners(places, known, credited ? play.profileName : null);
            const changed = JSON.stringify(board) !== JSON.stringify(known);
            setBoard(configId, board);
            if (!credited) {
                save();
                const game = play ? `a Play by ${play.profileName}` : "a game under a minute";
                const resetSign = tooManyNew ? `more than a ${MAX_NEW_PLACES_PER_PLAY}-player game can make` : "but a place gone from the board was beaten by no new place";
                if (romReset) log(`"${configId}": ${countPlaces(added.length)} after ${game}, ${resetSign}: a ROM reset, nothing credited, the new places are Default Scores.`);
                else if (changed) log(`"${configId}": ${countPlaces(added.length)} after ${game}, as Default Scores.`);
                return null;
            }
            const formerOwner = known.length > 0 ? known[0].owner : null;
            let takenFromProfile = null;
            for (const place of added) {
                const tableRecord = place.rank === 1;
                const takenFrom = tableRecord && formerOwner !== null && formerOwner.toLowerCase() !== play.profileName.toLowerCase()
                    && profileExists(formerOwner) ? formerOwner : null;
                data.highScores.push({
                    profile: play.profileName, configId, score: place.score, initials: place.initials, place: place.rank,
                    date: toLocalIsoString(play.start), tableRecord, takenFrom,
                });
                if (takenFrom !== null) takenFromProfile = profileNamed(takenFrom);
                const tableRecordNote = takenFrom !== null ? `, Table Record taken from ${takenFrom}` : (tableRecord ? ", Table Record" : "");
                log(`"${configId}": High Score for ${play.profileName}: place ${place.rank}, ${place.score} (${place.initials || "no initials"})${tableRecordNote}.`);
            }
            save();
            if (added.length === 0) log(`"${configId}": Play by ${play.profileName}, no new place${changed ? " (board changed)" : ""}.`);
            else creditedListeners.forEach(listener => listener(play.profileName));
            const bestPlace = added.reduce((best, place) => (best === null || place.rank < best.rank ? place : best), null);
            return bestPlace === null ? null : { ...bestPlace, takenFromProfile };
        },
        // The score read from the table's memory after a Play (play as for
        // settlePlay), kept as a Play Score unless a High Score of that
        // Play has the same score. The list is written only then, so a file
        // without Play Scores keeps its first shape. Returns the record it
        // sets: { kind: "houseRecord", takenFrom } (the Profile store's
        // Profile whose first place on the Household Board it took),
        // { kind: "personalBest" } (above all the Profile's earlier scores
        // there), or null.
        recordPlayScore(configId, play, score) {
            const profileKey = profileKeyOf(play.profileName);
            const isOwn = entry => typeof entry.profile === "string" && profileKeyOf(entry.profile) === profileKey;
            const date = toLocalIsoString(play.start);
            if (data.highScores.some(highScore => isOwn(highScore) && highScore.configId === configId && highScore.date === date
                && Number(highScore.score) === score)) {
                log(`"${configId}": Play Score ${score} for ${play.profileName} is the Play's High Score; not kept twice.`);
                return null;
            }
            const earlierScores = countedScoresOn(configId).filter(isOwn);
            const leaderBefore = householdLeaderOf(configId);
            if (!Array.isArray(data.playScores)) data.playScores = [];
            data.playScores.push({ profile: play.profileName, configId, score, date });
            save();
            log(`"${configId}": Play Score for ${play.profileName}: ${score}.`);
            const leaderAfter = householdLeaderOf(configId);
            const tookLead = leaderBefore !== null && leaderAfter !== null
                && profileKeyOf(leaderBefore.name) !== profileKey && profileKeyOf(leaderAfter.name) === profileKey;
            if (tookLead) return { kind: "houseRecord", takenFrom: leaderBefore };
            const personalBest = earlierScores.length > 0 && earlierScores.every(earlier => score > Number(earlier.score));
            return personalBest ? { kind: "personalBest" } : null;
        },
        // What the named Profile's High Score Achievements count, from the
        // High Scores it won since its last Profile Reset: the tables with
        // one, the tables with a Table Record, whether it took a Table
        // Record from another Profile, and from a grown-up: a Household
        // Profile that is not a child, as the Profile store marks it now.
        achievementCountsOf(profileName) {
            const profileKey = profileKeyOf(profileName);
            const from = countsFrom(profileKey);
            const won = data.highScores.filter(highScore => typeof highScore.profile === "string"
                && profileKeyOf(highScore.profile) === profileKey && highScore.date >= from);
            const tablesOf = highScores => new Set(highScores.map(highScore => highScore.configId)).size;
            const takings = won.filter(highScore => typeof highScore.takenFrom === "string");
            // Only read when something was taken: most Profiles took nothing.
            const profiles = takings.length > 0 ? profileStore.listProfiles() : [];
            const isGrownUp = name => {
                const profile = profileNamed(name, profiles);
                return profile !== null && !profile.isGuest && !profileStore.isChild(profile.name);
            };
            return {
                highScoreTables: tablesOf(won),
                tableRecordTables: tablesOf(won.filter(highScore => highScore.tableRecord)),
                tookTableRecord: takings.length > 0,
                tookGrownUpTableRecord: takings.some(highScore => isGrownUp(highScore.takenFrom)),
            };
        },
        // Where the named Profile stands on the last known boards today,
        // counted in tables: those where it has a place, and those whose
        // first place is its own. A removed Profile's places read as
        // Default Scores, nothing rewritten: a Profile re-created under its
        // name gets them back. Every known board counts, a hidden or
        // removed table's too: hiding a table never erases a record.
        heldBy(profileName) {
            if (!profileExists(profileName)) return { highScores: 0, tableRecords: 0 };
            const isOwn = isPlaceOf(profileName);
            const boards = Object.keys(data.tables).map(knownBoardOf).filter(board => board !== null);
            return {
                highScores: boards.filter(board => board.some(isOwn)).length,
                tableRecords: boards.filter(board => board.length > 0 && isOwn(board[0])).length,
            };
        },
        // The same tables as heldBy() counts, for My High Scores: each one
        // where the named Profile has a place on the last known board, with
        // the best place it holds there ({ configId, bestPlace }), in the
        // file's table order.
        placesHeldBy(profileName) {
            if (!profileExists(profileName)) return [];
            const isOwn = isPlaceOf(profileName);
            return Object.keys(data.tables)
                .map(configId => ({ configId, own: (knownBoardOf(configId) || []).filter(isOwn) }))
                .filter(({ own }) => own.length > 0)
                .map(({ configId, own }) => ({ configId, bestPlace: Math.min(...own.map(place => place.rank)) }));
        },
        // The table's last known board as the High Score Board shows it, in
        // board order: { rank, initials, score, owner }, the owner the
        // Profile store's Profile ({ name, isGuest, avatarPath }) or null for
        // a Default Score, a removed Profile's places included, nothing
        // rewritten. Null when the table was never read.
        boardOf(configId) {
            const known = knownBoardOf(configId);
            if (!known) return null;
            const profiles = profileStore.listProfiles();
            return known.map(({ rank, initials, score, owner }) => ({ rank, initials, score, owner: profileNamed(owner, profiles) }));
        },
        householdBoardOf,
        // The Personal Board of the table: the named Profile's (Guest
        // included) PERSONAL_BOARD_PLACES best High Scores and Play Scores
        // there since its last Profile Reset, each place of a multiplayer
        // game included, ranked and shaped as householdBoardOf()'s. None
        // for a removed Profile.
        personalBoardOf(configId, profileName) {
            const owner = profileNamed(profileName);
            if (!owner) return [];
            const profileKey = profileKeyOf(profileName);
            // rankedPlaces() takes a Play Score as it takes a High Score.
            return rankedPlaces(countedScoresOn(configId)
                .filter(score => profileKeyOf(score.profile) === profileKey)
                .map(score => ({ highScore: score, owner }))).slice(0, PERSONAL_BOARD_PLACES);
        },
        // The named Profile's Lost Records on the given visible tables (by
        // config ID), most recent first, one per table: { configId, taker },
        // the taker the Profile store's Profile that took the Table Record
        // from it most recently there since its seen marker. Left out: a
        // table whose last known board has the Profile first again, and one
        // whose taker was removed since. None without a marker, nor for
        // Guest.
        lostRecordsOf(profileName, visibleConfigIds) {
            const profileKey = profileKeyOf(profileName);
            const profile = profileNamed(profileName);
            const seen = isRecord(data.lostRecordsSeen) ? data.lostRecordsSeen[profileKey] : undefined;
            if (!profile || profile.isGuest || typeof seen !== "string") return [];
            const visible = new Set(visibleConfigIds);
            const holdsTableRecord = configId => {
                const known = knownBoardOf(configId);
                return known !== null && known.length > 0 && typeof known[0].owner === "string" && profileKeyOf(known[0].owner) === profileKey;
            };
            const takings = data.highScores
                .filter(highScore => typeof highScore.takenFrom === "string" && profileKeyOf(highScore.takenFrom) === profileKey
                    && highScore.date > seen && visible.has(highScore.configId) && !holdsTableRecord(highScore.configId))
                .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
            const latestByTable = new Map();
            for (const highScore of takings) {
                if (!latestByTable.has(highScore.configId)) latestByTable.set(highScore.configId, highScore);
            }
            return [...latestByTable.values()]
                .map(highScore => ({ configId: highScore.configId, taker: profileNamed(highScore.profile) }))
                .filter(record => record.taker !== null);
        },
        // The named Profile's Lost Records so far are seen; never for
        // Guest, which has none. The key is written only then, so a file
        // without a shown Welcome Screen keeps its first shape.
        markLostRecordsSeen(profileName) {
            const profile = profileNamed(profileName);
            if (!profile || profile.isGuest) return;
            if (!isRecord(data.lostRecordsSeen)) data.lostRecordsSeen = {};
            data.lostRecordsSeen[profileKeyOf(profileName)] = toLocalIsoString(host.now());
            save();
        },
        onCredited(listener) { creditedListeners.push(listener); },
        // listener(): after any change of the file is saved.
        onSaved(listener) { savedListeners.push(listener); },
    };
}

let sharedHighScoreStore = null;

// The one store the High Scores Add-on, the Achievements and the stats share.
export function getHighScoreStore() {
    if (!sharedHighScoreStore) sharedHighScoreStore = createHighScoreStore(createPinballYHost(), getProfileStore());
    return sharedHighScoreStore;
}
