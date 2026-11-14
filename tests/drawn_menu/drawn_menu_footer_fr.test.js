// ============================================================
// The Drawn main menu's footer in French, through main.js on the fake
// PinballY globals: the Filter Picker's line reads "Changer de filtre"
// and the footer "Filtre actif : <nom>".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readDrawnMenu, press, openMainMenu } from "./drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "drawnMenus"];

const fake = createFakePinballYHost({ now: new Date(2026, 9, 15, 20, 0, 0) });

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "fr";
    await import("../../main.js");
    await settle();
});

test("the line reads Changer de filtre and the footer Filtre actif : <nom>", () => {
    openMainMenu(fake);

    const { rows, footer } = readDrawnMenu(fake);
    assert.equal(rows.find(row => row.title === "Changer de filtre").mark, "submenu");
    assert.deepEqual(footer, [{ label: "Filtre actif :", name: "Toutes les tables" }]);
    press(fake, "Exit");
});

test("no error is logged", () => {
    assertNoErrorLogged(fake);
});
