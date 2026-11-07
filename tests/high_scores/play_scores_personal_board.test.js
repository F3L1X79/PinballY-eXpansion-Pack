// ============================================================
// Play Scores on the Personal Board, through main.js on the fake PinballY
// globals with vpxtool installed: a Play under the table's Default Scores
// wins no place, and its Play Score shows on "My best 5" with its date.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startHighScores, FACTORY, MEDIEVAL, VPX_TABLES, lastGame, avatarOf, avatarFiles } from "./high_scores_scenario.js";
import { openBoard, press, showView, viewName, viewPlaces } from "./high_score_board_reader.js";

test("a Play under high Default Scores puts its Play Score on the Personal Board, with its date", async () => {
    const { fake, setBoard, play } = await startHighScores({
        profiles: { Alice: {} }, active: "Alice", tables: VPX_TABLES, files: avatarFiles("Alice"),
        vpxtool: true, nvFiles: { mm_109c: lastGame([2500000, 0, 0, 0]) },
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    setBoard(MEDIEVAL, FACTORY);

    await play(MEDIEVAL, { after: FACTORY, nvAfter: { mm_109c: lastGame([3125000, 0, 0, 0]) } });

    openBoard(fake, lang);
    await settle();
    fake.advanceTime(1000);
    await settle();
    showView(fake, lang, "personal");
    assert.equal(viewName(fake), "Your 5 best scores");
    assert.deepEqual(viewPlaces(fake, lang), [{ rank: "1", name: "Alice", avatar: avatarOf("Alice"), score: "3,125,000", date: "10/12/2026" }]);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
