// ============================================================
// The slow screens' opening times, through main.js on the fake PinballY
// globals: each opening of the Profile Stats (the active Profile's and
// another Profile's, read only), the Household Stats, the Achievement
// List and the Avatar Frame list logs one line through its own script
// name, its reading and drawing timed apart (only the Household's split).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHousehold } from "./household_stats_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { openProfileStats, choose, press, isFrameListOpen, PROFILE_STATS_OPEN_MS } from "./profile_stats_reader.js";
import { openHouseholdStats, chooseColumn } from "./household_stats_reader.js";
import { isListOpen } from "../achievements/achievement_list_reader.js";

const TIMES = "in \\d+ ms: read in \\d+ ms, drawn in \\d+ ms\\.";
const ACTIVE_PROFILE_STATS = new RegExp(`^\\[ProfileStats\\] Opened Alice's ${TIMES}$`);
const READ_ONLY_PROFILE_STATS = new RegExp(`^\\[ProfileStats\\] Opened Bob's, read only, ${TIMES}$`);
// Its reading time also split by reader (household_stats_read_split.test.js).
const HOUSEHOLD_STATS = /^\[HouseholdStats\] Opened in \d+ ms: read in \d+ ms \(2 Profiles: [^)]+\), drawn in \d+ ms\.$/;
const ACHIEVEMENT_LIST = new RegExp(`^\\[AchievementList\\] Opened ${TIMES}$`);
const AVATAR_FRAME_LIST = new RegExp(`^\\[AvatarFrameList\\] Opened ${TIMES}$`);

// The opening lines logged since the mark, in order.
function openingLinesSince(fake, mark) {
    return fake.logLines().slice(mark).filter(line => line.includes("] Opened"));
}

function expectOneOpening(fake, mark, pattern) {
    const lines = openingLinesSince(fake, mark);
    assert.equal(lines.length, 1, `one opening line, got ${JSON.stringify(lines)}`);
    assert.match(lines[0], pattern);
}

test("each slow screen logs its opening, reading and drawing timed apart, in one line", async () => {
    const { fake, lang } = await startHousehold({ profiles: { Alice: {}, Bob: {} }, active: "Alice", frameImages: true });
    const TEXT = lang.profileStats;

    let mark = fake.logLines().length;
    openProfileStats(fake, lang);
    expectOneOpening(fake, mark, ACTIVE_PROFILE_STATS);

    mark = fake.logLines().length;
    choose(fake, TEXT.buttons.household);
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    expectOneOpening(fake, mark, HOUSEHOLD_STATS);

    mark = fake.logLines().length;
    chooseColumn(fake, "Bob");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    expectOneOpening(fake, mark, READ_ONLY_PROFILE_STATS);

    press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);

    mark = fake.logLines().length;
    choose(fake, TEXT.buttons.achievements);
    assert.ok(isListOpen(fake));
    expectOneOpening(fake, mark, ACHIEVEMENT_LIST);

    press(fake, "Exit");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);

    mark = fake.logLines().length;
    choose(fake, TEXT.buttons.frame);
    assert.ok(isFrameListOpen(fake));
    expectOneOpening(fake, mark, AVATAR_FRAME_LIST);
    assertNoErrorLogged(fake);
});
