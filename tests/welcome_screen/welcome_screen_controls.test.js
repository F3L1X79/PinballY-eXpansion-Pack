// ============================================================
// The Welcome Screen on the Drawn Screen controls, through main.js at startup
// after the Profile picker: the Select still held from the pick does nothing,
// held flippers move its selection, a held Launch or Exit does nothing, Exit
// closes it, and attract mode closes it at once, the wheel's volume back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { isWelcomeScreenOpen, highlighted, openFromMainMenu, press, WELCOME_SCREEN_OPEN_MS } from "./welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker, CAROUSEL_OPEN_MS, GLIDE_OVER_MS } from "../core/startup_picker_scenario.js";

const MEDIEVAL = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", audioVolume: 75 };
const MARS = { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars", audioVolume: 100 };
// Past the quiet wheel's hand-over after a close.
const HANDOVER_OVER_MS = 5000;

const hold = (fake, command) => fake.fire("commandbuttondown", { command, repeat: true });
const volumes = fake => fake.gameUpdates().map(update => update.changes.audioVolume);

test("the Welcome Screen at startup counts a held Select, Launch or Exit once, and attract mode closes it at once", async () => {
    const { fake, lang, settle } = await startOnProfilePicker({ tables: [MEDIEVAL, MARS] });
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS);
    press(fake, "Prev");
    fake.advanceTime(GLIDE_OVER_MS);
    press(fake, "Select");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    const close = highlighted(fake);
    assert.equal(close.tooltip, lang.buttonHints.close);

    // The Select of the pick, still held, and a held Launch or Exit: nothing.
    for (const button of ["Select", "Launch", "Exit"]) {
        assert.ok(hold(fake, button).defaultPrevented, `a held ${button} never reaches the wheel`);
        assert.equal(isWelcomeScreenOpen(fake), true, `a held ${button} leaves the screen open`);
    }
    assert.deepEqual(highlighted(fake), close, "and chooses nothing");

    // Held flippers keep moving the selection.
    hold(fake, "Next");
    assert.notDeepEqual(highlighted(fake), close, "a held flipper moves the selection");
    hold(fake, "Prev");
    assert.deepEqual(highlighted(fake), close, "and back");

    assert.ok(press(fake, "Exit").defaultPrevented);
    assert.equal(isWelcomeScreenOpen(fake), false, "Exit closes it");
    fake.advanceTime(HANDOVER_OVER_MS);
    assert.deepEqual(volumes(fake), [50, 75], "the wheel quiet while open, back after the hand-over");

    // Attract mode: closed at once, the volume back before anything moves.
    await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    assert.equal(isWelcomeScreenOpen(fake), true);
    assert.deepEqual(volumes(fake), [50, 75, 50]);
    fake.enterAttractMode();
    assert.equal(isWelcomeScreenOpen(fake), false, "attract mode closes it");
    assert.deepEqual(volumes(fake), [50, 75, 50, 75], "back at once, with no hand-over");
    fake.advanceTime(HANDOVER_OVER_MS);
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false, "nothing brings it back");
    assert.deepEqual(volumes(fake), [50, 75, 50, 75], "nothing follows");
    assert.equal(press(fake, "Next").defaultPrevented, false, "the buttons are the wheel's again");

    assertNoErrorLogged(fake);
});
