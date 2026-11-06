// ============================================================
// Avatar Choice whose redraw for a new window size fails: the screen is
// given up, logged, with no layer left behind, and the Profile picker
// comes back on the new Profile with the buttons.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { whileDrawsFail, FAILING_DRAW_MESSAGE } from "../support/failing_draws.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, step, press, highlighted, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

// Past the window watch's period (about 100 ms).
const WATCH_OVER_MS = 120;

const avatarChoiceLayers = fake => fake.drawingLayers().filter(layer => Object.values(AVATAR_CHOICE_Z_INDEX).includes(layer.zIndex));

test("a redraw for the window's new size that fails gives Avatar Choice up", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice", fakeOptions: { layoutSize: { width: 1920, height: 1080 } } });
    const names = [lang.profiles.guestName, "Alice", "Max", lang.profiles.newProfile];
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    assert.equal(isAvatarChoiceOpen(fake), true);

    whileDrawsFail(() => {
        fake.setLayoutSize({ width: 1080, height: 1920 });
        fake.advanceTime(WATCH_OVER_MS);
    });
    assert.equal(isAvatarChoiceOpen(fake), false, "the screen is given up");
    assert.deepEqual(avatarChoiceLayers(fake), [], "no layer left behind");
    assert.ok(errorLines(fake).some(line => line.startsWith("[AvatarChoice]")), `Avatar Choice logs its failure: ${errorLines(fake).join("\n")}`);
    assert.ok(errorLines(fake).every(line => line.includes(FAILING_DRAW_MESSAGE)), "no other error");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), false, "nothing copied");

    // The carousel was redrawn for the new size with the same failing draws: drawn again once they work.
    step(fake, "Prev");
    step(fake, "Next");
    assert.equal(highlighted(fake, names), "Max", "the picker came back on the new Profile");
    assert.equal(press(fake, "Exit").defaultPrevented, true, "the Profile picker has the buttons again");
    assert.ok(store.listProfileNames().includes("Max"));
});
