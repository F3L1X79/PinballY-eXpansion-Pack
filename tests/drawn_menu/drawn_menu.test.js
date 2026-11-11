// ============================================================
// The main menu as a Drawn Menu through main.js: drawn with the pack's
// sections, Next / Prev wrap with the navigation sound, Select runs the
// entry, Exit and attract mode close it, no button reaches the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import {
    isDrawnMenuShown, drawnMenuLines, readDrawnMenu, highlightedEntry, press, openMainMenu, chooseEntry, GLIDE_OVER_MS,
} from "./drawn_menu_reader.js";
import { DRAWN_MENU_Z_INDEX } from "../../common/drawn_menu/drawn_menu_painter.js";
import { sectionHolding } from "../support/main_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["uiTranslation", "customMenuCommands", "drawnMenus"];
const BUTTON_SOUNDS = "C:\\PinballY\\Assets\\Button Sounds";
const NEXT_SOUND = `${BUTTON_SOUNDS}\\Next.wav`;
const PREV_SOUND = `${BUTTON_SOUNDS}\\Prev.wav`;
const SELECT_SOUND = `${BUTTON_SOUNDS}\\Select.wav`;
const DESELECT_SOUND = `${BUTTON_SOUNDS}\\Deselect.wav`;
const TABLES = [
    { id: 1, configId: "mm", title: "Medieval Madness", manufacturer: "Williams", year: 1997, isHidden: false },
    { id: 2, configId: "tz", title: "Twilight Zone", manufacturer: "Bally", year: 1993, isHidden: false },
];

const fake = createFakePinballYHost({ now: new Date(2026, 9, 10, 20, 0, 0), tables: TABLES });
let LABELS;

test("setup", async () => {
    for (const path of [NEXT_SOUND, PREV_SOUND, SELECT_SOUND, DESELECT_SOUND]) fake.addFile(path);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    const { default: lang } = await import("../../common/core/i18n.js");
    LABELS = lang.customMenuLabels;
    await import("../../main.js");
    await settle();
});

test("the main menu is drawn instead of the native one, with the pack's sections", () => {
    openMainMenu(fake);

    assert.equal(fake.currentMenu(), null, "no native menu");
    assert.ok(isDrawnMenuShown(fake));
    const section = entry => sectionHolding(drawnMenuLines(fake), entry);
    assert.deepEqual(section("Play"), ["Play", LABELS.tableSetup]);
    assert.deepEqual(section("Information"),
        ["Information", "Flyer", "Instruction Card", "Table Scores", "Rate Table", "Add to Favorites", LABELS.changeFilter]);
    assert.deepEqual(section("Return"), ["Return"]);
    assert.equal(readDrawnMenu(fake).message, null);
    assert.equal(highlightedEntry(fake), "Play", "the cursor opens on the first entry");
});

test("Next and Prev move the cursor over the entries only, wrapping, with their own sounds", () => {
    const soundsBefore = fake.soundsPlayed().length;
    press(fake, "Prev");
    assert.equal(highlightedEntry(fake), "Return", "Prev from the first entry wraps to the last");
    press(fake, "Next");
    assert.equal(highlightedEntry(fake), "Play", "Next from the last entry wraps to the first");
    for (let count = 0; count < 2; count++) press(fake, "Next");
    assert.equal(highlightedEntry(fake), "Information", "the separator is skipped");
    assert.deepEqual(fake.soundsPlayed().slice(soundsBefore), [PREV_SOUND, NEXT_SOUND, NEXT_SOUND, NEXT_SOUND]);
});

test("the gold title lands at once on the new entry, while only the outline glides", () => {
    const goldLayer = () => fake.drawingLayers().find(layer => layer.zIndex === DRAWN_MENU_Z_INDEX.selectedText);
    const outlineLayer = () => fake.drawingLayers().find(layer => layer.zIndex === DRAWN_MENU_Z_INDEX.selection);
    const outlineBefore = outlineLayer().position();
    fake.fire("commandbuttondown", { command: "Next", repeat: false });
    const goldOnPress = goldLayer().position();
    const outlineOnPress = outlineLayer().position();
    fake.advanceTime(GLIDE_OVER_MS);

    assert.deepEqual(goldOnPress, goldLayer().position(), "the gold title does not move after the press");
    assert.deepEqual(outlineOnPress, outlineBefore, "the outline starts from the previous entry");
    assert.notDeepEqual(outlineLayer().position(), outlineBefore, "then glides to the new one");
    press(fake, "Prev");
});

test("no button reaches the wheel while the menu is open", () => {
    for (const button of ["Next", "Prev", "NextPage", "PrevPage", "Coin1", "Service1"]) {
        assert.ok(press(fake, button).defaultPrevented, button);
    }
    assert.ok(isDrawnMenuShown(fake));
});

test("Exit closes the menu without running anything, with the Deselect sound, and the buttons reach the wheel again", () => {
    const commandsBefore = fake.executedCommands().length;
    const ev = press(fake, "Exit");

    assert.ok(ev.defaultPrevented);
    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.executedCommands().length, commandsBefore);
    assert.equal(fake.soundsPlayed().at(-1), DESELECT_SOUND);
    assert.equal(fake.currentMenu(), null);
    assert.ok(!press(fake, "Next").defaultPrevented);
});

test("Select runs the chosen entry's command as the native menu would, with the Select sound", () => {
    openMainMenu(fake);
    chooseEntry(fake, "Play");

    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.executedCommands().at(-1), globalThis.command.PlayGame);
    assert.equal(fake.soundsPlayed().at(-1), SELECT_SOUND);
});

test("Launch chooses too, and a pack entry runs its action", async () => {
    openMainMenu(fake);
    chooseEntry(fake, LABELS.tableSetup, "Launch");
    await settle();

    assert.ok(!isDrawnMenuShown(fake));
    assert.deepEqual(fake.executedCommands().slice(-2),
        [globalThis.command.ShowGameSetupMenu, fake.commandId("showTableSetup")], "Table Setup opens PinballY's setup menu");
});

test("attract mode closes the menu without running anything", () => {
    openMainMenu(fake);
    const commandsBefore = fake.executedCommands().length;
    fake.enterAttractMode();

    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(fake.executedCommands().length, commandsBefore);
    fake.exitAttractMode();
});
