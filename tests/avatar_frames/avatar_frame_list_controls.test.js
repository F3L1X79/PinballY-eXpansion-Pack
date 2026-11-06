// ============================================================
// The Avatar Frame list on the Drawn Screen controls, through main.js on
// the fake globals: a held Select or Exit counts once, Exit goes back to the
// Profile Stats on the Frame button. Getting ready (slow draws), Next, Prev
// and Select choose nothing; Exit gives up, back to the Profile Stats at
// once; attract mode gives up without going back anywhere.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readVeil } from "../support/opening_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { AVATAR_FRAME_LIST_Z_INDEX } from "../../common/avatar_frames/avatar_frame_list_painter.js";
import { profileFile } from "../mastery/mastery_bar_scenario.js";
import {
    press, hold, isFrameListOpen, isProfileStatsOpen, markerLayer, untilFrameListShown, highlighted,
} from "../stats/profile_stats_reader.js";
import { startPack, startOpeningFrameList, FRAME_LIST_VEIL } from "./avatar_frame_list_opening_scenario.js";

const LIST_Z_INDEXES = Object.values(AVATAR_FRAME_LIST_Z_INDEX);
const wornTier = fake => JSON.parse(fake.readFile(profileFile("guest"))).avatarFrame;

function assertNothingLeft(fake) {
    assert.deepEqual(readVeil(fake), { shown: false }, "no veil");
    assert.deepEqual(readLoader(fake), { shown: false }, "no Loader");
    assert.equal(fake.drawingLayers().filter(layer => LIST_Z_INDEXES.includes(layer.zIndex) && layer.alpha > 0).length, 0,
        "nothing of the list shows");
}

test("the list counts a held button once; Exit while it gets ready goes back to the Profile Stats; attract mode only gives up", async () => {
    const { fake, lang } = await startPack();

    startOpeningFrameList(fake, lang, { drawMs: 60 });
    fake.advanceTime(200);
    assert.equal(readLoader(fake).shown, true, "getting ready");
    for (const button of ["Next", "Prev", "Select", "Launch"]) {
        assert.ok(press(fake, button).defaultPrevented, `${button} never reaches the wheel`);
    }
    assert.equal(readLoader(fake).shown, true, "still getting ready");
    assert.equal(wornTier(fake), 2, "nothing chosen");
    const mark = fake.logLines().length;
    assert.ok(press(fake, "Exit").defaultPrevented);
    assertNothingLeft(fake);
    assert.equal(isProfileStatsOpen(fake), true, "back to the Profile Stats in the same step");
    assert.equal(markerLayer(fake).alpha, 1);
    fake.advanceTime(2000);
    assert.deepEqual(readLoader(fake), { shown: false });
    assert.deepEqual(fake.logLines().slice(mark).filter(line => line.includes("] Opened")), [], "no opening time line");

    press(fake, "Exit");
    startOpeningFrameList(fake, lang, { drawMs: 60 });
    fake.advanceTime(50);
    assert.deepEqual(readVeil(fake), FRAME_LIST_VEIL, "getting ready again");
    const commandsBeforeAttract = fake.executedCommands().length;
    fake.fire("attractmodestart", {});
    assertNothingLeft(fake);
    fake.advanceTime(2000);
    assertNothingLeft(fake);
    assert.equal(isFrameListOpen(fake), false);
    assert.equal(isProfileStatsOpen(fake), false, "attract mode goes back nowhere");
    assert.deepEqual(fake.executedCommands().slice(commandsBeforeAttract), []);

    startOpeningFrameList(fake, lang, { drawMs: 0 });
    untilFrameListShown(fake);
    // The tier 1 frame, unlocked, just above the one worn.
    press(fake, "Prev");
    assert.ok(hold(fake, "Select").defaultPrevented);
    assert.ok(hold(fake, "Exit").defaultPrevented);
    assert.equal(isFrameListOpen(fake), true, "neither held button left the list");
    assert.equal(wornTier(fake), 2, "nor chose a frame");
    press(fake, "Exit");
    assert.equal(isProfileStatsOpen(fake), true);
    assert.equal(highlighted(fake), lang.profileStats.buttons.frame, "on the Frame button");
    assertNoErrorLogged(fake);
});
