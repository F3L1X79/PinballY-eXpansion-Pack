// ============================================================
// The Profile Picker keeps the hidden layer rule, through main.js on the
// fake PinballY globals: drawn ahead, open at rest, after a glide, closed
// and after the greeting, no hidden layer of its own is more than a point
// and no visible one is a point; the overlays show over the whole window.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
// Guest and six Profiles: more than the five places shown, so one comes into view on a glide.
const NAMES = ["Alice", "Bob", "Chloé", "Dan", "Eve", "Finn"];
// The overlay, Avatars, gold frames and names, then the level pips.
const PICKER_Z_RANGE = [6500, 6503];
const DRAWING_AHEAD_OVER_MS = 10 * 60 * 1000;
const GLIDE_OVER_MS = 500;
const PAUSE_OVER_MS = 600;
const GREETING_OVER_MS = 2500;
const WINDOW = { width: 1920, height: 1080 };
const WINDOW_SPAN = { xSpan: 1, ySpan: 1 };
const AVATAR_Z_INDEX = 6501;

async function start() {
    const fake = createFakePinballYHost({ layoutSize: WINDOW });
    for (const name of NAMES) fake.addFolder(`${PROFILES_FOLDER}\\${name}`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    // An Admin Profile, so Bob sees no "+" slot.
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], isAdmin: true }));
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "profilePicker";
    config.language = "en";
    // Greeted at startup, then the carousel only opens from the menu.
    config.startupScreen = "wheel";
    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(GREETING_OVER_MS);
    return { fake, lang };
}

const pickerLayers = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= PICKER_Z_RANGE[0] && layer.zIndex <= PICKER_Z_RANGE[1]);
const layerShowing = (fake, text) => pickerLayers(fake).find(layer => layer.texts().includes(text));
const visibleAvatars = fake => pickerLayers(fake).filter(layer => layer.zIndex === AVATAR_Z_INDEX && layer.alpha > 0);
const placesOf = layers => layers
    .map(layer => JSON.stringify({ scale: layer.scale(), position: layer.position(), alpha: layer.alpha }))
    .sort();

function assertRuleHeld(fake, where) {
    assert.ok(pickerLayers(fake).length > 0, where);
    assert.deepEqual(layersBreakingTheRule(fake, pickerLayers(fake)), [], where);
}

function assertAllPoints(fake, where) {
    const layers = pickerLayers(fake);
    assert.ok(layers.length > 0, where);
    assert.deepEqual(layers.filter(layer => !isPoint(layer)).map(layer => layer.zIndex), [], where);
}

const press = (fake, command) => fake.fire("commandbuttondown", { command, repeat: false });

async function openPicker(fake, lang) {
    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    fake.selectMenuItem(lang.profiles.menuEntry);
    await settle();
}

test("the Profile Picker leaves no hidden layer bigger than a point, nor a visible one that is a point", async () => {
    const { fake, lang } = await start();
    fake.advanceTime(DRAWING_AHEAD_OVER_MS);
    assertAllPoints(fake, "drawn ahead, before the first opening");
    const overlay = layerShowing(fake, lang.profiles.pickerTitle);
    assert.deepEqual(overlay.canvasSize(), WINDOW, "the overlay, a point, still measures the window");

    await openPicker(fake, lang);
    assertRuleHeld(fake, "open at rest");
    assert.deepEqual(overlay.scale(), WINDOW_SPAN, "the overlay shows over the whole window");
    const nameLayer = layerShowing(fake, "Bob");
    assert.equal(nameLayer.canvasSize().width, WINDOW.width, "a name spans the window measured by the overlay");
    assert.ok(Math.abs(nameLayer.position().x) < 1e-9, "centred");

    // Five places shown out of seven: Next brings an Avatar into view.
    const placesAtRest = placesOf(visibleAvatars(fake));
    const shownBefore = new Set(visibleAvatars(fake));
    press(fake, "Next");
    fake.advanceTime(GLIDE_OVER_MS);
    const cameIn = visibleAvatars(fake).filter(layer => !shownBefore.has(layer));
    assert.equal(cameIn.length, 1, "one Avatar came into view");
    assert.deepEqual(placesOf(visibleAvatars(fake)), placesAtRest, "every Avatar at its usual size and place");
    assertRuleHeld(fake, "after a glide");

    press(fake, "Exit");
    assertAllPoints(fake, "closed");

    // Bob, active, picked again: with the Welcome Screen off, the greeting follows.
    await openPicker(fake, lang);
    press(fake, "Select");
    fake.advanceTime(PAUSE_OVER_MS);
    const greeting = layerShowing(fake, lang.profiles.greeting("Bob"));
    assert.ok(greeting && greeting.alpha > 0, "the greeting started");
    assert.deepEqual(greeting.scale(), WINDOW_SPAN, "the greeting's overlay shows over the whole window");
    fake.advanceTime(GREETING_OVER_MS);
    assert.ok(isPoint(greeting), "the greeting's layer is a point once it ends");
    assertAllPoints(fake, "after the greeting");
    assertNoErrorLogged(fake);
});
