// ============================================================
// Household Stats: the drawn screen opened from the Profile Stats that sets
// every Profile but Guest side by side, one column each, the best value of
// each line in gold. Select on a column opens that Profile's Stats
// read-only. Exit calls the return given to open().
// Opens directly, not through the wheel dialog module: the player asked for it.
// - Read again on each opening, one Profile per step (docs/adr/0014).
// - Its buttons and attract mode go through the Drawn Screen controls.
// - Past five columns, they glide sideways to keep the marker in view.
// - isOpen() and onClosed() let the wheel dialogs wait for it.
// ============================================================

import lang from "../core/i18n.js";
import { displayNameOf } from "../profiles/profile_name.js";
import { safeHandler } from "../core/safe_handler.js";
import { createNavigationSound } from "../core/navigation_sound.js";
import { prepareDrawnScreen, FRAME_MS } from "./drawn_screen.js";
import { MAX_MASTERY_LEVEL } from "../mastery/table_mastery.js";
import { drawBackdrop, drawExitButton, exitTooltipRectOf, drawExitTooltip, drawButtonHintsBand } from "../drawing/steamball_drawing.js";
import { exitButtonLookOf, exitButtonWordOf, buttonHintGroupsOf, FLIPPER_HINT } from "../drawing/button_hints.js";
import { EXIT_BUTTON, stepThroughExitButton } from "../drawing/exit_button_loop.js";
import { createSelectionMarker } from "../drawing/selection_marker.js";
import {
    HOUSEHOLD_STATS_Z_INDEX, REFERENCE_HEIGHT, AVATAR_FRAME_WIDTH, layoutHouseholdStats, drawTitle, drawLabels, drawColumn,
} from "./household_stats_painter.js";

const SCRIPT_NAME = "HouseholdStats";
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
// The sideways glide slows down as it arrives (exponential ease-out), as
// the Achievement List's does.
const GLIDE_TIME_CONSTANT_MS = 40;
const GLIDE_SNAP_PX = 0.5;

// readStats(profileName, timeReader): the Profile Stats' values for that
// Profile (common/stats/profile_stats.js), each reader run through
// timeReader(reader, read); openProfileStats(profileName, onBack, onFailed):
// opens that Profile's Profile Stats, read-only, onBack called on its Exit,
// onFailed once their opening failed and was given up;
// profileRewards: the worn Avatar Frames (null: none);
// hasCollectionMastery: false without the Table Mastery Add-on, which
// takes the Collection Mastery line away; drawingAhead: the shared drawing
// ahead (common/core/drawing_ahead.js), which runs the opening;
// drawnScreenControls: the shared Drawn Screen controls (common/core/drawn_screen_controls.js).
export function createHouseholdStats(host, {
    profileStore, readStats, openProfileStats, drawingAhead, drawnScreenControls, profileRewards = null, hasCollectionMastery = true,
}) {
    const { profileStats: TEXT } = lang;
    const navigationSound = createNavigationSound(host, SCRIPT_NAME);
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);
    const controls = drawnScreenControls.register(SCRIPT_NAME);

    // Every Profile but Guest, in the Profile picker's order, from either
    // of the store's lists: Guest always comes first in both.
    const householdOf = profiles => profiles.slice(1);

    const totalMinutesOf = seconds => Math.floor(seconds / SECONDS_PER_MINUTE);
    const hoursAndMinutes = totalMinutes =>
        TEXT.hoursAndMinutes(Math.floor(totalMinutes / MINUTES_PER_HOUR), totalMinutes % MINUTES_PER_HOUR);

    // The Collection Tier's progress, or the last tier's name once reached.
    function collectionValue({ tier, reached, needed }) {
        return tier >= MAX_MASTERY_LEVEL ? lang.tableMastery.levelNames[tier - 1] : TEXT.fraction(reached, needed);
    }

    // Each line top down: its label, whether it shows, and for one
    // Profile's stats its cell (value and Collection Tier) and its score,
    // compared element by element, all zeros meaning nothing yet.
    const LINES = [
        { label: TEXT.household.lines.playerLevel, isShown: () => true,
            cellOf: ({ playerLevel }) => ({ value: TEXT.number(playerLevel.level) }),
            // A level is never 0, but its points are before any Unlock.
            scoreOf: ({ playerLevel }) => (playerLevel.points === 0 ? [0] : [playerLevel.level, playerLevel.points]) },
        { label: TEXT.household.lines.collectionMastery, isShown: () => hasCollectionMastery,
            cellOf: ({ collectionMastery }) => ({ value: collectionValue(collectionMastery), tier: collectionMastery.tier }),
            scoreOf: ({ collectionMastery }) => [collectionMastery.tier, collectionMastery.reached] },
        { label: TEXT.household.lines.achievementsUnlocked, isShown: () => true,
            cellOf: ({ achievements }) => ({ value: TEXT.fraction(achievements.unlocked, achievements.total) }),
            scoreOf: ({ achievements }) => [achievements.unlocked] },
        { label: TEXT.stats.gamesPlayed, isShown: () => true,
            cellOf: ({ plays }) => ({ value: TEXT.number(plays.count) }),
            scoreOf: ({ plays }) => [plays.count] },
        // Compared on the minutes shown, so two equal times are both gold.
        { label: TEXT.stats.totalTime, isShown: () => true,
            cellOf: ({ plays }) => ({ value: hoursAndMinutes(totalMinutesOf(plays.seconds)) }),
            scoreOf: ({ plays }) => [totalMinutesOf(plays.seconds)] },
        { label: TEXT.household.lines.dailyStreak, isShown: () => true,
            cellOf: ({ dailyStreak }) => ({ value: TEXT.number(dailyStreak.current) }),
            scoreOf: ({ dailyStreak }) => [dailyStreak.current] },
        // Null without the Challenges Add-on.
        { label: TEXT.stats.challengesCompleted, isShown: stats => stats.challenges !== null,
            cellOf: ({ challenges }) => ({ value: TEXT.fraction(challenges.completed, challenges.total) }),
            scoreOf: ({ challenges }) => [challenges.completed] },
        // Null without the High Scores Add-on.
        { label: TEXT.stats.tableRecordsHeld, isShown: stats => stats.boards !== null,
            cellOf: ({ boards }) => ({ value: TEXT.number(boards.tableRecords) }),
            scoreOf: ({ boards }) => [boards.tableRecords] },
    ];

    // Positive when a is the better score.
    function compareScores(a, b) {
        for (let index = 0; index < Math.max(a.length, b.length); index++) {
            const difference = (a[index] || 0) - (b[index] || 0);
            if (difference !== 0) return difference;
        }
        return 0;
    }

    // The Profile's Avatar; null, logged, when its image is missing.
    function avatarOf(profile) {
        if (host.files.isImageReadable(profile.avatarPath)) return profile.avatarPath;
        log(`${profile.avatarPath} is missing or unreadable; ${profile.name}'s column shows without an Avatar.`);
        return null;
    }

    // The Household's Profiles, the active one first, then the Profile picker's order.
    function readProfiles() {
        const active = profileStore.getActiveProfile();
        const household = householdOf(profileStore.listProfiles());
        const isActive = profile => profile.name.toLowerCase() === active.name.toLowerCase();
        return [...household.filter(isActive), ...household.filter(profile => !isActive(profile))]
            .map(profile => ({ profile, isActive: isActive(profile) }));
    }

    // entries: readProfiles()'s; allStats and framePaths: each one's stats
    // and worn frame image, in the same order; exitLook: the Exit Button's.
    function describeScreen(entries, allStats, framePaths, exitLook) {
        const lines = LINES.filter(line => allStats.every(stats => line.isShown(stats)));
        const goldByLine = lines.map(line => {
            const scores = allStats.map(line.scoreOf);
            const best = scores.reduce((top, score) => (compareScores(score, top) > 0 ? score : top));
            const isNothing = best.every(value => value === 0);
            return scores.map(score => !isNothing && compareScores(score, best) === 0);
        });
        return {
            title: TEXT.household.title,
            exitLook,
            buttonHints: buttonHintGroupsOf({ flippers: FLIPPER_HINT.BROWSE, select: true, exitLook }),
            labels: lines.map(line => line.label),
            columns: entries.map(({ profile, isActive }, column) => ({
                profileName: profile.name,
                isActive,
                name: displayNameOf(profile),
                avatarPath: avatarOf(profile),
                framePath: framePaths[column],
                cells: lines.map((line, index) => ({ ...line.cellOf(allStats[column]), isGold: goldByLine[index][column] })),
            })),
        };
    }

    // onBack: what Exit returns to, called once the screen is closed (or
    // given up; null: the bare wheel, the Exit Button then a cross);
    // onFailed: called once an opening given up on a failing step is
    // closed, or once another Profile's Profile Stats failed to open over
    // this screen. Reads and draws every layer hidden, step by step, then
    // fades them in together: it never shows up half drawn.
    function open(onBack = null, { onFailed = () => {} } = {}) {
        if (controls.isShown()) return;
        // The opening line's reading time by reader, summed over every Profile
        // read, to tell which readers are worth keeping or reading ahead.
        const msByReader = {};
        let profileCount = 0;
        function timeReader(reader, read) {
            const startMs = host.now().getTime();
            const result = read();
            msByReader[reader] = (msByReader[reader] || 0) + host.now().getTime() - startMs;
            return result;
        }
        const drawn = prepareDrawnScreen(host, SCRIPT_NAME, {
            referenceHeight: REFERENCE_HEIGHT, backdropZIndex: HOUSEHOLD_STATS_Z_INDEX.backdrop, drawingAhead,
            readSplit: () => ({ profileCount, msByReader }),
        });
        // Apart from the other layers: their alpha also fades them at the view's edges.
        const columnLayers = [];
        // Completed by setUp() once every step ran.
        const opening = { onBack, drawn, columnLayers, marker: null, glideTimer: null, glideMs: 0, opacity: 0 };
        opening.controlled = controls.open({
            onMove: direction => move(opening, direction),
            onChoose: () => choose(opening),
            onExit: () => back(opening),
            close: () => remove(opening),
            setAside: () => setAside(opening),
            showAgain: () => showAgain(opening),
        }, { onFailed });
        let screen = null;
        let geometry = null;
        let exitTooltip = null;
        // A step drawing one piece; rect() is read then, once the backdrop
        // has measured the window.
        const drawPiece = (zIndex, rect, draw, into) => drawn.draw(() => drawn.drawPiece(zIndex, rect(), draw, into));

        // Queued once the Profiles are known: one step per Profile read, its
        // stats and worn frame sharing one read of its profile.json.
        function queueSteps(entries) {
            const allStats = [];
            const framePaths = [];
            profileCount = entries.length;
            for (const { profile } of entries) {
                drawn.read(() => profileStore.withCachedReads(() => {
                    allStats.push(readStats(profile.name, timeReader));
                    framePaths.push(profileRewards
                        ? timeReader("worn Avatar Frame", () => profileRewards.wornImageOf(profile.name, AVATAR_FRAME_WIDTH)) : null);
                }));
            }
            drawn.read(() => { screen = describeScreen(entries, allStats, framePaths, exitButtonLookOf(onBack !== null)); });
            drawn.draw(() => drawn.drawBackdrop((dc, size, referenceWidth) => {
                geometry = layoutHouseholdStats(referenceWidth, screen.columns.length, screen.labels.length);
                drawBackdrop(dc, size, REFERENCE_HEIGHT, geometry.panel);
            }));
            drawPiece(HOUSEHOLD_STATS_Z_INDEX.title, () => geometry.title, dc => drawTitle(host, dc, screen.title, geometry.title.w, geometry.title.h));
            drawPiece(HOUSEHOLD_STATS_Z_INDEX.exitButton, () => geometry.exitButton, dc => drawExitButton(dc, screen.exitLook));
            drawPiece(HOUSEHOLD_STATS_Z_INDEX.buttonHints, () => geometry.buttonHints,
                dc => drawButtonHintsBand(host, dc, screen.buttonHints, { width: geometry.buttonHints.w, height: geometry.buttonHints.h }));
            drawPiece(HOUSEHOLD_STATS_Z_INDEX.labels, () => geometry.labels, dc => drawLabels(host, dc, screen.labels, geometry.labels.w));
            entries.forEach((entry, index) => drawPiece(HOUSEHOLD_STATS_Z_INDEX.columns, () => geometry.columns[index],
                dc => drawColumn(host, dc, screen.columns[index], geometry.columns[index].w), columnLayers));
            drawn.draw(() => {
                exitTooltip = drawn.drawPiece(HOUSEHOLD_STATS_Z_INDEX.tooltip, exitTooltipRectOf(geometry.exitButton), dc => drawExitTooltip(host, dc, exitButtonWordOf(screen.exitLook)));
            });
        }

        // Once every step ran: the marker and the columns in place, still hidden.
        function setUp() {
            const marker = createSelectionMarker(host, { zIndex: HOUSEHOLD_STATS_Z_INDEX.marker, referenceWidth: drawn.referenceWidth, referenceHeight: REFERENCE_HEIGHT });
            // Here rather than on the first move, which it would slow down.
            navigationSound.load();
            // first: the first column in view once the glide is over; scroll:
            // how far the columns have glided, in reference pixels.
            Object.assign(opening, {
                columns: screen.columns, exitTooltip, marker, marked: null, geometry, selected: 0, first: 0, scroll: 0,
            });
            placeColumns(opening);
            opening.controlled.ready();
        }

        drawn.read(() => queueSteps(readProfiles()));
        drawn.start({
            onReady: setUp,
            setOpacity: opacity => setOpacity(opening, opacity),
            onFailed: () => opening.controlled.fail(),
        });
    }

    // Where the columns glide to: the first one in view at the view's left.
    const targetScroll = screen => screen.first * screen.geometry.pitch;

    // A column's alpha by how much of it the view cuts off: gone once half
    // of it is cut, so a column leaving never shows much over the labels
    // or past the panel, which nothing masks.
    function edgeAlpha({ view }, x, w) {
        const share = (Math.min(x + w, view.x + view.w) - Math.max(x, view.x)) / w;
        return Math.max(0, Math.min(1, 2 * share - 1));
    }

    // Each column at the glide's scroll, faded at the view's edges; the
    // marker on the selected column, held inside the view while that column
    // glides into it, or on the Exit Button with its tooltip.
    function placeColumns(screen) {
        const { geometry, drawn } = screen;
        const { view } = geometry;
        screen.columnLayers.forEach((layer, index) => {
            const rect = geometry.columns[index];
            const x = rect.x - screen.scroll;
            drawn.place(layer, { ...rect, x });
            const alpha = edgeAlpha(geometry, x, rect.w);
            if (alpha === 0) {
                drawn.hide(layer);
                return;
            }
            drawn.show(layer);
            layer.alpha = screen.opacity * alpha;
        });
        const isOnExitButton = screen.selected === EXIT_BUTTON;
        if (isOnExitButton) {
            drawn.show(screen.exitTooltip);
            screen.exitTooltip.alpha = screen.opacity;
        } else drawn.hide(screen.exitTooltip);
        let marked = geometry.exitButton;
        if (!isOnExitButton) {
            const selected = geometry.columns[screen.selected];
            const x = Math.max(view.x, Math.min(view.x + view.w - selected.w, selected.x - screen.scroll));
            marked = { ...selected, x };
        }
        // Only when it moved: a fade frame changes no more than the alpha,
        // and the marker's own tick redraws it anyway.
        const isMoved = !screen.marked || ["x", "y", "w", "h"].some(key => marked[key] !== screen.marked[key]);
        if (isMoved) screen.marker.moveTo(marked);
        screen.marked = marked;
    }

    function setOpacity(screen, opacity) {
        screen.opacity = opacity;
        for (const layer of screen.drawn.layers) layer.alpha = opacity;
        screen.marker.setOpacity(opacity);
        placeColumns(screen);
    }

    function stopGlide(screen) {
        host.clearInterval(screen.glideTimer);
        screen.glideTimer = null;
    }

    // Runs every frame while the columns glide; timed on the clock, since
    // Windows timers fire late.
    function glideStep(screen) {
        const nowMs = host.now().getTime();
        const target = targetScroll(screen);
        screen.scroll = target + (screen.scroll - target) * Math.exp(-(nowMs - screen.glideMs) / GLIDE_TIME_CONSTANT_MS);
        screen.glideMs = nowMs;
        if (Math.abs(screen.scroll - target) < GLIDE_SNAP_PX) {
            screen.scroll = target;
            stopGlide(screen);
        }
        placeColumns(screen);
    }

    // The Drawn Screen controls' close: also gives up an opening still getting ready.
    function remove(screen) {
        stopGlide(screen);
        if (screen.marker) screen.marker.remove();
        screen.drawn.close(screen.columnLayers);
    }

    // Hidden, keeping its state, while another Profile's Profile Stats open
    // over it. The glide ends at once, so the columns come back still.
    function setAside(screen) {
        stopGlide(screen);
        screen.scroll = targetScroll(screen);
        screen.drawn.setAside(screen.columnLayers);
        screen.marker.setAside();
    }

    // Exit on those Profile Stats: shown again at once, as it was left.
    function showAgain(screen) {
        screen.marker.showAgain();
        screen.drawn.showAgain(opacity => setOpacity(screen, opacity));
    }

    // direction: 1 for Next, -1 for Prev, through the Exit Button then each
    // column. Brings the selected column into view, gliding unless it comes
    // from the Exit Button: the columns then stay where they were.
    function move(screen, direction) {
        navigationSound.play();
        const { columns, view } = screen.geometry;
        const previous = screen.selected;
        screen.selected = stepThroughExitButton(previous, direction, columns.length);
        if (screen.selected === EXIT_BUTTON) return placeColumns(screen);
        screen.first = Math.min(screen.selected, Math.max(screen.first, screen.selected - view.count + 1));
        if (previous === EXIT_BUTTON) {
            stopGlide(screen);
            screen.scroll = targetScroll(screen);
        } else if (screen.glideTimer === null && screen.scroll !== targetScroll(screen)) {
            screen.glideMs = host.now().getTime();
            screen.glideTimer = host.setInterval(safeHandler(SCRIPT_NAME, () => glideStep(screen)), FRAME_MS);
        }
        placeColumns(screen);
    }

    function back(screen) {
        screen.controlled.close();
        if (screen.onBack) screen.onBack();
    }

    // Another Profile's column opens its Profile Stats over this screen,
    // set aside, whose Exit shows it again on that column; their failing
    // to open takes this screen away too, then what it was opened over.
    // One's own column and the Exit Button go back as Exit does.
    function choose(screen) {
        const { columns, selected } = screen;
        if (selected === EXIT_BUTTON) return back(screen);
        const column = columns[selected];
        if (column.isActive) return back(screen);
        return screen.controlled.openChild((onExit, onFailed) => openProfileStats(column.profileName, onExit, onFailed));
    }

    return {
        open,
        // How many Profiles the screen sets side by side; offered from two.
        // By name only: listing the Profiles also checks their Avatars.
        countProfiles: () => householdOf(profileStore.listProfileNames()).length,
        isOpen: controls.isOpen,
        onClosed: controls.onClosed,
    };
}
