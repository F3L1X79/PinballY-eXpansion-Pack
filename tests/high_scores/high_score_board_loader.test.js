// ============================================================
// High Score Board Loader: turns above the board while it is read fresh,
// after the fade in, and goes with the read's outcome, Exit or attract mode;
// a read ending after close never brings it back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readLoader, loaderLayerCount } from "../support/loader_reader.js";
import {
    startHighScores, TABLES, FACTORY, EMPTY_BOARD, NOT_SUPPORTED, MEDIEVAL, ZELDA_TABLE, ZELDA_FACTORY, OTHER_SECTIONS,
} from "./high_scores_scenario.js";
import { openBoard, press, isBoardOpen, message, BOARD_OPEN_MS } from "./high_score_board_reader.js";

// Above the board's glass (6188), under the Drawn Menus (6200 up).
const SHOWN = { shown: true, zIndex: 6189, scale: { ySpan: 0.07 }, position: { x: 0, y: 1 / 6 } };
const GONE = { shown: false };

test("the comet turns while the board is read fresh and goes with every outcome or close", async () => {
    const { fake, setBoard, setVpreg } = await startHighScores({ tables: [...TABLES, ZELDA_TABLE] });
    const { default: lang } = await import("../../common/core/i18n.js");
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    assert.equal(loaderLayerCount(fake), 0, "no Loader before the board opens");

    // Opens the board on a read lasting ms, checks the comet turns while
    // it is pending, ends it and returns what the board then says.
    const readFor = async (ms) => {
        openBoard(fake, lang);
        assert.deepEqual(readLoader(fake), SHOWN, "turning above the board while the read is pending");
        fake.advanceTime(ms);
        await settle();
        const outcome = { loader: readLoader(fake), layers: loaderLayerCount(fake), message: message(fake) };
        press(fake, "Exit");
        fake.advanceTime(BOARD_OPEN_MS);
        fake.closeMenu();
        return outcome;
    };
    const redrawnWith = text => ({ loader: GONE, layers: 0, message: text });

    setBoard(MEDIEVAL, FACTORY, { fails: true });
    assert.deepEqual(await readFor(1000), redrawnWith("No high scores found for this table"), "a failed first read");
    setBoard(MEDIEVAL, FACTORY, { durationMs: 3000 });
    assert.deepEqual(await readFor(3000), redrawnWith(null), "a fresh board");
    setBoard(MEDIEVAL, FACTORY, { fails: true });
    assert.deepEqual(await readFor(1000), redrawnWith(null), "a known board that could not be refreshed");
    setBoard(MEDIEVAL, NOT_SUPPORTED);
    assert.deepEqual(await readFor(1000), redrawnWith("This table's high scores are not supported"), "not supported");
    setBoard(MEDIEVAL, EMPTY_BOARD);
    assert.deepEqual(await readFor(1000), redrawnWith("No score yet"), "no score");

    setVpreg({ ...OTHER_SECTIONS, ZELDA: ZELDA_FACTORY });
    fake.setWheelGame(TABLES.length);
    assert.deepEqual(await readFor(1000), redrawnWith("Play a game of at least one minute to show this table's high scores"), "not learned");
    fake.setWheelGame(-TABLES.length);

    // The board's fade in lasts under BOARD_OPEN_MS: the comet waits for its end.
    const DURING_FADE_MS = 100;
    const startOpening = () => {
        fake.openMainMenu();
        fake.selectMenuItem(lang.highScores.board.menuEntry);
        fake.advanceTime(DURING_FADE_MS);
    };
    setBoard(MEDIEVAL, FACTORY, { durationMs: 5000 });
    startOpening();
    assert.ok(isBoardOpen(fake));
    assert.deepEqual(readLoader(fake), GONE, "not over the board while it fades in");
    fake.advanceTime(BOARD_OPEN_MS - DURING_FADE_MS);
    assert.deepEqual(readLoader(fake), SHOWN, "turning once the board is fully in");
    fake.advanceTime(5000);
    await settle();
    press(fake, "Exit");
    fake.advanceTime(BOARD_OPEN_MS);
    fake.closeMenu();

    setBoard(MEDIEVAL, FACTORY, { durationMs: 5000 });
    startOpening();
    press(fake, "Exit");
    fake.advanceTime(BOARD_OPEN_MS);
    assert.equal(loaderLayerCount(fake), 0, "never shown when Exit comes during the fade in");
    fake.advanceTime(5000);
    await settle();
    fake.closeMenu();

    setBoard(MEDIEVAL, FACTORY, { durationMs: 10 });
    startOpening();
    await settle();
    fake.advanceTime(BOARD_OPEN_MS);
    assert.equal(loaderLayerCount(fake), 0, "never shown when the read ends during the fade in");
    press(fake, "Exit");
    fake.advanceTime(BOARD_OPEN_MS);
    fake.closeMenu();

    setBoard(MEDIEVAL, FACTORY, { durationMs: 5000 });
    openBoard(fake, lang);
    assert.deepEqual(readLoader(fake), SHOWN);
    press(fake, "Exit");
    assert.equal(loaderLayerCount(fake), 0, "gone with the board on Exit");
    fake.advanceTime(5000);
    await settle();
    assert.equal(loaderLayerCount(fake), 0, "a read ending after Exit does not bring it back");
    fake.advanceTime(BOARD_OPEN_MS);
    fake.closeMenu();

    setBoard(MEDIEVAL, FACTORY, { durationMs: 5000 });
    openBoard(fake, lang);
    assert.deepEqual(readLoader(fake), SHOWN);
    fake.enterAttractMode();
    assert.ok(!isBoardOpen(fake));
    assert.equal(loaderLayerCount(fake), 0, "gone with the board in attract mode");
    fake.advanceTime(5000);
    await settle();
    assert.equal(loaderLayerCount(fake), 0, "a read ending after attract mode does not bring it back");
    assertNoErrorLogged(fake);
});
