// ============================================================
// The High Score Board's Household Board, through main.js on the fake
// PinballY globals: one place per Household Profile, its best High Score
// on the table, a High Score pushed off the table's board included; Guest
// and the Default Scores left out, a Child Profile in; equal scores the
// older first; each place with its Avatar, worn frame, score and date.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, avatarOf, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, showView, viewPlaces, frames, message } from "./high_score_board_reader.js";
import { AVATAR_FRAME_IMAGES } from "../mastery/mastery_bar_scenario.js";

const DAY_MS = 24 * 60 * 60 * 1000;

test("the Household Board ranks each Household Profile's best High Score on the table", async () => {
    const { fake, setBoard, play, switchTo } = await startHighScores({
        addOns: ["highScores", "tableMastery"],
        profiles: { Alice: {}, Bob: { collectionTier: 4, avatarFrame: 4 }, Dave: {}, Kid: { isChild: true } },
        active: "Dave",
        files: { ...avatarFiles("Alice", "Bob", "Dave", "Kid", "guest"), ...Object.fromEntries(AVATAR_FRAME_IMAGES.map(file => [file, "png"])) },
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    setBoard(MEDIEVAL, FACTORY);
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["DAV", "41000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]) });
    switchTo("Alice");
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["DAV", "41000000"], ["BRE", "40000000"], ["LFS", "30000000"]) });
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["DAV", "41000000"], ["BRE", "40000000"], ["ALI", "35000000"]) });
    switchTo("Kid");
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["KID", "45000000"], ["DAV", "41000000"], ["BRE", "40000000"]) });
    switchTo("guest");
    await play(MEDIEVAL, { after: board(["GST", "60000000"], ["SLL", "52000000"], ["ALI", "45000000"], ["KID", "45000000"], ["DAV", "41000000"]) });
    // The next day: Dave's place is pushed off the table's board.
    fake.advanceTime(DAY_MS);
    switchTo("Bob");
    await play(MEDIEVAL, { after: board(["GST", "60000000"], ["SLL", "52000000"], ["BOB", "50000000"], ["ALI", "45000000"], ["KID", "45000000"]) });

    fake.setLayoutSize({ width: 1080, height: 1920 });
    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    showView(fake, lang, "household");
    assert.equal(message(fake), null);
    assert.deepEqual(viewPlaces(fake, lang), [
        { rank: "1", name: "Bob", avatar: avatarOf("Bob"), score: "50,000,000", date: "10/13/2026" },
        { rank: "2", name: "Alice", avatar: avatarOf("Alice"), score: "45,000,000", date: "10/12/2026" },
        { rank: "3", name: "Kid", avatar: avatarOf("Kid"), score: "45,000,000", date: "10/12/2026" },
        { rank: "4", name: "Dave", avatar: avatarOf("Dave"), score: "41,000,000", date: "10/12/2026" },
    ]);
    const { podium, rows } = frames(fake);
    assert.equal(podium.middle.tier, 4, "Bob's Avatar wears his frame");
    assert.deepEqual([podium.left, podium.right, ...rows], [null, null, null], "the others wear none");
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
