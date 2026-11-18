// ============================================================
// Play Settlement on its own (play_settlement_setup.js): the table's board
// read at launch and after the game, the read deadline, the place a Play
// announces, and a ROM-less table learning where it keeps its board from
// the User folder. Its Play Score: play_settlement_play_score.test.js.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { writeCompoundFile } from "../support/compound_file_writer.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startSettlement, finishReads, play, placeOf } from "./play_settlement_setup.js";
import {
    FACTORY, SECOND_PLACE, MEDIEVAL, ZELDA, ZELDA_TABLE, ZELDA_FACTORY, OTHER_SECTIONS, VPREG_PATH,
    PAPASMURF, PAPASMURF_TABLE, textBoard, userFileOf, vpregBoard,
} from "./high_scores_scenario.js";

const ranks = places => places.map(({ rank, initials, score }) => [rank, initials, score]);

test("a ROM table: the board read at launch, then after the game, gives the place won", async () => {
    const { fake, highScores, announced } = startSettlement();
    fake.setNvramBoard(MEDIEVAL, FACTORY);
    await play(fake, MEDIEVAL, { after: () => fake.setNvramBoard(MEDIEVAL, SECOND_PLACE) });
    assert.equal(announced.length, 1);
    assert.equal(announced[0].configId, MEDIEVAL);
    assert.deepEqual(placeOf(announced[0]), [2, "ALI"]);
    assert.deepEqual(ranks(highScores.boardOf(MEDIEVAL))[1], [2, "ALI", 45000000], "the store holds the board after the game");
    assertNoErrorLogged(fake);
});

test("a read after the game that never answers gives up at its deadline: nothing credited", async () => {
    const { fake, highScores, announced, log } = startSettlement();
    fake.setNvramBoard(MEDIEVAL, FACTORY);
    const game = fake.getGameInfo(MEDIEVAL);
    fake.playGame(game);
    await settle();
    fake.gameStarted(game);
    await finishReads(fake);
    fake.advanceTime(5 * 60 * 1000);
    fake.setNvramBoard(MEDIEVAL, SECOND_PLACE, { hangs: true });
    fake.gameOver(game);
    // The wait after the game (2 s), then 10 s for the read.
    await finishReads(fake, 11);
    assert.ok(!log().includes(`[HighScores] "${MEDIEVAL}": the high scores read timed out.`), "still waiting a second before the deadline");
    await finishReads(fake, 2);
    assert.deepEqual(announced, []);
    assert.ok(log().includes(`[HighScores] "${MEDIEVAL}": the high scores read timed out.`));
    assert.equal(highScores.boardOf(MEDIEVAL)[1].initials, "BRE", "the board read at launch kept");
    assertNoErrorLogged(fake);
});

test("a ROM-less table learns the VPReg.stg section the Play changed, its earlier board recorded first", async () => {
    const { fake, highScores, announced } = startSettlement({
        tables: [ZELDA_TABLE], files: { [VPREG_PATH]: writeCompoundFile({ ...OTHER_SECTIONS, ZELDA: ZELDA_FACTORY }) },
    });
    await play(fake, ZELDA, {
        after: () => fake.addFile(VPREG_PATH, writeCompoundFile({
            ...OTHER_SECTIONS, ZELDA: vpregBoard(["AAA", 2800000], ["FEF", 2750000], ["BBB", 2700000], ["CCC", 2600000]),
        })),
    });
    assert.deepEqual(highScores.sourceOf(ZELDA), { kind: "vpreg", section: "ZELDA" });
    assert.deepEqual(announced.map(placeOf), [[2, "FEF"]], "the board before the Play was known");
    assert.deepEqual(fake.highScoreSets().filter(set => set.lines !== null).pop(), {
        configId: ZELDA, lines: ["1) AAA 2800000", "2) FEF 2750000", "3) BBB 2700000", "4) CCC 2600000"],
    }, "PinballY is handed the board just credited");
    assertNoErrorLogged(fake);
});

test("a ROM-less table whose Play changed no board learns nothing and credits nothing", async () => {
    const vpreg = writeCompoundFile({ ...OTHER_SECTIONS, ZELDA: ZELDA_FACTORY });
    const { fake, highScores, announced, log } = startSettlement({ tables: [ZELDA_TABLE], files: { [VPREG_PATH]: vpreg } });
    await play(fake, ZELDA);
    assert.equal(highScores.sourceOf(ZELDA), null);
    assert.deepEqual(announced, []);
    assert.ok(log().includes(`[HighScores] "${ZELDA}": no board after the game, and no VPReg.stg or text file board changed; nothing learned, nothing credited.`));
    assertNoErrorLogged(fake);
});

test("a ROM-less table learns its text file; the High Score Board then reads it, and PinballY gets it at startup", async () => {
    const before = textBoard(["1"], ["AAA", 500], ["BBB", 400], ["CCC", 300], ["DDD", 200], ["EEE", 100]);
    const after = textBoard(["1"], ["AAA", 500], ["FEF", 450], ["BBB", 400], ["CCC", 300], ["DDD", 200]);
    const { fake, highScores, settlement, announced, createAgain } = startSettlement({
        tables: [PAPASMURF_TABLE], files: { [VPREG_PATH]: writeCompoundFile(OTHER_SECTIONS), [userFileOf("papasmurf.txt")]: before },
    });
    await play(fake, PAPASMURF, { after: () => fake.addFile(userFileOf("papasmurf.txt"), after) });
    assert.deepEqual(highScores.sourceOf(PAPASMURF), { kind: "text", file: "papasmurf.txt" });
    assert.deepEqual(announced.map(placeOf), [[2, "FEF"]]);

    fake.addFile(userFileOf("papasmurf.txt"), textBoard(["1"], ["GGG", 900], ["AAA", 500], ["FEF", 450], ["BBB", 400], ["CCC", 300]));
    const status = settlement.refreshBoard(PAPASMURF);
    await finishReads(fake);
    assert.equal(await status, "read");
    assert.equal(highScores.boardOf(PAPASMURF)[0].initials, "GGG", "read from the learned file, outside a Play");

    const handedBefore = fake.highScoreSets().length;
    createAgain();
    assert.deepEqual(fake.highScoreSets().slice(handedBefore).map(set => set.lines[0]), ["1) GGG 900"], "handed at once, as at startup");
    assertNoErrorLogged(fake);
});
