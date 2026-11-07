// ============================================================
// Play Scores on the Household Board, through main.js on the fake PinballY
// globals with vpxtool installed: Profiles with only Play Scores on a table
// show on "The household", best first, the older first on equal scores.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, showView, viewName, viewPlaces } from "./high_score_board_reader.js";

test("Profiles with only Play Scores rank on the Household Board, best first, older first on equal scores", async () => {
    const { fake, setBoard, play, switchTo } = await startHighScores({
        profiles: { Alice: {}, Bob: {}, Carol: { isChild: true } }, active: "Alice", tables: VPX_TABLES,
        files: avatarFiles("Alice", "Bob", "Carol"),
        vpxtool: true, nvFiles: { mm_109c: lastGame([0, 0, 0, 0]) },
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([2000000, 0, 0, 0]) } });
    switchTo("Bob");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3000000, 0, 0, 0]) } });
    switchTo("Carol");
    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([2000000, 0, 0, 0]) } });

    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    showView(fake, lang, "household");
    assert.equal(viewName(fake), "Household scores");
    assert.deepEqual(viewPlaces(fake, lang).map(place => [place.rank, place.name, place.score]),
        [["1", "Bob", "3,000,000"], ["2", "Alice", "2,000,000"], ["3", "Carol", "2,000,000"]]);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
