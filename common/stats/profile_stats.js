// ============================================================
// Profile Stats: the drawn screen summing up the active Profile's plays
// (card with Player Level and Collection Mastery, GAME, PROGRESSION and
// TASTES sections). Its buttons open the Achievement List, the Avatar Frame
// list, the filters and the Household Stats; this screen waits set aside
// meanwhile. openReadOnly() shows another Profile's, readStats() reads any.
// - Read again on each opening, one section per step (docs/adr/0014).
// - Its buttons and attract mode go through the Drawn Screen controls.
// - A null dependency (disabled Add-on) hides its line or button.
// - Opens directly, not through the wheel dialog module; isOpen() / onClosed() for the dialogs.
// ============================================================

import lang from "../core/i18n.js";
import config from "../core/config.js";
import { getDecadeStartYear } from "../achievements/decade.js";
import { cleanTitle } from "../tables/table_title.js";
import { untrackedConfigIdsOf } from "../core/untracked_tables.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { countPlayedTablesIn, tablesVisibleTo } from "../tables/visible_tables.js";
import { collectionMasteryOfProfile } from "../mastery/table_mastery.js";
import { collectionTextsOf } from "../mastery/mastery_bar.js";
import { getHallOfFame } from "./hall_of_fame.js";
import { getTablesToDiscover } from "../tables/tables_to_discover.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { prepareDrawnScreen } from "./drawn_screen.js";
import { playerLevelColorOf } from "../drawing/steamball_drawing.js";
import { exitButtonLookOf, exitButtonWordOf, buttonHintGroupsOf, FLIPPER_HINT } from "../drawing/button_hints.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import { PROFILE_STATS_Z_INDEX, REFERENCE_HEIGHT, CHOICE, AVATAR_FRAME_WIDTH, drawBackdrop, layoutProfileStats } from "./profile_stats_painter.js";

const SCRIPT_NAME = "ProfileStats";
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const MISSING_IMAGE_FILE = "assets\\images\\missing_image.png";
const NO_PLAY = Object.freeze({ count: 0, seconds: 0 });
const untimed = (reader, read) => read();
const unshared = run => run();

// withAchievementSets(run): runs run() with the Achievement sets that
// readPlayerLevel and countAchievements build shared between them.
export function createProfileStats(host, {
    profileStore, readPlayerLevel, countAchievements, withAchievementSets = unshared, achievementList, profileRewards = null, frameList = null, dailyStreak, tableOfTheDay, tableOfTheWeek, challenges = null,
    highScores = null, hallOfFameFilter = null, tablesToDiscoverFilter = null, householdStats = null, drawingAhead, drawnScreenControls,
}) {
    const { profileStats: TEXT } = lang;
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);
    // Each opening on its stack keeps its own state: the active Profile's
    // screen, set aside under the Household Stats, comes back as it was left
    // over another Profile's opened from them.
    const controls = drawnScreenControls.register(SCRIPT_NAME);

    // Over every table the Profile played, hidden or no longer listed ones
    // included (hiding a table never erases a player's history), Untracked
    // Tables already left out of trackedPlays.
    function sumPlays(trackedPlays) {
        const plays = Object.values(trackedPlays);
        return {
            count: plays.reduce((sum, play) => sum + play.count, 0),
            seconds: plays.reduce((sum, play) => sum + play.seconds, 0),
        };
    }

    // The named Profile's data and the tables it can see, whoever looks
    // (looking is not picking a table); a tier it reached stays. trackedPlays:
    // its saved Plays without the Untracked Tables', which stay in its file.
    function readProfileData(profileName) {
        const data = profileStore.getProfileDataOf(profileName);
        const untrackedConfigIds = untrackedConfigIdsOf(host.getAllTables());
        return {
            data,
            profileTables: tablesVisibleTo(host.getVisibleTables(), profileStore, profileName),
            untrackedConfigIds,
            trackedPlays: Object.fromEntries(Object.entries(data.plays).filter(([configId]) => !untrackedConfigIds.has(configId))),
        };
    }

    // The card's values that another Profile's can be set beside; timeReader:
    // readStats()'s. The Player Level and the Achievements count share one
    // build of each Achievement set, its time under the Player Level.
    function readCardStats(profileName, { data, profileTables }, timeReader = untimed) {
        return withAchievementSets(() => ({
            playerLevel: timeReader("Player Level", () => readPlayerLevel(profileName)),
            collectionMastery: timeReader("Collection Mastery", () => collectionMasteryOfProfile(profileTables, data)),
            achievements: timeReader("Achievements", () => countAchievements(profileName)),
        }));
    }

    // The PROGRESSION section's values that another Profile's can be set beside.
    function readProgressionStats(profileName, { data, profileTables }, timeReader = untimed) {
        return {
            // The Collection Achievements' rule, so the two never disagree.
            collection: { played: countPlayedTablesIn(profileTables, data.plays), total: profileTables.length },
            dailyStreak: timeReader("Daily Streak", () => dailyStreak.read(profileName)),
            // Null without the Challenges Add-on.
            challenges: challenges ? timeReader("Challenges", () => challenges.getRecord(profileName)) : null,
            // Where it stands on the boards; null without the High Scores Add-on.
            boards: highScores ? timeReader("boards", () => highScores.heldBy(profileName)) : null,
        };
    }

    // Every value of the Profile Stats that another Profile's can be set
    // beside, for the named Profile (the active one by default): the same
    // readers as the screen's, so a value never differs between screens.
    // Reads only, another Profile's profile.json once for every reader.
    // timeReader(reader, read): runs read() and returns what it returns,
    // free to time it under the reader's name (the Household Stats' line).
    function readStats(profileName = profileStore.getActiveProfile().name, timeReader = untimed) {
        return profileStore.withCachedReads(() => {
            const profileData = readProfileData(profileName);
            return {
                plays: sumPlays(profileData.trackedPlays),
                ...readCardStats(profileName, profileData, timeReader),
                ...readProgressionStats(profileName, profileData, timeReader),
            };
        });
    }

    const hoursAndMinutes = totalMinutes =>
        TEXT.hoursAndMinutes(Math.floor(totalMinutes / MINUTES_PER_HOUR), totalMinutes % MINUTES_PER_HOUR);

    // Minutes under an hour, else hours and minutes; rounded once, so 59 min
    // 40 s shows "1 h 00".
    function averageOf({ count, seconds }) {
        if (count === 0) return TEXT.none;
        const minutes = Math.round(seconds / count / SECONDS_PER_MINUTE);
        return minutes < MINUTES_PER_HOUR ? TEXT.minutes(minutes) : hoursAndMinutes(minutes);
    }

    // A selection button, left out when its Add-on is off or it has no table:
    // the player is never sent to an empty wheel.
    function selectionButton(choice, label, filterId, tables) {
        return filterId !== null && tables.length > 0 ? [{ choice, label, count: TEXT.number(tables.length), filterId }] : [];
    }

    // Left out without frames to choose (Table Mastery off).
    function frameButton() {
        const frames = frameList && frameList.count();
        return frames ? [{ choice: CHOICE.FRAME, label: TEXT.buttons.frame, count: TEXT.fraction(frames.unlocked, frames.total) }] : [];
    }

    // Left out while the Household has fewer than two Profiles; its count:
    // the Profiles in the Household Stats, Guest left out.
    function householdButton() {
        if (!householdStats) return [];
        const count = householdStats.countProfiles();
        return count >= 2 ? [{ choice: CHOICE.HOUSEHOLD, label: TEXT.buttons.household, count: TEXT.number(count) }] : [];
    }

    function collectionStat({ played, total }) {
        const share = total === 0 ? 0 : played / total;
        // Rounded, but 100 only once complete: 199/200 shows 99.
        const percent = share < 1 ? Math.min(99, Math.round(share * 100)) : 100;
        return {
            label: TEXT.stats.collection,
            value: TEXT.fraction(played, total),
            pill: { text: TEXT.percent(percent), isLit: true },
            share,
        };
    }

    // A Daily Streak or Period Table Streak, its longest in a pill, gold
    // while the current one, at least 1, sets it.
    function streakStat(label, { current, longest }) {
        const isRecord = current > 0 && current >= longest;
        return {
            label,
            value: TEXT.number(current),
            pill: { text: TEXT.record(TEXT.number(longest)), isLit: isRecord },
        };
    }

    const periodTableStreakOf = (periodTable, profileName) =>
        ({ current: periodTable.getStreak(profileName), longest: periodTable.getLongestStreak(profileName) });

    // Absent without the Challenges Add-on: Collection then takes the row.
    function challengesStats(record) {
        if (!record) return [];
        const { completed, total } = record;
        return [{ label: TEXT.stats.challengesCompleted, value: TEXT.fraction(completed, total) }];
    }

    // A row of its own, absent without the High Scores Add-on.
    function highScoresStats(held) {
        if (!held) return [];
        return [[
            { label: TEXT.stats.highScoresHeld, value: TEXT.number(held.highScores) },
            { label: TEXT.stats.tableRecordsHeld, value: TEXT.number(held.tableRecords) },
        ]];
    }

    const playTimeOf = seconds => TEXT.playTime(hoursAndMinutes(Math.floor(seconds / SECONDS_PER_MINUTE)));

    // The group of the Profile's tables (by getKey, null for none) with the
    // most play seconds, then games, then the first in alphabetical order,
    // so it never changes at random; null before any Play.
    function findFavourite(profileTables, getPlay, getKey) {
        const groups = new Map();
        for (const game of profileTables) {
            const key = getKey(game);
            const play = getPlay(game.configId);
            if (key === null || play.count === 0) continue;
            const group = groups.get(key) || { key, count: 0, seconds: 0 };
            group.count += play.count;
            group.seconds += play.seconds;
            groups.set(key, group);
        }
        const [favourite = null] = [...groups.values()]
            .sort((a, b) => b.seconds - a.seconds || b.count - a.count || String(a.key).localeCompare(String(b.key)));
        return favourite;
    }

    function favouriteStat(label, favourite, valueOf) {
        return favourite === null
            ? { label, value: TEXT.none }
            : { label, value: valueOf(favourite.key), pill: { text: playTimeOf(favourite.seconds), isLit: false } };
    }

    // The community tables' manufacturer is not a real one.
    const manufacturerOf = game => (game.manufacturer && game.manufacturer !== config.communityTablesManufacturer ? game.manufacturer : null);

    // The earliest Play of the oldest Play Log year with one that is not an
    // Untracked Table's; null when there is none (older Plays are known only
    // by their totals).
    function readFirstPlay(profileName, untrackedConfigIds) {
        for (const year of profileStore.getPlayLogYearsOf(profileName)) {
            const [first = null] = profileStore.getPlayLogOf(profileName, year)
                .filter(play => !untrackedConfigIds.has(play.configId))
                .sort((a, b) => a.start.localeCompare(b.start));
            if (first) return first;
        }
        return null;
    }

    // The table of the Profile's latest Play, by its plays' lastPlayed (local
    // ISO strings, so they sort as text), hidden tables included, Untracked
    // Tables already left out of trackedPlays; null before any Play.
    function findLastPlay(trackedPlays) {
        return Object.entries(trackedPlays)
            .filter(([, play]) => play.lastPlayed)
            .reduce((latest, [configId, play]) => (!latest || play.lastPlayed > latest.lastPlayed ? { configId, lastPlayed: play.lastPlayed } : latest), null);
    }

    // A local ISO string's date, through playedOn.
    function playedOnOf(isoString) {
        const [year, month, day] = isoString.slice(0, 10).split("-");
        return TEXT.playedOn(day, month, year);
    }

    // A strip: its label, the table's wheel logo and cleaned title, and its
    // detail in a pill; "—" alone without a table.
    function tableStrip(label, game, detail) {
        return game === null
            ? { label, hasTable: false, title: TEXT.none, logoPath: null, pill: null }
            : { label, hasTable: true, title: cleanTitle(game.title), logoPath: game.logoPath, pill: { text: detail, isLit: false } };
    }

    // Without a wheel logo, the scrambled TV of the missing image; its
    // title when that asset is missing or unreadable too.
    function logoOrMissingImage(game) {
        const logoPath = game ? host.getWheelImage(game) : null;
        if (logoPath) return logoPath;
        const missingImagePath = `${host.getProjectFolder()}\\${MISSING_IMAGE_FILE}`;
        return host.files.isImageReadable(missingImagePath) ? missingImagePath : null;
    }

    // A table no longer in PinballY's list keeps its configId as title.
    function tableOf(configId) {
        const game = host.getGameInfo(configId);
        return { title: game ? game.title : configId, logoPath: logoOrMissingImage(game) };
    }

    function tastesSection(profile, { profileTables, trackedPlays, untrackedConfigIds, getPlay, hallOfFame }) {
        const favouriteGame = hallOfFame[0] || null;
        const firstPlay = readFirstPlay(profile.name, untrackedConfigIds);
        const lastPlay = findLastPlay(trackedPlays);
        return {
            title: TEXT.sections.tastes,
            rows: [[
                favouriteStat(TEXT.stats.favouriteManufacturer, findFavourite(profileTables, getPlay, manufacturerOf), name => name),
                favouriteStat(TEXT.stats.favouriteDecade, findFavourite(profileTables, getPlay, game => getDecadeStartYear(game.year)), TEXT.decade),
            ]],
            strips: [
                tableStrip(TEXT.stats.firstTablePlayed, firstPlay && tableOf(firstPlay.configId), firstPlay && playedOnOf(firstPlay.start)),
                tableStrip(TEXT.stats.favouriteTable, favouriteGame && tableOf(favouriteGame.configId),
                    favouriteGame && playTimeOf(getPlay(favouriteGame.configId).seconds)),
                tableStrip(TEXT.stats.lastTablePlayed, lastPlay && tableOf(lastPlay.configId), lastPlay && playedOnOf(lastPlay.lastPlayed)),
            ],
        };
    }

    const isActiveName = profileName => profileName.toLowerCase() === profileStore.getActiveProfile().name.toLowerCase();

    // The named Profile's record, with its Avatar.
    const profileNamed = profileName => (isActiveName(profileName)
        ? profileStore.getActiveProfile()
        : profileStore.listProfiles().find(profile => profile.name.toLowerCase() === profileName.toLowerCase()));

    // The card: the Profile, its Player Level, Collection Mastery and
    // buttons (none when isReadOnly: another Profile's screen, to look at
    // only), the Exit Button's look (hasReturn: Exit brings something back)
    // and the Button Hints, with what the sections read after it.
    function readCard(profile, isReadOnly, hasReturn) {
        const { data, profileTables, trackedPlays, untrackedConfigIds } = readProfileData(profile.name);
        const getPlay = configId => trackedPlays[configId] || NO_PLAY;
        const { achievements, playerLevel, collectionMastery } = readCardStats(profile.name, { data, profileTables });
        const hallOfFame = getHallOfFame(profileTables, getPlay);
        const exitLook = exitButtonLookOf(hasReturn);
        const buttons = isReadOnly ? [] : [
            ...frameButton(),
            ...householdButton(),
            { choice: CHOICE.ACHIEVEMENTS, label: TEXT.buttons.achievements, count: TEXT.fraction(achievements.unlocked, achievements.total) },
            ...selectionButton(CHOICE.TO_DISCOVER, TEXT.buttons.tablesToDiscover, tablesToDiscoverFilter, getTablesToDiscover(profileTables, profileStore)),
            ...selectionButton(CHOICE.MOST_PLAYED, TEXT.buttons.mostPlayedTables, hallOfFameFilter, hallOfFame),
        ];
        return {
            profileData: { data, profileTables, trackedPlays, untrackedConfigIds, getPlay, hallOfFame },
            card: {
                name: displayNameOf(profile),
                avatarPath: profile.avatarPath,
                framePath: profileRewards ? profileRewards.wornImageOf(profile.name, AVATAR_FRAME_WIDTH) : null,
                playerLevel: {
                    title: TEXT.playerLevel.title,
                    number: String(playerLevel.level),
                    color: playerLevelColorOf(playerLevel.level),
                    share: (playerLevel.points - playerLevel.from) / (playerLevel.to - playerLevel.from),
                    current: TEXT.playerLevel.current(TEXT.number(playerLevel.points), TEXT.number(playerLevel.to)),
                },
                collectionTitle: TEXT.collectionTitle,
                collection: collectionTextsOf(collectionMastery),
                buttons,
                exitLook,
                // Read-only, the Exit Button is the only choice: the flippers
                // do nothing and Select does what Exit does, so Exit says it all.
                buttonHints: buttonHintGroupsOf({ flippers: isReadOnly ? null : FLIPPER_HINT.BROWSE, select: !isReadOnly, exitLook }),
                // The flippers' loop, the Exit Button first.
                choices: [CHOICE.EXIT_BUTTON, ...buttons.map(entry => entry.choice)],
            },
        };
    }

    function gameSection(plays) {
        return {
            title: TEXT.sections.game,
            rows: [[
                { label: TEXT.stats.gamesPlayed, value: TEXT.number(plays.count) },
                { label: TEXT.stats.totalTime, value: hoursAndMinutes(Math.floor(plays.seconds / SECONDS_PER_MINUTE)) },
                { label: TEXT.stats.averageDuration, value: averageOf(plays) },
            ]],
        };
    }

    function progressionSection(stats, profileName) {
        return {
            title: TEXT.sections.progression,
            rows: [
                [collectionStat(stats.collection), ...challengesStats(stats.challenges)],
                [
                    streakStat(TEXT.stats.cabinetStreak, stats.dailyStreak),
                    streakStat(TEXT.stats.dayStreak, periodTableStreakOf(tableOfTheDay, profileName)),
                    streakStat(TEXT.stats.weekStreak, periodTableStreakOf(tableOfTheWeek, profileName)),
                ],
                ...highScoresStats(stats.boards),
            ],
        };
    }

    // viewedName: another Profile's screen, read-only, by its name; null:
    // the active Profile's. onReturn: what Exit brings back (the main menu,
    // the Household Stats), called once the screen is closed or given up;
    // null: Exit leaves the bare wheel. Kept across the round trips to the
    // Achievement List, the Avatar Frame list and the Household Stats.
    // onFailed: called once an opening given up on a failing step is
    // closed. Reads and draws every layer hidden, step by step through the drawn screen's
    // shared opening, then fades them in together: it never shows up half drawn.
    function open(selectedChoice, { viewedName = null, onReturn = null, onFailed = () => {} } = {}) {
        if (controls.isShown()) return;
        const profile = viewedName ? profileNamed(viewedName) : profileStore.getActiveProfile();
        if (!profile) {
            log(`No Profile named ${viewedName} any more; back where its screen was opened from.`);
            if (onReturn) onReturn();
            return;
        }
        const drawn = prepareDrawnScreen(host, SCRIPT_NAME, {
            referenceHeight: REFERENCE_HEIGHT,
            backdropZIndex: PROFILE_STATS_Z_INDEX.backdrop,
            drawingAhead,
            profileName: profile.name,
            isReadOnly: viewedName !== null,
        });
        // Completed by setUp() once every step ran.
        const opening = { onReturn, drawn, marker: null, tooltipLayers: [], opacity: 0 };
        opening.controlled = controls.open({
            onMove: (direction, isRepeat) => move(opening, direction, isRepeat),
            onChoose: () => choose(opening),
            onExit: () => back(opening),
            close: () => remove(opening),
            setAside: () => setAside(opening),
            showAgain: () => showAgain(opening),
        }, { onFailed });
        let profileData = null;
        let screen = null;
        let highlights = null;
        const tooltipLayers = [];

        // Once the backdrop has measured the window: one step per piece,
        // then one per choice's tooltip (only the Exit Button has one: null for
        // the buttons).
        function queuePieces() {
            const layout = layoutProfileStats(host, screen, drawn.referenceWidth, exitButtonWordOf(screen.exitLook));
            highlights = layout.highlights;
            for (const piece of layout.pieces) drawn.draw(() => drawn.drawPiece(piece.zIndex, piece.rect, piece.draw));
            screen.choices.forEach((choice, index) => drawn.draw(() => {
                const { tooltip } = highlights[choice];
                tooltipLayers[index] = tooltip ? drawn.drawPiece(tooltip.zIndex, tooltip.rect, tooltip.draw) : null;
            }));
        }

        // Once every step ran: the marker on the selected choice, still hidden.
        function setUp() {
            // Here rather than on the first move, which it would slow down.
            navigationSound.load();
            const selected = Math.max(0, screen.choices.indexOf(selectedChoice));
            const targets = screen.choices.map(choice => highlights[choice].target);
            const marker = createSelectionMarker(host, { zIndex: PROFILE_STATS_Z_INDEX.marker, referenceWidth: drawn.referenceWidth, referenceHeight: REFERENCE_HEIGHT });
            marker.moveTo(targets[selected]);
            Object.assign(opening, { screen, tooltipLayers, marker, targets, choices: screen.choices, selected });
            opening.controlled.ready();
        }

        // One step per section, each reading its own values: the card, then
        // the game, the progression and the tastes.
        drawn.read(() => {
            const card = readCard(profile, viewedName !== null, onReturn !== null);
            profileData = card.profileData;
            screen = { ...card.card, sections: [] };
        });
        drawn.read(() => screen.sections.push(gameSection(sumPlays(profileData.trackedPlays))));
        drawn.read(() => screen.sections.push(progressionSection(readProgressionStats(profile.name, profileData), profile.name)));
        drawn.read(() => screen.sections.push(tastesSection(profile, profileData)));
        drawn.draw(() => drawn.drawBackdrop((dc, size, referenceWidth) => drawBackdrop(host, dc, size, referenceWidth, screen)));
        drawn.draw(queuePieces);
        // A read-only screen failing also takes away, through onFailed, the
        // Household Stats set aside under it and the screen under those.
        drawn.start({
            onReady: setUp,
            setOpacity: opacity => setOpacity(opening, opacity),
            onFailed: () => opening.controlled.fail(),
        });
    }

    // The marker and every layer to the same opacity, except the unselected
    // choices' tooltips, kept hidden.
    function setOpacity(screen, opacity) {
        screen.opacity = opacity;
        const unselected = screen.tooltipLayers.filter((layer, index) => layer && index !== screen.selected);
        for (const layer of screen.drawn.layers) {
            if (unselected.includes(layer)) {
                screen.drawn.hide(layer);
                continue;
            }
            screen.drawn.show(layer);
            layer.alpha = opacity;
        }
        screen.marker.setOpacity(opacity);
    }

    // The Drawn Screen controls' close: also gives up an opening still getting ready.
    function remove(screen) {
        if (screen.marker) screen.marker.remove();
        screen.drawn.close();
    }

    // Hidden, keeping its state, while a child screen opens over it.
    function setAside(screen) {
        screen.drawn.setAside();
        screen.marker.setAside();
    }

    // The child's Exit: shown again at once, as it was left.
    function showAgain(screen) {
        screen.marker.showAgain();
        screen.drawn.showAgain(opacity => setOpacity(screen, opacity));
    }

    // direction: 1 for Next, -1 for Prev.
    function move(screen, direction, isRepeat) {
        navigationSound.play(direction, isRepeat);
        const count = screen.choices.length;
        screen.selected = (screen.selected + direction + count) % count;
        setOpacity(screen, screen.opacity);
        screen.marker.moveTo(screen.targets[screen.selected]);
    }

    // Closes, then brings back what the screen was opened from, if anything.
    function back(screen) {
        screen.controlled.close();
        if (screen.onReturn) screen.onReturn();
    }

    // A new frame worn changes the card: the screen set aside is closed,
    // then read and drawn again, on the Frame button.
    function openAgainOnFrame(screen) {
        screen.controlled.close();
        open(CHOICE.FRAME, { onReturn: screen.onReturn });
    }

    function choose(screen) {
        const choice = screen.choices[screen.selected];
        const entry = screen.screen.buttons.find(button => button.choice === choice);
        if (choice === CHOICE.EXIT_BUTTON) return back(screen);
        // Exit from a child shows this screen again as it was left, Exit
        // here still bringing back what it was first opened from; a child
        // failing to open, even at once, takes it away.
        const { openChild } = screen.controlled;
        if (choice === CHOICE.ACHIEVEMENTS) return openChild((onExit, onFailed) => achievementList.open(onExit, { onFailed }));
        if (choice === CHOICE.HOUSEHOLD) return openChild((onExit, onFailed) => householdStats.open(onExit, { onFailed }));
        if (choice === CHOICE.FRAME) return openChild((onExit, onFailed) => frameList.open(
            isWornChanged => (isWornChanged ? openAgainOnFrame(screen) : onExit()), { onFailed }));
        screen.controlled.close();
        if (entry) host.setCurrentFilter(entry.filterId);
        return undefined;
    }

    return {
        // onReturn: what Exit brings back, such as the main menu on its entry.
        open: onReturn => open(CHOICE.EXIT_BUTTON, { onReturn }),
        // Another Profile's screen, read-only; onBack: what Exit returns to;
        // onFailed: called once its opening failed and was given up.
        openReadOnly: (profileName, onBack, onFailed) => open(CHOICE.EXIT_BUTTON, { viewedName: profileName, onReturn: onBack, onFailed }),
        readStats,
        isOpen: controls.isOpen,
        onClosed: controls.onClosed,
        // Opens the frame list straight away on that frame's row, onClosed
        // called once it closes; Select or Exit there shows this screen on the
        // Frame button, as if the list had been opened from it, with nothing
        // to bring back: its Exit leaves the bare wheel.
        openFrameList(frameId, onClosed) {
            frameList.open(() => open(CHOICE.FRAME), { selectedFrameId: frameId, onClosed });
        },
    };
}
