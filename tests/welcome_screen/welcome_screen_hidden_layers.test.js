// ============================================================
// The Welcome Screen keeps the hidden layer rule, through main.js on the
// fake PinballY globals: open at rest, no hidden layer of its own is more
// than a point and no visible one is a point; an unselected tooltip is a
// point and shows at its place once selected; closed, none is left, and a
// close during the fade stops it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { WELCOME_SCREEN_Z_INDEX } from "../../common/welcome_screen/welcome_screen_painter.js";
import { WELCOME_SCREEN_OPEN_MS, press, highlighted, welcomeScreenLayerCount } from "./welcome_screen_reader.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// The marker is the Selection Marker's own: left to it.
const SCREEN_Z_INDEXES = Object.entries(WELCOME_SCREEN_Z_INDEX).filter(([name]) => name !== "marker").map(([, zIndex]) => zIndex);
const WINDOW_SPAN = { xSpan: 1, ySpan: 1 };
// Within the fade in, which lasts about 220 ms.
const FADING_MS = 100;

const screenLayers = fake => fake.drawingLayers().filter(layer => SCREEN_Z_INDEXES.includes(layer.zIndex));
const tooltipLayers = fake => screenLayers(fake).filter(layer => layer.zIndex === WELCOME_SCREEN_Z_INDEX.tooltips);
const placeOf = layer => JSON.stringify({ scale: layer.scale(), position: layer.position() });

function assertRuleHeld(fake, where) {
    assert.ok(screenLayers(fake).length > 0, where);
    assert.deepEqual(layersBreakingTheRule(fake, screenLayers(fake)), [], where);
}

test("the Welcome Screen leaves no hidden layer bigger than a point, nor a visible one that is a point", async () => {
    const fake = createFakePinballYHost();
    for (const name of ["Alice", "Bob"]) fake.addFolder(`${PROFILES_FOLDER}\\${name}`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "startupChoicePrompt" || key === "profilePicker";
    config.language = "en";
    config.startupScreen = "welcome";
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);

    // Opened on the Avatar, its tooltip shown; the cross's waits.
    assert.equal(highlighted(fake).tooltip, lang.profiles.menuEntry);
    assertRuleHeld(fake, "open at rest");
    const [backdrop] = screenLayers(fake).filter(layer => layer.zIndex === WELCOME_SCREEN_Z_INDEX.backdrop);
    assert.deepEqual(backdrop.scale(), WINDOW_SPAN, "the backdrop shows over the whole window");
    const [avatarTooltip, crossTooltip] = tooltipLayers(fake);
    assert.ok(isPoint(crossTooltip), "the cross's tooltip waits as a point");
    const avatarTooltipPlace = placeOf(avatarTooltip);

    press(fake, "Next");
    assert.equal(highlighted(fake).tooltip, lang.buttonHints.close, "the cross selected, its tooltip shown");
    assertRuleHeld(fake, "on the cross");
    assert.ok(isPoint(avatarTooltip), "the Avatar's tooltip a point once another choice is selected");
    press(fake, "Prev");
    assert.equal(placeOf(avatarTooltip), avatarTooltipPlace, "the Avatar's tooltip back at its place");

    press(fake, "Exit");
    assert.equal(welcomeScreenLayerCount(fake), 0, "closed, none of its layers is left");
    const intervalsClosed = fake.runningIntervalCount();

    // Reopened from the main menu, then closed while it fades in.
    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    fake.selectMenuItem(lang.welcomeScreen.menuEntry);
    await settle();
    fake.advanceTime(FADING_MS);
    const fading = screenLayers(fake).find(layer => layer.zIndex === WELCOME_SCREEN_Z_INDEX.backdrop);
    assert.ok(fading.alpha > 0 && fading.alpha < 1, "fading in");
    press(fake, "Exit");
    assert.equal(welcomeScreenLayerCount(fake), 0);
    assert.equal(fake.runningIntervalCount(), intervalsClosed, "the fade stopped with the screen");
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assertNoErrorLogged(fake);
});
