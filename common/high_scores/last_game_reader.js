// ============================================================
// Reads vpxtool's "nvram show" answer for a ROM's .nv: the last game's
// scores, final scores, player count and game over, and decides the Play
// Score from the .nv copied at launch and the .nv after the game.
// - Without player_count (Bally 6800), game_over is unusable: final_scores decide (see #481's comment).
// ============================================================

// A { value } field's value, or null when it is absent or outside the NVRAM.
const valueOf = field => (field !== null && typeof field === "object" && field.value !== undefined && field.value !== null ? field.value : null);

// The slots' numbers, or null unless every slot has a numeric value.
function slotsOf(list) {
    if (!Array.isArray(list) || list.length === 0) return null;
    const values = list.map(valueOf);
    return values.every(value => typeof value === "number" && Number.isFinite(value)) ? values : null;
}

// { scores, finalScores, playerCount, gameOver } (null where absent or
// outside the NVRAM), or null when the .nv keeps no last-game scores.
// Throws on an answer that is not vpxtool's JSON.
export function readLastGame(output) {
    const start = output.indexOf("{");
    if (start === -1) throw new Error(`no JSON in vpxtool's answer ("${output.trim().slice(0, 80)}")`);
    let data;
    try {
        data = JSON.parse(output.slice(start));
    } catch (error) {
        throw new Error(`vpxtool's answer is not readable as JSON (${error.message})`);
    }
    const gameState = data !== null && typeof data === "object" ? data.game_state : null;
    if (gameState === null || typeof gameState !== "object") return null;
    const scores = slotsOf(gameState.scores);
    if (scores === null) return null;
    const playerCount = valueOf(gameState.player_count);
    const gameOver = valueOf(gameState.game_over);
    return {
        scores,
        finalScores: slotsOf(gameState.final_scores),
        playerCount: typeof playerCount === "number" ? playerCount : null,
        gameOver: typeof gameOver === "boolean" ? gameOver : null,
    };
}

const sameSlots = (a, b) => a !== null && b !== null && a.length === b.length && a.every((value, index) => value === b[index]);
const allZero = slots => slots.every(value => value === 0);

// The Play Score from the last games read before and after the Play:
// { score } (the best slot, whatever the player count), or { none: why }.
export function playScoreOf(before, after) {
    if (after === null || before === null) return { none: "no last-game scores in the .nv" };
    if (after.playerCount !== null) {
        if (after.gameOver === false) return { none: "the game was left unfinished" };
        // A finished game's final scores, when the map keeps them.
        const useFinal = after.gameOver === true && after.finalScores !== null;
        const slots = useFinal ? after.finalScores : after.scores;
        if (sameSlots(useFinal ? before.finalScores : before.scores, slots)) return { none: "the scores did not change, no game was played" };
        if (allZero(slots)) return { none: "every score is 0" };
        return { score: Math.max(...slots) };
    }
    const final = after.finalScores;
    if (final === null) return { none: "no player count nor final scores to tell a finished game" };
    if (sameSlots(before.finalScores, final)) return { none: "the final scores did not change, no game was played" };
    if (allZero(final)) return { none: "every score is 0" };
    if (!allZero(after.scores) && !sameSlots(after.scores, final)) return { none: "the game was left unfinished" };
    return { score: Math.max(...final) };
}
