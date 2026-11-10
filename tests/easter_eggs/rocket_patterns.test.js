// ============================================================
// The Rocket's pace and asteroid patterns, pure: a free lane always remains,
// patterns unlock as the game speeds up, the speed has no ceiling and rows
// never come closer than one press.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { LANES, paceAt, createPatterns } from "../../common/easter_eggs/rocket_patterns.js";

const RAMP_MS = 45000;

// The same draws on every run.
function seeded(seed) {
    let state = seed;
    return () => {
        state = (Math.imul(state, 1597334677) + 12345) >>> 0;
        return state / 2 ** 32;
    };
}

// Every event of count patterns, at progress growing from 0 to 1.6.
function drawEvents(seed, count) {
    const random = seeded(seed);
    const patterns = createPatterns(random);
    const state = { lane: 2, safeLane: 2, lastPattern: null };
    const drawn = [];
    for (let index = 0; index < count; index++) {
        const playMs = index / count * RAMP_MS * 1.6;
        state.lane = Math.floor(random() * LANES);
        const events = patterns.next(state, paceAt(playMs));
        drawn.push({ playMs, name: state.lastPattern.name, events });
    }
    return drawn;
}

test("every row leaves its free lane clear, out of reach of a swaying asteroid", () => {
    for (const seed of [1, 7, 42]) {
        for (const { name, events } of drawEvents(seed, 3000)) {
            for (const event of events) {
                if (event.aimed) continue;
                assert.ok(event.lanes.length < LANES, `${name}: never a full row`);
                assert.ok(Number.isInteger(event.freeLane) && event.freeLane >= 0 && event.freeLane < LANES, `${name}: a free lane`);
                for (const lane of event.lanes) {
                    const gap = Math.abs(lane - event.freeLane) - (event.swayLanes || 0);
                    assert.ok(gap >= 0.5, `${name}: lane ${lane} reaches the free lane ${event.freeLane}`);
                }
            }
        }
    }
});

test("patterns unlock as the game speeds up, and only scatter and staircase follow themselves", () => {
    const drawn = drawEvents(3, 4000);
    const firstAt = name => drawn.find(pattern => pattern.name === name).playMs / RAMP_MS;
    assert.deepEqual([...new Set(drawn.filter(pattern => pattern.playMs < 0.08 * RAMP_MS).map(pattern => pattern.name))], ["scatter"]);
    for (const [name, from] of [["staircase", 0.08], ["wall", 0.12], ["funnel", 0.25], ["slalom", 0.35], ["weavers", 0.5], ["darts", 0.65]]) {
        assert.ok(firstAt(name) >= from, `${name} not before ${from}`);
    }
    for (let index = 1; index < drawn.length; index++) {
        const { name } = drawn[index];
        if (name !== "scatter" && name !== "staircase") assert.notEqual(drawn[index - 1].name, name, `${name} never twice in a row`);
    }
});

test("the speed grows with no ceiling, and rows never come closer than 250 ms", () => {
    assert.equal(Math.round(paceAt(0).fallMs), 2600);
    assert.equal(Math.round(paceAt(0).rowMs), 1050);
    assert.equal(Math.round(paceAt(RAMP_MS).fallMs), 850);
    assert.equal(Math.round(paceAt(RAMP_MS).rowMs), 360);
    const later = [90000, 180000, 360000].map(paceAt);
    assert.ok(later[0].fallMs > later[1].fallMs && later[1].fallMs > later[2].fallMs, "still faster");
    assert.ok(later.every(pace => pace.rowMs === 250), "one press between two rows");
});
