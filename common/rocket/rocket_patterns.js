// ============================================================
// The Rocket's pace and asteroid patterns, pure: how fast the game goes at a
// given time of play, and the rows of asteroids each pattern throws. No side
// effects; the random source is the caller's.
// - Every row names its free lane, never further than the player can reach in time.
// - The speed has no ceiling: only the crash ends the game.
// ============================================================

export const LANES = 5;
// A flipper press and its lane change: what a fair pattern may ask between two rows.
export const MIN_PRESS_MS = 220;
// However fast the game goes, one flipper press must fit between two rows.
const MIN_ROW_MS = 250;
// fall: time to cross the window; row: time between rows; both reach their
// end values at rampMs, then go on past them.
const PACE = Object.freeze({ fallStart: 2600, fallEnd: 850, rowStart: 1050, rowEnd: 360, rampMs: 45000 });
const DART_SPEED = 1.7;
// How far a row's asteroids spread along the fall, as shares of the time between rows.
const SCATTER_SPREAD_SHARE = 0.5;
const STAIRCASE_STEP_SHARE = 0.35;

const lerp = (from, to, share) => from + (to - from) * share;

// The speed (1 / time) grows linearly with the time played.
export function paceAt(playMs) {
    const progress = playMs / PACE.rampMs;
    return {
        progress,
        fallMs: 1 / lerp(1 / PACE.fallStart, 1 / PACE.fallEnd, progress),
        rowMs: Math.max(MIN_ROW_MS, 1 / lerp(1 / PACE.rowStart, 1 / PACE.rowEnd, progress)),
    };
}

const clampLane = lane => Math.min(LANES - 1, Math.max(0, lane));

function lanesExcept(...free) {
    const lanes = [];
    for (let lane = 0; lane < LANES; lane++) if (!free.includes(lane)) lanes.push(lane);
    return lanes;
}

// A row spread along the fall takes longer to pass: one press must still fit after it.
const afterSpreadMs = (pace, spreadMs) => Math.max(pace.rowMs * 1.25, spreadMs + MIN_PRESS_MS);

// random: from 0 to 1. Each event: { lanes, freeLane, thenMs }, plus
// swayLanes, speed, aimed (one asteroid at the ship's lane), trailsMs or jitter.
export function createPatterns(random) {
    const randomInt = (low, high) => low + Math.floor(random() * (high - low + 1));

    // The next free lane, never further than the player can reach in spacingMs.
    function moveFreeLane(state, spacingMs) {
        const reach = Math.max(1, Math.floor(spacingMs / MIN_PRESS_MS));
        state.safeLane = clampLane(state.safeLane + randomInt(-reach, reach));
        return state.safeLane;
    }

    function scatter(state, pace) {
        const low = pace.progress < 0.25 ? 1 : pace.progress < 0.6 ? 2 : 3;
        const high = pace.progress < 0.25 ? 2 : pace.progress < 0.6 ? 3 : 4;
        const free = moveFreeLane(state, pace.rowMs);
        const others = lanesExcept(free, state.lane);
        for (let index = others.length - 1; index > 0; index--) {
            const swap = randomInt(0, index);
            [others[index], others[swap]] = [others[swap], others[index]];
        }
        // Often aimed at the ship, so that staying in a lane is no plan.
        const lanes = (state.lane !== free && random() < 0.6 ? [state.lane, ...others] : others).slice(0, randomInt(low, high));
        const spreadMs = pace.rowMs * SCATTER_SPREAD_SHARE;
        return [{ lanes, freeLane: free, trailsMs: lanes.map(() => random() * spreadMs), jitter: true, thenMs: afterSpreadMs(pace, spreadMs) }];
    }

    // A staircase across the lanes on one side of the free lane.
    function staircase(state, pace) {
        const free = moveFreeLane(state, pace.rowMs);
        const left = lanesExcept(free).filter(lane => lane < free);
        const right = lanesExcept(free).filter(lane => lane > free);
        const side = left.length > right.length ? left : right.length > left.length ? right : random() < 0.5 ? left : right;
        const lanes = (random() < 0.5 ? side : [...side].reverse()).slice(0, 3);
        const stepMs = pace.rowMs * STAIRCASE_STEP_SHARE;
        return [{ lanes, freeLane: free, trailsMs: lanes.map((lane, index) => index * stepMs), jitter: true, thenMs: afterSpreadMs(pace, (lanes.length - 1) * stepMs) }];
    }

    function wall(state, pace) {
        const free = moveFreeLane(state, pace.rowMs);
        return [{ lanes: lanesExcept(free), freeLane: free, thenMs: pace.rowMs * 1.3 }];
    }

    // Closes in from both edges towards the middle, or pushes out from the middle.
    function funnel(state, pace) {
        const spacing = Math.max(pace.rowMs * 1.2, MIN_PRESS_MS * 2);
        if (random() < 0.5) {
            state.safeLane = 2;
            return [{ lanes: [0, 4], freeLane: 2, thenMs: spacing }, { lanes: [0, 1, 3, 4], freeLane: 2, thenMs: pace.rowMs * 1.3 }];
        }
        state.safeLane = state.safeLane < 2 ? 0 : state.safeLane > 2 ? 4 : randomInt(0, 1) * 4;
        const free = state.safeLane;
        return [{ lanes: [2], freeLane: free, thenMs: spacing }, { lanes: [1, 2, 3], freeLane: free, thenMs: pace.rowMs * 1.3 }];
    }

    // Walls whose one gap runs across the lanes, bouncing off the edges.
    function slalom(state, pace) {
        const spacing = Math.max(pace.rowMs * 0.8, MIN_PRESS_MS * 1.1);
        const rows = randomInt(4, 6);
        let gap = moveFreeLane(state, pace.rowMs);
        let direction = gap < 2 ? 1 : gap > 2 ? -1 : randomInt(0, 1) * 2 - 1;
        const events = [];
        for (let row = 0; row < rows; row++) {
            events.push({ lanes: lanesExcept(gap), freeLane: gap, thenMs: row === rows - 1 ? pace.rowMs * 1.2 : spacing });
            if (row < rows - 1) {
                if (gap + direction < 0 || gap + direction >= LANES) direction = -direction;
                gap += direction;
            }
        }
        state.safeLane = gap;
        return events;
    }

    // Asteroids swinging sideways: lanes 0, 2 and 4 stay free of the pair's
    // reach, the edges free of the wide swing's.
    function weavers(state, pace) {
        const spacing = pace.rowMs * 1.2;
        if (random() < 0.5) {
            state.safeLane = Math.min(4, Math.round(state.safeLane / 2) * 2);
            const rows = randomInt(2, 3);
            const events = [];
            for (let row = 0; row < rows; row++) events.push({ lanes: [1, 3], freeLane: state.safeLane, swayLanes: 0.4, thenMs: spacing });
            return events;
        }
        state.safeLane = state.safeLane <= 2 ? 0 : 4;
        const free = state.safeLane;
        return [{ lanes: [2], freeLane: free, swayLanes: 1, thenMs: spacing }, { lanes: [2], freeLane: free, swayLanes: 1, thenMs: spacing }];
    }

    // Fast asteroids thrown at the ship; the wait lets the rows ahead get past first.
    function darts(state, pace) {
        const events = [{ lanes: [], freeLane: state.safeLane, thenMs: pace.fallMs * 0.6 }];
        const count = randomInt(1, 3);
        for (let dart = 0; dart < count; dart++) {
            events.push({ aimed: true, speed: DART_SPEED, thenMs: dart === count - 1 ? pace.rowMs : Math.max(pace.rowMs * 0.55, MIN_PRESS_MS * 1.2) });
        }
        return events;
    }

    // Each unlocks at this share of the ramp, so the game gets stranger as it goes.
    // The weights keep the full-width walls rare; the scattered shapes may follow themselves.
    const PATTERNS = [
        { name: "scatter", from: 0, weight: 6, repeats: true, build: scatter },
        { name: "staircase", from: 0.08, weight: 4, repeats: true, build: staircase },
        { name: "wall", from: 0.12, weight: 1, build: wall },
        { name: "funnel", from: 0.25, weight: 2, build: funnel },
        { name: "slalom", from: 0.35, weight: 1, build: slalom },
        { name: "weavers", from: 0.5, weight: 2, build: weavers },
        { name: "darts", from: 0.65, weight: 2, build: darts },
    ];

    return {
        // state: { lane (the ship's), safeLane, lastPattern }, updated; returns the pattern's events.
        next(state, pace) {
            const choices = PATTERNS.filter(pattern => pattern.from <= pace.progress && (pattern.repeats || pattern !== state.lastPattern));
            let draw = random() * choices.reduce((sum, pattern) => sum + pattern.weight, 0);
            const pattern = choices.find(choice => (draw -= choice.weight) < 0) || choices[choices.length - 1];
            state.lastPattern = pattern;
            return pattern.build(state, pace);
        },
    };
}
