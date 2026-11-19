// ============================================================
// The Welcome Screen's Button Hints in French, through main.js on the
// fake PinballY globals: the footer's words are French and the cross's
// tooltip says Fermer.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Welcome Screen's footer speaks French", async () => {
    // Before anything reads the texts: the scenario's imports already do.
    config.language = "fr";
    const { startWelcomeScreen } = await import("./button_hints_scenario.js");
    const { buttonHints, choose, highlighted } = await import("./welcome_screen_reader.js");
    const { fake } = await startWelcomeScreen();

    assert.deepEqual(buttonHints(fake), [
        { keys: ["GAUCHE", "DROITE"], label: "PARCOURIR" },
        { keys: ["SELECT"], label: "CHOISIR" },
        { keys: ["EXIT"], label: "FERMER" },
    ]);
    fake.fire("commandbuttondown", { command: "Next", repeat: false });
    assert.deepEqual(highlighted(fake), { label: null, tooltip: "Fermer" });
    assertNoErrorLogged(fake);
});
