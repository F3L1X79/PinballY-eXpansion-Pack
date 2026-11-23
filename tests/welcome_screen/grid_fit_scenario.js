// ============================================================
// The Welcome Screen as full as it gets with four cards: the Daily Streak
// and Lost Records lines, both Period Table cards, the Challenge card and
// the Household Challenge card with its helpers line, in a 2 x 2 grid; the
// footer sits inside a window of the given size, under every other piece.
// Never loaded by PinballY.
// ============================================================

import assert from "node:assert/strict";
import { startLostRecords } from "./lost_records_scenario.js";
import { footerLayout, dailyStreakLine, periodCards, cardTexts, cardImages } from "./welcome_screen_reader.js";
import { board, avatarFiles, avatarOf, MEDIEVAL, FACTORY, PROFILES_FOLDER } from "../high_scores/high_scores_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Monday 12 October 2026.
const WEEK = "2026-10-12";
const ALICE_RECORD = board(["ALI", "60000000"], ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]);
const BOB_RECORD = board(["BOB", "70000000"], ["ALI", "60000000"], ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"]);

export async function assertGridFits(size) {
    // Two days in a row up to yesterday: a Daily Streak line.
    const entry = start => ({ start, configId: MEDIEVAL, seconds: 600 });
    const scenario = await startLostRecords({
        addOns: ["highScores", "challenges", "householdChallenge"],
        profiles: {
            Alice: {
                streaks: {
                    tableOfTheDay: { current: 3, longest: 3, lastPeriod: "2026-10-11", periodsPlayed: 3 },
                    tableOfTheWeek: { current: 2, longest: 2, lastPeriod: "2026-10-05", periodsPlayed: 2 },
                },
                challenge: { firstWeek: WEEK, week: WEEK, games: [], completed: false, completedCount: 0, judgedWeek: "", history: [] },
            },
            Bob: {},
        },
        active: "Alice",
        files: {
            ...avatarFiles("Alice", "Bob"),
            [`${PROFILES_FOLDER}\\Alice\\play-log-2026.json`]: JSON.stringify({ version: 1, plays: [entry("2026-10-10T21:00:00"), entry("2026-10-11T21:00:00")] }),
            [`${PROFILES_FOLDER}\\cabinet.json`]: JSON.stringify({
                version: 1, activeProfile: "Alice",
                challenge: { current: { week: WEEK, template: "decadeTables", param: 1990, target: 2 }, previous: null },
                // Both players' Plays below move it forward.
                householdChallenge: { current: { week: WEEK, template: "activeDays", param: null, target: 5, games: [] }, previous: null },
            }),
        },
    });
    const { fake, setBoard, play, arrive, close, line } = scenario;
    setBoard(MEDIEVAL, FACTORY);
    await play(MEDIEVAL, { after: ALICE_RECORD });
    await arrive("Bob");
    await close();
    await play(MEDIEVAL, { after: BOB_RECORD });
    fake.setLayoutSize(size);
    await arrive("Alice");

    assert.ok(dailyStreakLine(fake), "the Daily Streak line shows");
    assert.ok(line(), "the Lost Records line shows");
    assert.equal(periodCards(fake).length, 4);
    const householdIndex = cardTexts(fake).findIndex(texts => texts.includes("Helped:"));
    assert.ok(householdIndex >= 0, "the Household Challenge card shows its helpers line");
    assert.deepEqual(cardImages(fake)[householdIndex], [avatarOf("Alice"), avatarOf("Bob")], "every helper's Avatar fits in its cell");
    const { footer, pieces, textsInside } = footerLayout(fake, size);
    assert.ok(footer.top >= 0 && footer.bottom <= size.height, "the footer inside the window");
    for (const piece of pieces) {
        assert.ok(piece.top >= 0 && piece.bottom <= size.height, `layer ${piece.zIndex} inside the window`);
        assert.ok(piece.bottom <= footer.top + 0.5, `layer ${piece.zIndex} above the footer`);
    }
    assert.ok(textsInside, "the footer's words inside it");
    assertNoErrorLogged(fake);
}
