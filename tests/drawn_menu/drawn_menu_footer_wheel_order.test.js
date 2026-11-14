// ============================================================
// The Drawn main menu's footer with the Wheel Order on, through main.js:
// under the Active Filter, a second line names the Wheel Order the same
// way; it is no entry, and it follows a change of order.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { OPEN_OVER_MS, readDrawnMenu, highlightedEntry, press, openMainMenu, chooseEntry } from "./drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["customMenuCommands", "drawnMenus", "wheelOrder"];

const table = (title, year) => ({ id: title, configId: title, title, year });
const fake = createFakePinballYHost({
    now: new Date(2026, 10, 14, 20, 0, 0),
    tables: [table("Attack from Mars", 1995), table("Black Knight", 1980)],
});
let LABELS;

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
});

test("the footer names the Wheel Order under the Active Filter", () => {
    openMainMenu(fake);

    assert.deepEqual(readDrawnMenu(fake).footer, [
        { label: LABELS.activeFilterLabel, name: "All Tables" },
        { label: LABELS.wheelOrderLabel, name: LABELS.wheelOrderPageAlphabetical },
    ]);
});

test("the Wheel Order line is no entry: the cursor never lands on it", () => {
    const entries = readDrawnMenu(fake).rows.filter(row => row.kind === "entry").map(row => row.title);

    assert.ok(!entries.some(title => title.includes(LABELS.wheelOrderPageAlphabetical)));
    press(fake, "Prev");
    assert.equal(highlightedEntry(fake), entries.at(-1));
});

test("it follows a change of order on the next opening", async () => {
    press(fake, "Exit");
    openMainMenu(fake);
    chooseEntry(fake, LABELS.changeFilter);
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, LABELS.wheelOrderAlphabetical);
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, LABELS.wheelOrderPageByYear);
    await settle();

    openMainMenu(fake);
    assert.deepEqual(readDrawnMenu(fake).footer.at(-1), { label: LABELS.wheelOrderLabel, name: LABELS.wheelOrderPageByYear });
    press(fake, "Exit");
    assertNoErrorLogged(fake);
});
