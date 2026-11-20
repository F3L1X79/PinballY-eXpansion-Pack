// ============================================================
// Utilities for animating PinballY's game wheel to a target index by
// simulating "Next" / "NextPage" button presses, with a "wheel of
// fortune" timing curve (fast start, slow finish).
// ============================================================

const ACCELERATION_DELAYS_MS = [200, 150, 100, 50];
const DECELERATION_DELAYS_MS = [100, 200, 350, 500, 750, 1000];
const SHORT_NAVIGATION_THRESHOLD = 20;

/** Resolves after `ms` milliseconds. */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

/**
 * Computes the delay (ms) before the next button press, following a
 * "wheel of fortune" style curve: fast at first, then decelerating toward
 * the end, scaled from `delayOptions.baseSpeedMs`.
 *
 * @param {number} stepIndex 1-based index of the step about to run.
 * @param {number} totalSteps Total number of steps in the animation.
 * @param {{baseSpeedMs?: number}} [delayOptions]
 * @returns {number} Delay in milliseconds.
 */
export function computeStepDelay(stepIndex, totalSteps, delayOptions = {}) {
    const baseSpeedMs = Math.max(0, Number(delayOptions.baseSpeedMs ?? 200) || 0);
    const safeStepIndex = Math.max(1, Number(stepIndex) || 1);
    const safeTotalSteps = Math.max(safeStepIndex, Number(totalSteps) || safeStepIndex);

    if (safeStepIndex <= ACCELERATION_DELAYS_MS.length) {
        return baseSpeedMs + ACCELERATION_DELAYS_MS[safeStepIndex - 1];
    }

    const stepsRemaining = safeTotalSteps - safeStepIndex;
    if (stepsRemaining === 0) {
        return baseSpeedMs
            + DECELERATION_DELAYS_MS[DECELERATION_DELAYS_MS.length - 1]
            + Math.floor(Math.random() * 700);
    }

    if (stepsRemaining < DECELERATION_DELAYS_MS.length) {
        return baseSpeedMs + DECELERATION_DELAYS_MS[DECELERATION_DELAYS_MS.length - 1 - stepsRemaining];
    }

    return baseSpeedMs;
}

/**
 * Presses a button repeatedly, waiting between presses according to
 * `computeStepDelay` so the whole animation follows one timing curve.
 *
 * @returns {Promise<void>} Resolves once every press (and its delay) is done.
 */
export async function pressButtonRepeatedly(
    buttonName,
    times,
    stepOffset,
    totalSteps,
    delayOptions
) {
    const safeTimes = Math.max(0, Math.floor(Number(times) || 0));
    const safeStepOffset = Math.max(0, Math.floor(Number(stepOffset) || 0));

    for (let i = 0; i < safeTimes; i++) {
        mainWindow.doButtonCommand(buttonName, true, 0);
        mainWindow.doButtonCommand(buttonName, false, 0);

        await sleep(computeStepDelay(
            safeStepOffset + i + 1,
            totalSteps,
            delayOptions
        ));
    }
}

// PinballY's default page group (FilterInfo.html): the title's first letter.
export const firstLetterOfTitle = game => String((game && game.title) ?? "").charAt(0);

// Splits a move of targetIndex tables into NextPage jumps, one per page
// group crossed, and Next presses for the rest (Next only up to 20 tables).
// pageGroupOf must be the wheel's own: NextPage turns until a table of
// another group (FilterInfo.html), so any other grouping misses the target.
export function computeNavigationPlan(targetIndex, games, pageGroupOf = firstLetterOfTitle) {
    const safeTargetIndex = Math.max(0, Math.floor(Number(targetIndex) || 0));
    if (safeTargetIndex <= SHORT_NAVIGATION_THRESHOLD) {
        return { pageJumpCount: 0, itemJumpCount: safeTargetIndex };
    }

    if (!Array.isArray(games) || games.length === 0) {
        return { pageJumpCount: 0, itemJumpCount: safeTargetIndex };
    }

    const cappedTargetIndex = Math.min(safeTargetIndex, games.length - 1);
    const groupChangeIndexes = [];
    let previousGroup = pageGroupOf(games[0]);

    for (let i = 0; i < cappedTargetIndex; i++) {
        const group = pageGroupOf(games[i]);
        if (group !== previousGroup) {
            previousGroup = group;
            groupChangeIndexes.push(i);
        }
    }

    let pageJumpCount = 0;
    let lastPageJumpIndex = cappedTargetIndex;

    for (const groupChangeIndex of groupChangeIndexes) {
        pageJumpCount++;
        const remaining = cappedTargetIndex - groupChangeIndex;

        if (remaining < SHORT_NAVIGATION_THRESHOLD) {
            if (remaining <= 0) pageJumpCount--;
            else lastPageJumpIndex = groupChangeIndex;
            break;
        }

        lastPageJumpIndex = groupChangeIndex;
    }

    return {
        pageJumpCount,
        itemJumpCount: cappedTargetIndex - lastPageJumpIndex,
    };
}

// Animates the wheel from its current position (index 0 of `games`, as
// returned by gameList.getAllWheelGames()) to exactly `targetIndex`.
// Options: baseSpeedMs (timing curve), usePageJumpOptimization (NextPage
// jumps for long distances), pageGroupOf (the wheel's page group).
export async function animateWheelTo(games, targetIndex, options = {}) {
    const safeGames = Array.isArray(games) ? games : [];
    if (safeGames.length === 0) return;

    const maxIndex = safeGames.length - 1;
    const safeTargetIndex = Math.max(0, Math.min(
        maxIndex,
        Math.floor(Number(targetIndex) || 0)
    ));

    if (safeTargetIndex === 0) return;

    const usePageJumpOptimization = options.usePageJumpOptimization ?? false;
    const delayOptions = { baseSpeedMs: options.baseSpeedMs };

    let pageJumpCount = 0;
    let itemJumpCount = safeTargetIndex;

    if (usePageJumpOptimization) {
        const plan = computeNavigationPlan(safeTargetIndex, safeGames, options.pageGroupOf);
        pageJumpCount = plan.pageJumpCount;
        itemJumpCount = plan.itemJumpCount;
    }

    const totalSteps = pageJumpCount + itemJumpCount;

    if (pageJumpCount > 0) {
        await pressButtonRepeatedly(
            "NextPage",
            pageJumpCount,
            0,
            totalSteps,
            delayOptions
        );
    }

    await pressButtonRepeatedly(
        "Next",
        itemJumpCount,
        pageJumpCount,
        totalSteps,
        delayOptions
    );
}
