// ============================================================
// The eXpansion Pack Settings through main.js with every Add-on off, Drawn
// Menus included: the Operator Menu stays native, but the list is drawn,
// and its Exit, past the drawn restart question, opens the native Operator Menu again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, highlightedEntry, press, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with Drawn Menus off, the list is still drawn and goes back to the native Operator Menu", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = false;
    config.language = "en";
    await import("../../main.js");
    await settle();

    fake.openOperatorMenu();
    assert.equal(fake.currentMenu().id, "operator", "the Operator Menu is native");
    assert.ok(!isDrawnMenuShown(fake));
    fake.selectMenuItem("eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(fake.currentMenu(), null, "no native menu left");
    assert.ok(isDrawnMenuShown(fake), "the list is drawn");
    assert.equal(highlightedEntry(fake), "Players and progress");
    press(fake, "Select");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Profile picker: On (on restart)", "as saved (the defaults), running off");
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);

    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(highlightedEntry(fake), "Restart now", "the restart question is drawn too");
    press(fake, "Exit");
    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.currentMenu().id, "operator", "back to the native Operator Menu");
    assert.ok(fake.currentMenu().items.some(item => item.title === "eXpansion Pack Settings"));

    fake.selectMenuItem("eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    fake.enterAttractMode();
    assert.ok(!isDrawnMenuShown(fake), "attract mode closes the list");
    assertNoErrorLogged(fake);
});
