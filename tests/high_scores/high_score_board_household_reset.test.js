// ============================================================
// The High Score Board's Household Board, through main.js on the fake
// PinballY globals: only the High Scores won since a Profile's last
// Profile Reset count for it; a removed Profile's places are gone, and
// come back with a Profile re-created under its name.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, board, FACTORY, MEDIEVAL, PROFILES_FOLDER, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, viewPlaces, BOARD_OPEN_MS } from "./high_score_board_reader.js";

test("the Household Board counts a Profile's High Scores since its last Profile Reset, and forgets a removed Profile until it comes back", async () => {
    const { fake, setBoard, play, switchTo, resetProfile } = await startHighScores({
        profiles: { Alice: {}, Bob: {} }, active: "Alice", files: avatarFiles("Alice", "Bob"),
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const household = async () => {
        openBoard(fake, lang);
        await settle();
        fake.advanceTime(1000);
        await settle();
        press(fake, "Select");
        const shown = viewPlaces(fake, lang).map(place => [place.rank, place.name, place.score]);
        press(fake, "Exit");
        fake.advanceTime(BOARD_OPEN_MS);
        return shown;
    };
    setBoard(MEDIEVAL, FACTORY);
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BRE", "40000000"], ["LFS", "30000000"], ["ZAP", "20000000"]) });
    switchTo("Bob");
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BOB", "42000000"], ["BRE", "40000000"], ["LFS", "30000000"]) });
    assert.deepEqual(await household(), [["1", "Alice", "45,000,000"], ["2", "Bob", "42,000,000"]]);

    resetProfile("Alice");
    assert.deepEqual(await household(), [["1", "Bob", "42,000,000"]], "Alice's High Score won before her reset no longer counts");
    switchTo("Alice");
    await play(MEDIEVAL, { after: board(["SLL", "52000000"], ["ALI", "45000000"], ["BOB", "42000000"], ["BRE", "40000000"], ["ALI", "35000000"]) });
    assert.deepEqual(await household(), [["1", "Bob", "42,000,000"], ["2", "Alice", "35,000,000"]], "one won since counts");

    fake.removeFolder(`${PROFILES_FOLDER}\\Bob`);
    assert.deepEqual(await household(), [["1", "Alice", "35,000,000"]], "a removed Profile's places are gone");
    fake.addFile(`${PROFILES_FOLDER}\\Bob\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [] }));
    assert.deepEqual(await household(), [["1", "Bob", "42,000,000"], ["2", "Alice", "35,000,000"]], "a Profile re-created under its name gets them back");
    assertNoErrorLogged(fake);
});
