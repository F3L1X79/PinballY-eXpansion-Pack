// ============================================================
// Status Icons, through main.js, when the Update Check's reply forgets the
// remembered Pack Version (nothing newer any more): the gold arrow shown
// from the start fades out once and is gone.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { shownIcons, shownIconNames, PACK_UPDATE_WAITING } from "./status_icons_reader.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};
const FRAME_MS = 16;

test("the gold arrow fades out once when a reply forgets the remembered Pack Version", async () => {
    const { fake, settle } = await startOnProfilePicker({
        addOns: ["clock", "statusIcons"],
        seed: f => {
            f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE }));
            f.replyToHttp({ text: JSON.stringify({ tag_name: `v${PACK_VERSION}`, assets: [] }) });
        },
    });
    assert.deepEqual(shownIconNames(fake), [PACK_UPDATE_WAITING], "shown from the start");
    await settle();

    fake.advanceTime(3 * FRAME_MS);
    const [arrow] = shownIcons(fake);
    assert.ok(arrow && arrow.alpha > 0 && arrow.alpha < 0xFF, "fading out");
    fake.advanceTime(300);
    assert.deepEqual(shownIconNames(fake), [], "gone");
    assertNoErrorLogged(fake);
});
