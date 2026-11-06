// ============================================================
// The Household Stats' opening line, through main.js on the fake PinballY
// globals: it names how many Profiles were read and splits the reading
// time by reader, largest first, the shares adding up to the reading time.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold, PROFILES } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { openProfileStats, choose, PROFILE_STATS_OPEN_MS } from "./profile_stats_reader.js";

const SLOW_READ_MS = 400;
const OPENING_LINE = /^\[HouseholdStats\] Opened in \d+ ms: read in (\d+) ms \((\d+) Profiles: (.+)\), drawn in \d+ ms\.$/;
const SHARE = /^(.+) (\d+) ms$/;

test("the opening line splits the reading time by reader over every Profile read, the slowest first", async () => {
    const { fake, lang } = await startHousehold({
        profiles: { Alice: {}, Bob: { playLog: ["2026-09-22T20:00:00"] }, Carol: {} }, active: "Alice", frameImages: true,
        addOns: ["achievements", "challenges", "tableMastery", "highScores"],
    });
    // Bob's Play Log is what the Daily Streak reads.
    fake.slowDownReads(`${PROFILES}\\Bob\\play-log-2026.json`, SLOW_READ_MS);
    openProfileStats(fake, lang);

    const mark = fake.logLines().length;
    choose(fake, lang.profileStats.buttons.household);
    fake.advanceTime(PROFILE_STATS_OPEN_MS + SLOW_READ_MS);

    const lines = fake.logLines().slice(mark).filter(line => line.startsWith("[HouseholdStats] Opened"));
    assert.equal(lines.length, 1, `one opening line, got ${JSON.stringify(lines)}`);
    const [, readMs, profileCount, split] = lines[0].match(OPENING_LINE) || assert.fail(`unexpected line: ${lines[0]}`);
    assert.equal(Number(profileCount), 3);
    const shares = split.split(", ").map(share => {
        const [, reader, ms] = share.match(SHARE) || assert.fail(`unexpected share: ${share}`);
        return { reader, ms: Number(ms) };
    });
    assert.deepEqual(shares.map(share => share.reader).sort(), [
        "Achievements", "Challenges", "Collection Mastery", "Daily Streak", "Player Level", "boards", "other", "worn Avatar Frame",
    ]);
    assert.equal(shares[0].reader, "Daily Streak");
    assert.ok(shares[0].ms >= SLOW_READ_MS, `Daily Streak took ${shares[0].ms} ms`);
    assert.deepEqual(shares.map(share => share.ms), shares.map(share => share.ms).sort((a, b) => b - a), "largest first");
    const sum = shares.reduce((total, share) => total + share.ms, 0);
    assert.ok(Math.abs(sum - Number(readMs)) <= shares.length, `shares sum to ${sum} ms, read in ${readMs} ms`);
    assertNoErrorLogged(fake);
});
