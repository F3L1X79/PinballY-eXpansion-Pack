// ============================================================
// The pause menu of a running game as a Drawn Menu through main.js, drawn
// over PinballY's native one kept open under an opaque black cover: same
// entries, Exit and Cancel resume the game, closed by the native "menuclose"
// whatever its cause, the double native opening drawn once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { DRAWN_MENU_Z_INDEX, DRAWN_MENU_LOOK } from "../../common/drawn_menu/drawn_menu_painter.js";
import {
    OPEN_OVER_MS, GLIDE_OVER_MS, isDrawnMenuShown, isAnythingDrawn, drawnMenuLines, highlightedEntry, press, openPauseMenu, chooseEntry,
} from "./drawn_menu_reader.js";

const ADD_ONS_UNDER_TEST = ["drawnMenus"];
const PAUSE_MENU_ID = "pause game";
const OPAQUE_BLACK = 0xFF000000;
const TABLE = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness (Williams 1997)",
    manufacturer: "Williams", year: 1997, categories: [], playCount: 0, playTime: 0, lastPlayed: null, rating: 0, isHidden: false,
};

const fake = createFakePinballYHost({ now: new Date(2026, 9, 21, 20, 0, 0), tables: [TABLE] });
let COMMAND;
let drawnMenus;
// The pause menu's "menuopen" as the Drawn Menus Add-on left it.
const pauseOpenings = [];
const heardCommands = [];
let closedCount = 0;

const layersAt = zIndex => fake.drawingLayers().filter(layer => layer.zIndex === zIndex);
const cover = () => layersAt(DRAWN_MENU_Z_INDEX.backdrop)[0];
const panelAlphas = () => layersAt(DRAWN_MENU_Z_INDEX.panel).map(layer => layer.alpha).filter(alpha => alpha > 0);
const outline = () => layersAt(DRAWN_MENU_Z_INDEX.selection)[0];
const anythingDrawn = () => isAnythingDrawn(fake);
const runCount = cmd => fake.executedCommands().filter(id => id === cmd).length;
// Drawn on each opening and each move of the cursor.
const selectionDrawCount = () => fake.drawings().filter(drawing => drawing.zIndex === DRAWN_MENU_Z_INDEX.selectedText).length;

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ADD_ONS_UNDER_TEST.includes(key);
    config.language = "en";
    // As another Add-on editing the pause menu's entries marks it updated.
    fake.on("menuopen", ev => {
        if (ev.id === PAUSE_MENU_ID) ev.menuUpdated = true;
    });
    await import("../../main.js");
    await settle();
    fake.on("menuopen", ev => {
        if (ev.id === PAUSE_MENU_ID) pauseOpenings.push({ prevented: ev.defaultPrevented, menuUpdated: ev.menuUpdated });
    });
    fake.on("command", ev => { heardCommands.push(ev.id); });
    COMMAND = globalThis.command;
    ({ getDrawnMenus: drawnMenus } = await import("../../common/drawn_menu/drawn_menu.js"));
    drawnMenus().onClosed(() => { closedCount++; });
    fake.gameStarted(TABLE);
});

test("a pause draws the native entries in their order, the cursor on Resume Game", () => {
    openPauseMenu(fake);

    assert.deepEqual(drawnMenuLines(fake), [
        "Resume Game", "End Game", "Information", "High Scores", "Flyer", "Instruction Card", "Exit PinballY", "Shut Down", "Cancel",
    ]);
    assert.equal(highlightedEntry(fake), "Resume Game");
    fake.closeMenu();
});

test("the native pause menu is never cancelled and stays open underneath", () => {
    pauseOpenings.length = 0;
    openPauseMenu(fake);

    assert.deepEqual(pauseOpenings, [{ prevented: false, menuUpdated: true }, { prevented: false, menuUpdated: true }]);
    assert.equal(fake.currentMenu().id, PAUSE_MENU_ID);
    fake.closeMenu();
});

test("the cover is the usual backdrop with the native menu's box in opaque black from the first frame; only the panel fades in", () => {
    fake.openPauseMenu();

    assert.equal(cover().alpha, 1);
    assert.deepEqual(cover().fills(), [DRAWN_MENU_LOOK.colors.backdrop, OPAQUE_BLACK]);
    const [whole, box] = cover().strokes().map(stroke => stroke.rect);
    assert.ok(box.width < whole.width / 2 && box.height < whole.height, "only the native menu's box is black");
    assert.deepEqual(panelAlphas(), [], "the panel starts transparent");
    fake.advanceTime(50);
    assert.ok(panelAlphas().length > 0 && panelAlphas().every(alpha => alpha < 1), "the panel fades in");
    assert.equal(cover().alpha, 1);
    fake.advanceTime(OPEN_OVER_MS);
    assert.ok(panelAlphas().every(alpha => alpha === 1));
    fake.closeMenu();
});

test("the selection glides to the next entry", () => {
    openPauseMenu(fake);
    const startY = outline().position().y;
    fake.fire("commandbuttondown", { command: "Next", repeat: false });
    fake.advanceTime(20);
    const midY = outline().position().y;
    fake.advanceTime(GLIDE_OVER_MS);
    const endY = outline().position().y;

    assert.equal(highlightedEntry(fake), "End Game");
    assert.ok(Math.abs(midY - startY) > 0 && Math.abs(midY - endY) > 0, "on its way between the two entries");
    fake.closeMenu();
});

test("a chosen entry runs its command, then the cover stays and swallows every press until the native menu closes", () => {
    openPauseMenu(fake);
    heardCommands.length = 0;
    const closedBefore = closedCount;
    chooseEntry(fake, "Information");

    assert.deepEqual(heardCommands, [COMMAND.GameInfo]);
    assert.equal(runCount(COMMAND.GameInfo), 1);
    assert.ok(!isDrawnMenuShown(fake), "the panel hides at once");
    assert.equal(cover().alpha, 1);
    assert.ok(press(fake, "Next").defaultPrevented);
    assert.equal(closedCount, closedBefore, "not closed yet");
    assert.ok(drawnMenus().isOpen());

    fake.closeMenu();
    assert.ok(!anythingDrawn());
    assert.equal(closedCount, closedBefore + 1, "the close is reported at the native menuclose");
    assert.ok(!press(fake, "Next").defaultPrevented);
});

test("Exit resumes the game once, the ExitGame event of the same press swallowed", async () => {
    openPauseMenu(fake);
    heardCommands.length = 0;
    const resumedBefore = runCount(COMMAND.ResumeGame);
    const exit = fake.fire("commandbuttondown", { command: "Exit", repeat: false });
    const exitGame = fake.fire("commandbuttondown", { command: "ExitGame", repeat: false });

    assert.ok(exit.defaultPrevented && exitGame.defaultPrevented);
    assert.ok(!isDrawnMenuShown(fake), "the panel hides at once");
    assert.equal(cover().alpha, 1);
    await settle();
    assert.equal(runCount(COMMAND.ResumeGame), resumedBefore + 1);
    assert.deepEqual(heardCommands, [COMMAND.ResumeGame], "the command listeners hear it");
    assert.equal(fake.currentMenu(), null, "ResumeGame closed the native menu");
    assert.ok(!anythingDrawn());
});

test("the Cancel entry resumes the game too", () => {
    openPauseMenu(fake);
    const resumedBefore = runCount(COMMAND.ResumeGame);
    const returnedBefore = runCount(COMMAND.MenuReturn);
    chooseEntry(fake, "Cancel");

    assert.equal(runCount(COMMAND.ResumeGame), resumedBefore + 1);
    assert.equal(runCount(COMMAND.MenuReturn), returnedBefore);
    assert.equal(fake.currentMenu(), null);
    assert.ok(!anythingDrawn());
});

test("a native menuclose from any cause closes the drawn pause menu, cover included", () => {
    openPauseMenu(fake);
    const closedBefore = closedCount;
    fake.closeMenu();

    assert.ok(!anythingDrawn());
    assert.equal(closedCount, closedBefore + 1);
    assert.ok(!press(fake, "Next").defaultPrevented);
});

test("the double native opening is drawn once and the menu closes with the last native one", () => {
    const drawnBefore = selectionDrawCount();
    openPauseMenu(fake);

    assert.equal(selectionDrawCount(), drawnBefore + 1, "drawn once");
    assert.ok(isDrawnMenuShown(fake), "the first opening's close leaves it open");
    press(fake, "Next");
    const drawnAfterMove = selectionDrawCount();
    fake.openMenu(PAUSE_MENU_ID, fake.currentMenu().items);
    assert.equal(selectionDrawCount(), drawnAfterMove, "not drawn again");
    assert.equal(highlightedEntry(fake), "End Game", "the cursor kept");
    assert.ok(panelAlphas().every(alpha => alpha === 1), "no second fade");

    fake.closeMenu();
    assert.ok(isDrawnMenuShown(fake), "another native pause menu is still open");
    fake.fire("menuclose", { id: PAUSE_MENU_ID });
    assert.ok(!anythingDrawn());
});

test("a background press while it is open writes one log line naming the menu and the button, and runs nothing", () => {
    openPauseMenu(fake);
    const linesBefore = fake.logLines().length;
    const commandsBefore = fake.executedCommands().length;
    fake.fire("commandbuttonbgdown", { command: "Select", repeat: false });

    const added = fake.logLines().slice(linesBefore);
    assert.equal(added.length, 1);
    assert.match(added[0], /^\[DrawnMenus\] "Select" pressed in the background while the "pause game" menu is open/);
    assert.equal(fake.executedCommands().length, commandsBefore);
    assert.equal(highlightedEntry(fake), "Resume Game");
    fake.closeMenu();
});

test("a whole game of background flipper presses writes one line per opening of the pause menu", () => {
    openPauseMenu(fake);
    const linesBefore = fake.logLines().length;
    const backgroundLineCount = () => fake.logLines().slice(linesBefore).filter(line => line.includes("pressed in the background")).length;
    for (let i = 0; i < 200; i++) fake.fire("commandbuttonbgdown", { command: i % 2 === 0 ? "Next" : "Prev", repeat: false });
    assert.equal(backgroundLineCount(), 1);

    fake.openMenu(PAUSE_MENU_ID, fake.currentMenu().items);
    fake.fire("commandbuttonbgdown", { command: "Next", repeat: false });
    assert.equal(backgroundLineCount(), 1, "PinballY opening it again over itself is the same opening");
    fake.closeMenu();
    fake.fire("menuclose", { id: PAUSE_MENU_ID });
    assert.ok(!anythingDrawn());

    openPauseMenu(fake);
    fake.fire("commandbuttonbgdown", { command: "Prev", repeat: false });
    fake.fire("commandbuttonbgdown", { command: "Next", repeat: false });
    assert.equal(backgroundLineCount(), 2, "a new opening logs again");
    fake.closeMenu();
});

test("a background press writes nothing with no pause menu open, nor over a menu drawn without keepNative", () => {
    const linesBefore = fake.logLines().length;
    fake.fire("commandbuttonbgdown", { command: "Next", repeat: false });
    fake.openExitMenu();
    fake.advanceTime(OPEN_OVER_MS);
    assert.ok(isDrawnMenuShown(fake));
    fake.fire("commandbuttonbgdown", { command: "Next", repeat: false });
    press(fake, "Exit");

    assert.deepEqual(fake.logLines().slice(linesBefore).filter(line => line.includes("background")), []);
});

test("after End Game the cover stays and swallows the presses until the game has exited", () => {
    openPauseMenu(fake);
    const closedBefore = closedCount;
    chooseEntry(fake, "End Game");

    assert.equal(runCount(COMMAND.KillGame), 1);
    assert.equal(fake.currentMenu().id, PAUSE_MENU_ID, "the native menu stays up while the game exits");
    assert.ok(!isDrawnMenuShown(fake));
    assert.equal(cover().alpha, 1);
    fake.advanceTime(1300);
    assert.ok(press(fake, "Next").defaultPrevented);
    assert.equal(closedCount, closedBefore);

    fake.gameOver(TABLE);
    assert.ok(!anythingDrawn());
    assert.equal(closedCount, closedBefore + 1);
});

test("no error was logged", () => {
    assertNoErrorLogged(fake);
});
