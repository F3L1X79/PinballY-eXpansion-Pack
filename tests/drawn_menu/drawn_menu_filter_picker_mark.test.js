// ============================================================
// The Active Filter as a Drawn Menu, through main.js on the fake PinballY
// globals: with an Era filter on, the main menu draws no gold dot, its
// footer naming the filter, and the Filter Picker draws the dot on
// "Filter by Era" alone.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { OPEN_OVER_MS, readDrawnMenu, press, openMainMenu, chooseEntry } from "./drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "menuCleanup", "drawnMenus"];
const ERA_1980S_FILTER = "YearRange.1980.1989";

const fake = createFakePinballYHost({ now: new Date(2026, 9, 15, 20, 0, 0) });
let LABELS;

const markedRows = () => readDrawnMenu(fake).rows.filter(row => row.mark === "radio").map(row => row.title);

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    LABELS = lang.customMenuLabels;
    await import("../../main.js");
    await settle();
    fake.setNativeCommand(globalThis.command.ShowMainMenu, () => fake.openMainMenu());
    fake.setCurrentFilter(ERA_1980S_FILTER);
});

test("the main menu draws no gold dot, its footer naming the Era filter", () => {
    openMainMenu(fake);

    assert.deepEqual(markedRows(), []);
    const row = readDrawnMenu(fake).rows.find(candidate => candidate.title === LABELS.changeFilter);
    assert.equal(row.mark, "submenu");
    assert.equal(readDrawnMenu(fake).footer[0].name, "1980s Tables");
});

test("the Filter Picker draws it on Filter by Era alone", () => {
    chooseEntry(fake, LABELS.changeFilter);
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual(markedRows(), ["Filter by Era"]);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
