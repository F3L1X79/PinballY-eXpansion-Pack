// ============================================================
// The Backglass Clock Position's page of choices, through main.js: the six
// places by name, the saved one marked and under the cursor; Cancel and Exit
// come back on the line with nothing saved.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { drawnMenuLines, highlightedEntry, markedEntries, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ENV_LOCAL = "C:\\PinballY\\Scripts\\ExpansionPack\\.env.local";
const SAVED_TEXT = "ADD_ON_BACKGLASS_CLOCK=true\r\nBACKGLASS_CLOCK_POSITION=bottomLeft\r\n";
const LINE = "Backglass Clock Position: Bottom left";
const PLACES = ["Top left", "Top middle", "Top right", "Bottom left", "Bottom middle", "Bottom right"];
const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });

function choose(entry) {
    chooseEntry(fake, entry);
    fake.advanceTime(OPEN_OVER_MS);
}

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus" || key === "backglassClock";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("the page lists the six places, the saved one marked and under the cursor, then Cancel", () => {
    fake.addFile(ENV_LOCAL, SAVED_TEXT);
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    choose("eXpansion Pack Settings");
    choose("Launching and playing a table");
    choose(LINE);

    assert.deepEqual(drawnMenuLines(fake), [...PLACES, "---", "Cancel"]);
    assert.deepEqual(markedEntries(fake, "radio"), ["Bottom left"]);
    assert.equal(highlightedEntry(fake), "Bottom left");
});

test("Cancel and Exit come back on the line, nothing saved", () => {
    choose("Cancel");
    assert.equal(highlightedEntry(fake), LINE, "Cancel");

    choose(LINE);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), LINE, "Exit");

    assert.equal(fake.readFile(ENV_LOCAL), SAVED_TEXT);
    assert.deepEqual(fake.fileOperations().filter(operation => operation.path === ENV_LOCAL), []);
    assertNoErrorLogged(fake);
});
