// ============================================================
// The eXpansion Pack Settings through main.js with every Add-on off, Drawn
// Menus included: a wheel dialog submitted while the drawn list is open
// waits for it to close, the restart question, and the Operator Menu it goes back to.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { isDrawnMenuShown, press, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("a wheel dialog waits for the drawn list, even with Drawn Menus off", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 22, 20, 0, 0) });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = false;
    config.language = "en";
    const { getWheelDialogs, DIALOG_PRIORITY } = await import("../../common/core/wheel_dialog.js");
    await import("../../main.js");
    await settle();

    fake.openOperatorMenu();
    // The native Operator Menu closes back to the wheel mode.
    fake.selectMenuItem("eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    assert.ok(isDrawnMenuShown(fake));

    getWheelDialogs().submit({ id: "someDialog", title: "Rate this table", message: "Rate this table?", buttons: [{ label: "OK" }], priority: DIALOG_PRIORITY.RATING_PROMPT });
    await settle();
    assert.equal(fake.currentMenu(), null, "the dialog waits for the list");
    assert.ok(isDrawnMenuShown(fake));

    press(fake, "Exit");
    await settle();
    assert.equal(fake.currentMenu(), null, "then for the restart question");
    press(fake, "Exit");
    await settle();
    assert.equal(fake.currentMenu().id, "operator", "then for the Operator Menu");
    fake.closeMenu();
    await settle();
    assert.equal(fake.currentMenu().id, "someDialog", "and shows once the wheel is free");

    assertNoErrorLogged(fake);
});
