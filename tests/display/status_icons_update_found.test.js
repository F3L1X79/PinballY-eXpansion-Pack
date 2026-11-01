// ============================================================
// Status Icons, through main.js, on the start whose Update Check finds a
// newer Pack Version: the gold arrow fades in once the reply is handled,
// once, without waiting for the next start; the Update Prompt still waits
// for the next start (docs/adr/0018).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isDrawnMenuShown } from "../drawn_menu/drawn_menu_reader.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { statusIconsLayer, shownIcons, shownIconNames, PACK_UPDATE_WAITING } from "./status_icons_reader.js";

const ZIP_URL = "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip";
const FRAME_MS = 16;

test("the gold arrow fades in once on the start whose reply finds a newer Pack Version", async () => {
    const { fake, settle } = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus", "clock", "statusIcons"],
        seed: f => f.replyToHttp({ text: JSON.stringify({
            tag_name: "v9.0.0",
            assets: [{ name: "ExpansionPack.zip", browser_download_url: ZIP_URL, digest: `sha256:${"c0".repeat(32)}` }],
        }) }),
    });
    assert.deepEqual(shownIconNames(fake), [], "nothing before GitHub answers");
    await settle();

    fake.advanceTime(3 * FRAME_MS);
    const [arrow] = shownIcons(fake);
    assert.equal(arrow.icon, PACK_UPDATE_WAITING);
    assert.ok(arrow.alpha > 0 && arrow.alpha < 0xFF, `fading in (alpha ${arrow.alpha})`);
    fake.advanceTime(300);
    assert.equal(shownIcons(fake)[0].alpha, 0xFF, "then fully shown");

    const layer = statusIconsLayer(fake);
    const iconDrawings = () => fake.drawings().filter(drawing => drawing.zIndex === layer.zIndex && drawing.texts.length === 0).length;
    const drawnAfterFade = iconDrawings();
    fake.advanceTime(10 * 1000);
    assert.equal(iconDrawings(), drawnAfterFade, "one fade, never a loop");
    assert.equal(isDrawnMenuShown(fake), false, "the Update Prompt waits for the next start");
    assertNoErrorLogged(fake);
});
