// ============================================================
// The High Score Board's read going wrong, through main.js on the fake
// PinballY globals: a never-read table whose read fails or is killed says
// no high scores were found for it; a known board stays on screen with a
// note that it could not be refreshed when PINemHi fails or never answers,
// and gives way to "not supported" when PINemHi says so. Logged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startHighScores, FACTORY, MEDIEVAL, NOT_SUPPORTED } from "./high_scores_scenario.js";
import { openBoard, press, message, note, podium, BOARD_OPEN_MS } from "./high_score_board_reader.js";

const NOT_SUPPORTED_TEXT = "This table's high scores are not supported";
const NOT_FOUND_TEXT = "No high scores found for this table";

test("failed, killed, unanswered and unsupported reads each show their message", async () => {
    const { fake, setBoard, saved, log, pendingTimerCount } = await startHighScores();
    const { default: lang } = await import("../../common/core/i18n.js");
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    // Ends the read, then reads the screen and closes it.
    const afterRead = async (ms) => {
        fake.advanceTime(ms);
        await settle();
        const shown = { message: message(fake), note: note(fake), record: podium(fake, lang).middle && podium(fake, lang).middle.initials };
        press(fake, "Exit");
        fake.advanceTime(BOARD_OPEN_MS);
        fake.closeMenu();
        return shown;
    };

    setBoard(MEDIEVAL, FACTORY, { fails: true });
    openBoard(fake, lang);
    assert.deepEqual(await afterRead(1000), { message: NOT_FOUND_TEXT, note: null, record: null });
    setBoard(MEDIEVAL, FACTORY, { durationMs: 9000 });
    openBoard(fake, lang);
    assert.deepEqual(await afterRead(9000), { message: NOT_FOUND_TEXT, note: null, record: null });
    assert.equal(saved(), undefined);

    setBoard(MEDIEVAL, FACTORY);
    openBoard(fake, lang);
    assert.deepEqual(await afterRead(1000), { message: null, note: null, record: "SLL" });
    setBoard(MEDIEVAL, FACTORY, { fails: true });
    openBoard(fake, lang);
    assert.deepEqual(await afterRead(1000), { message: null, note: "These scores could not be refreshed", record: "SLL" });
    setBoard(MEDIEVAL, FACTORY, { hangs: true });
    const timersBefore = pendingTimerCount();
    openBoard(fake, lang);
    assert.deepEqual(await afterRead(10000), { message: null, note: "These scores could not be refreshed", record: "SLL" });
    assert.equal(pendingTimerCount(), timersBefore);
    setBoard(MEDIEVAL, NOT_SUPPORTED);
    openBoard(fake, lang);
    assert.deepEqual(await afterRead(1000), { message: NOT_SUPPORTED_TEXT, note: null, record: null });

    const noBoard = `[HighScores] "${MEDIEVAL}": no board for the High Score Board; the last known board kept.`;
    const noneKnown = `[HighScores] "${MEDIEVAL}": no board for the High Score Board; none known yet.`;
    const failed = `[HighScores] "${MEDIEVAL}": the high scores read failed (PINemHi could not read the high scores.).`;
    assert.deepEqual(log().filter(line => !line.includes("opened") && !line.includes("Default Score image")), [
        failed, noneKnown,
        failed, noneKnown,
        `[HighScores] "${MEDIEVAL}": first board read, 5 places, all Default Scores.`,
        failed, noBoard,
        `[HighScores] "${MEDIEVAL}": the high scores read timed out.`, noBoard,
        `[HighScores] "${MEDIEVAL}": PINemHi does not support its ROM.`, noBoard,
    ]);
});
