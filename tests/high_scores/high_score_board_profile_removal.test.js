// ============================================================
// The High Score Board after a Profile Removal from Manage profiles, through
// main.js on the fake PinballY globals with native menus: the removed Profile's
// places show as Default Scores, as for a folder removed by hand, and it leaves
// the Household Board; a Profile
// created later under its name gets them back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHighScores, board, FACTORY, MEDIEVAL, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, podium, BOARD_OPEN_MS } from "./high_score_board_reader.js";
import { getProfileStore } from "../../common/profiles/profile_store.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("a removed Profile's places read as Default Scores until a Profile is created under its name", async () => {
    const { fake, setBoard, play, switchTo, householdBoard } = await startHighScores({
        addOns: ["highScores", "customMenuCommands"],
        profiles: { Alice: { isAdmin: true }, Bob: {} },
        active: "Bob",
        files: avatarFiles("Alice", "Bob"),
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.profileReset;
    setBoard(MEDIEVAL, FACTORY);
    await play(MEDIEVAL, { after: board(["BOB", "60000000"], ["SLL", "52000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]) });
    const recordHolder = () => {
        openBoard(fake, lang);
        const { middle } = podium(fake, lang);
        press(fake, "Exit");
        fake.advanceTime(BOARD_OPEN_MS);
        return middle.name;
    };
    assert.equal(recordHolder(), "Bob");
    assert.deepEqual(await householdBoard(MEDIEVAL), [["Bob", 60000000]]);

    switchTo("Alice");
    fake.openOperatorMenu();
    for (const title of [TEXT.menuEntry, "Bob", TEXT.remove, TEXT.removeYes, TEXT.ok]) fake.selectMenuItem(title);
    assert.equal(recordHolder(), "Default score", "Bob's place shows as a Default Score");
    assert.deepEqual(await householdBoard(MEDIEVAL), [], "Bob is gone from the Household Board");

    getProfileStore().createProfile("Bob", lang.profiles.guestName);
    assert.equal(recordHolder(), "Bob", "a new Bob gets his High Scores back");

    assertNoErrorLogged(fake);
});
